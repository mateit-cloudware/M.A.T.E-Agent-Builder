/**
 * M.A.T.E. Base Scanner
 * 
 * Abstrakte Basisklasse für alle Guardrails-Scanner
 */

import {
    IScanner,
    IScannerConfig,
    ScanResult,
    DetectedMatch,
    DetectionCategory,
    Direction,
    SeverityLevel,
    ActionType
} from '../types'

export abstract class BaseScanner implements IScanner {
    abstract readonly name: string
    abstract readonly category: DetectionCategory
    abstract readonly version: string

    protected config: IScannerConfig
    protected patterns: Map<string, { regex: RegExp; severity: SeverityLevel }>

    constructor() {
        this.config = {
            enabled: true,
            direction: Direction.BOTH,
            severity: SeverityLevel.MEDIUM,
            action: ActionType.MASK
        }
        this.patterns = new Map()
    }

    public configure(config: Partial<IScannerConfig>): void {
        this.config = { ...this.config, ...config }
    }

    public isEnabled(): boolean {
        return this.config.enabled
    }

    /**
     * Führt Scan auf Text aus
     */
    public async scan(text: string, direction: Direction): Promise<ScanResult> {
        const startTime = Date.now()

        // Prüfe ob Scanner für diese Richtung aktiviert ist
        if (!this.shouldScan(direction)) {
            return this.createEmptyResult(startTime)
        }

        const matches: DetectedMatch[] = []

        // Alle Patterns durchlaufen
        for (const [type, patternConfig] of this.patterns) {
            const { regex, severity } = patternConfig
            
            // Exclude-Patterns prüfen
            if (this.isExcluded(text, type)) continue

            // Pattern ausführen
            const regexMatches = this.findMatches(text, regex, type, severity)
            matches.push(...regexMatches)
        }

        // Custom Patterns prüfen
        if (this.config.customPatterns) {
            for (const customPattern of this.config.customPatterns) {
                const customMatches = this.findMatches(
                    text, 
                    customPattern, 
                    'custom', 
                    this.config.severity
                )
                matches.push(...customMatches)
            }
        }

        return this.createResult(matches, startTime)
    }

    /**
     * Prüft ob für gegebene Richtung gescannt werden soll
     */
    protected shouldScan(direction: Direction): boolean {
        if (this.config.direction === Direction.BOTH) return true
        return this.config.direction === direction
    }

    /**
     * Prüft ob ein Match von der Prüfung ausgeschlossen ist
     */
    protected isExcluded(text: string, type: string): boolean {
        if (!this.config.excludePatterns) return false
        
        for (const pattern of this.config.excludePatterns) {
            if (pattern.test(text)) return true
        }
        return false
    }

    /**
     * Findet alle Matches für ein Pattern
     */
    protected findMatches(
        text: string,
        regex: RegExp,
        type: string,
        severity: SeverityLevel
    ): DetectedMatch[] {
        const matches: DetectedMatch[] = []
        const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
        
        let match: RegExpExecArray | null
        while ((match = globalRegex.exec(text)) !== null) {
            const value = match[0]
            
            // Whitelist-Prüfung
            if (this.config.whitelist?.includes(value)) continue

            const masked = this.maskValue(value, type)
            
            matches.push({
                type,
                category: this.category,
                value,
                masked,
                startIndex: match.index,
                endIndex: match.index + value.length,
                severity,
                confidence: this.calculateConfidence(value, type)
            })
        }

        return matches
    }

    /**
     * Maskiert einen Wert - kann von Subklassen überschrieben werden
     */
    protected abstract maskValue(value: string, type: string): string

    /**
     * Berechnet Konfidenz für einen Match - kann überschrieben werden
     */
    protected calculateConfidence(value: string, type: string): number {
        // Standard-Konfidenz basierend auf Länge und Pattern-Typ
        return 0.9
    }

    /**
     * Erstellt leeres Ergebnis
     */
    protected createEmptyResult(startTime: number): ScanResult {
        return {
            hasDetections: false,
            category: this.category,
            matches: [],
            summary: {
                totalMatches: 0,
                highestSeverity: SeverityLevel.INFO,
                typeCounts: {}
            },
            processingTimeMs: Date.now() - startTime
        }
    }

    /**
     * Erstellt Ergebnis aus Matches
     */
    protected createResult(matches: DetectedMatch[], startTime: number): ScanResult {
        // Typ-Zählung
        const typeCounts: Record<string, number> = {}
        let highestSeverity = SeverityLevel.INFO
        const severityOrder = [
            SeverityLevel.INFO,
            SeverityLevel.LOW,
            SeverityLevel.MEDIUM,
            SeverityLevel.HIGH,
            SeverityLevel.CRITICAL
        ]

        for (const match of matches) {
            typeCounts[match.type] = (typeCounts[match.type] || 0) + 1
            
            if (severityOrder.indexOf(match.severity) > severityOrder.indexOf(highestSeverity)) {
                highestSeverity = match.severity
            }
        }

        return {
            hasDetections: matches.length > 0,
            category: this.category,
            matches,
            summary: {
                totalMatches: matches.length,
                highestSeverity,
                typeCounts
            },
            processingTimeMs: Date.now() - startTime
        }
    }

    /**
     * Schnelle Maskierung ohne vollständigen Scan
     */
    public quickMask(text: string): string {
        let masked = text
        
        for (const [type, patternConfig] of this.patterns) {
            const { regex } = patternConfig
            const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
            
            masked = masked.replace(globalRegex, (match) => this.maskValue(match, type))
        }
        
        return masked
    }
}
