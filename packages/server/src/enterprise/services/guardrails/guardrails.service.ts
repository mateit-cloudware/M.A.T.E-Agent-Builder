/**
 * M.A.T.E. AI Guardrails Service
 * 
 * Zentraler Service für die Koordination aller Guardrails-Funktionen:
 * - Scanner-Orchestrierung (PII, Credentials, Financial, Health)
 * - Maskierung sensibler Daten
 * - Bidirektionale Überprüfung (Input/Output)
 * - Audit-Logging
 * - Konfigurationsverwaltung
 * 
 * Basiert auf requesty.ai Guardrails-Konzept
 */

import { v4 as uuidv4 } from 'uuid'
import logger from '../../../utils/logger'
import {
    GuardrailsConfig,
    GuardrailResult,
    ScanResult,
    DetectionCategory,
    Direction,
    ActionType,
    SeverityLevel,
    IScanner,
    DEFAULT_GUARDRAILS_CONFIG,
    DetectedMatch
} from './types'
import { PIIScanner } from './scanners/pii.scanner'
import { CredentialsScanner } from './scanners/credentials.scanner'
import { FinancialScanner } from './scanners/financial.scanner'
import { HealthScanner } from './scanners/health.scanner'
import { MaskingEngine } from './masking.engine'
import { guardrailAuditService } from './guardrail-audit.service'

/**
 * Singleton GuardrailsService
 * Koordiniert alle Scanner und Masking-Operationen
 */
class GuardrailsService {
    private static instance: GuardrailsService
    private config: GuardrailsConfig
    private scanners: Map<DetectionCategory, IScanner>
    private maskingEngine: MaskingEngine
    private initialized: boolean = false

    private constructor() {
        this.config = { ...DEFAULT_GUARDRAILS_CONFIG }
        this.scanners = new Map()
        this.maskingEngine = MaskingEngine.getInstance()
    }

    public static getInstance(): GuardrailsService {
        if (!GuardrailsService.instance) {
            GuardrailsService.instance = new GuardrailsService()
        }
        return GuardrailsService.instance
    }

    /**
     * Initialisiert alle Scanner und lädt Konfiguration
     */
    public async initialize(config?: Partial<GuardrailsConfig>): Promise<void> {
        if (this.initialized) {
            logger.debug('[Guardrails] Already initialized')
            return
        }

        try {
            // Konfiguration mergen
            if (config) {
                this.config = this.mergeConfig(this.config, config)
            }

            // Scanner initialisieren
            this.initializeScanners()

            // Masking Engine konfigurieren
            this.maskingEngine.configure(this.config.masking)

            this.initialized = true
            logger.info('[Guardrails] Service initialized', {
                mode: this.config.mode,
                scannersEnabled: Array.from(this.scanners.keys())
            })
        } catch (error) {
            logger.error('[Guardrails] Initialization failed', { error })
            throw error
        }
    }

    /**
     * Initialisiert alle Scanner mit Konfiguration
     */
    private initializeScanners(): void {
        // PII Scanner
        const piiScanner = new PIIScanner()
        piiScanner.configure(this.config.scanners.pii)
        this.scanners.set(DetectionCategory.PII, piiScanner)

        // Credentials Scanner
        const credentialsScanner = new CredentialsScanner()
        credentialsScanner.configure(this.config.scanners.credentials)
        this.scanners.set(DetectionCategory.CREDENTIALS, credentialsScanner)

        // Financial Scanner
        const financialScanner = new FinancialScanner()
        financialScanner.configure(this.config.scanners.financial)
        this.scanners.set(DetectionCategory.FINANCIAL, financialScanner)

        // Health Scanner
        const healthScanner = new HealthScanner()
        healthScanner.configure(this.config.scanners.health)
        this.scanners.set(DetectionCategory.HEALTH, healthScanner)
    }

    /**
     * Hauptmethode: Prüft Text auf alle konfigurierten Guardrails
     */
    public async processText(
        text: string,
        direction: Direction,
        context?: {
            userId?: string
            sessionId?: string
            requestId?: string
        }
    ): Promise<GuardrailResult> {
        const startTime = Date.now()
        const requestId = context?.requestId || uuidv4()

        // Default-Result
        const result: GuardrailResult = {
            isBlocked: false,
            action: ActionType.ALLOW,
            originalText: text,
            processedText: text,
            scanResults: [],
            aggregatedSeverity: SeverityLevel.INFO,
            warnings: [],
            auditInfo: {
                timestamp: new Date(),
                direction,
                userId: context?.userId,
                sessionId: context?.sessionId,
                requestId
            }
        }

        // Prüfe ob Guardrails aktiviert
        if (!this.config.enabled) {
            return result
        }

        // Textlängen-Check
        if (text.length > this.config.performance.maxTextLength) {
            result.warnings.push(`Text exceeds maximum length (${text.length} > ${this.config.performance.maxTextLength})`)
            result.processedText = text.slice(0, this.config.performance.maxTextLength)
        }

        try {
            // Alle Scanner parallel ausführen
            const scanPromises: Promise<ScanResult>[] = []
            
            for (const [category, scanner] of this.scanners) {
                if (scanner.isEnabled()) {
                    scanPromises.push(
                        this.runScannerWithTimeout(scanner, text, direction)
                    )
                }
            }

            result.scanResults = await Promise.all(scanPromises)

            // Ergebnisse aggregieren
            this.aggregateResults(result)

            // Maskierung anwenden wenn nötig
            if (this.shouldMask(result)) {
                result.processedText = this.applyMasking(text, result.scanResults)
            }

            // Aktion bestimmen
            result.action = this.determineAction(result)
            result.isBlocked = result.action === ActionType.BLOCK

            // Audit-Log erstellen
            if (this.shouldAudit(result)) {
                await this.createAuditLog(result)
            }

            const processingTime = Date.now() - startTime
            logger.debug('[Guardrails] Processing complete', {
                requestId,
                direction,
                processingTimeMs: processingTime,
                action: result.action,
                detectionsCount: result.scanResults.reduce((sum, r) => sum + r.matches.length, 0)
            })

            return result

        } catch (error) {
            logger.error('[Guardrails] Processing error', { error, requestId })
            
            // Bei Fehler: Je nach Modus blockieren oder durchlassen
            if (this.config.mode === 'strict') {
                result.isBlocked = true
                result.action = ActionType.BLOCK
                result.warnings.push('Guardrails processing failed - blocked in strict mode')
            }
            
            return result
        }
    }

    /**
     * Scanner mit Timeout ausführen
     */
    private async runScannerWithTimeout(
        scanner: IScanner,
        text: string,
        direction: Direction
    ): Promise<ScanResult> {
        const timeoutPromise = new Promise<ScanResult>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Scanner ${scanner.name} timed out`))
            }, this.config.performance.timeoutMs)
        })

        return Promise.race([
            scanner.scan(text, direction),
            timeoutPromise
        ])
    }

    /**
     * Aggregiert Ergebnisse aller Scanner
     */
    private aggregateResults(result: GuardrailResult): void {
        const severityPriority: Record<SeverityLevel, number> = {
            [SeverityLevel.CRITICAL]: 5,
            [SeverityLevel.HIGH]: 4,
            [SeverityLevel.MEDIUM]: 3,
            [SeverityLevel.LOW]: 2,
            [SeverityLevel.INFO]: 1
        }

        let highestSeverity = SeverityLevel.INFO
        let highestPriority = 0

        for (const scanResult of result.scanResults) {
            if (scanResult.hasDetections) {
                const priority = severityPriority[scanResult.summary.highestSeverity]
                if (priority > highestPriority) {
                    highestPriority = priority
                    highestSeverity = scanResult.summary.highestSeverity
                }

                // Warnungen sammeln
                for (const match of scanResult.matches) {
                    result.warnings.push(
                        `${match.category}: ${match.type} detected (${match.severity})`
                    )
                }
            }
        }

        result.aggregatedSeverity = highestSeverity
    }

    /**
     * Bestimmt Aktion basierend auf Ergebnissen und Konfiguration
     */
    private determineAction(result: GuardrailResult): ActionType {
        const severity = result.aggregatedSeverity

        // Strict Mode: Kritisch und Hoch werden blockiert
        if (this.config.mode === 'strict') {
            if (severity === SeverityLevel.CRITICAL) return ActionType.BLOCK
            if (severity === SeverityLevel.HIGH) return ActionType.BLOCK
            if (severity === SeverityLevel.MEDIUM) return ActionType.MASK
            return ActionType.WARN
        }

        // Standard Mode: Nur Kritisch blockieren
        if (this.config.mode === 'standard') {
            if (severity === SeverityLevel.CRITICAL && this.config.blockOnCritical) {
                return ActionType.BLOCK
            }
            if (severity === SeverityLevel.HIGH && this.config.maskOnHigh) {
                return ActionType.MASK
            }
            if (severity === SeverityLevel.MEDIUM) return ActionType.MASK
            if (severity === SeverityLevel.LOW) return ActionType.LOG
            return ActionType.ALLOW
        }

        // Permissive Mode: Nie blockieren, nur warnen
        if (severity === SeverityLevel.CRITICAL) return ActionType.WARN
        if (severity === SeverityLevel.HIGH) return ActionType.MASK
        return ActionType.LOG
    }

    /**
     * Prüft ob Maskierung angewendet werden soll
     */
    private shouldMask(result: GuardrailResult): boolean {
        if (!this.config.masking.enabled) return false

        const action = this.determineAction(result)
        return action === ActionType.MASK || 
               (action === ActionType.WARN && result.aggregatedSeverity === SeverityLevel.HIGH)
    }

    /**
     * Wendet Maskierung auf alle gefundenen Matches an
     */
    private applyMasking(text: string, scanResults: ScanResult[]): string {
        // Alle Matches sammeln und nach Position sortieren (absteigend)
        const allMatches: DetectedMatch[] = []
        
        for (const result of scanResults) {
            allMatches.push(...result.matches)
        }

        // Nach Position sortieren (von hinten nach vorne, um Indizes nicht zu invalidieren)
        allMatches.sort((a, b) => b.startIndex - a.startIndex)

        let maskedText = text
        for (const match of allMatches) {
            const maskResult = this.maskingEngine.mask(
                match.value,
                match.type,
                match.category
            )
            maskedText = 
                maskedText.slice(0, match.startIndex) + 
                maskResult.masked + 
                maskedText.slice(match.endIndex)
        }

        return maskedText
    }

    /**
     * Prüft ob Audit-Log erstellt werden soll
     */
    private shouldAudit(result: GuardrailResult): boolean {
        if (!this.config.audit.enabled) return false
        if (this.config.audit.logAllRequests) return true
        if (this.config.audit.logDetectionsOnly) {
            return result.scanResults.some(r => r.hasDetections)
        }
        return false
    }

    /**
     * Erstellt Audit-Log-Einträge
     */
    private async createAuditLog(result: GuardrailResult): Promise<void> {
        try {
            for (const scanResult of result.scanResults) {
                for (const match of scanResult.matches) {
                    await guardrailAuditService.log({
                        userId: result.auditInfo.userId,
                        sessionId: result.auditInfo.sessionId,
                        requestId: result.auditInfo.requestId,
                        direction: result.auditInfo.direction,
                        action: result.action,
                        category: match.category,
                        detectionType: match.type,
                        severity: match.severity,
                        maskedValue: match.masked
                    })
                }
            }
        } catch (error) {
            logger.error('[Guardrails] Audit log creation failed', { error })
        }
    }

    /**
     * Merged Konfiguration rekursiv
     */
    private mergeConfig(
        base: GuardrailsConfig,
        override: Partial<GuardrailsConfig>
    ): GuardrailsConfig {
        return {
            ...base,
            ...override,
            scanners: {
                ...base.scanners,
                ...(override.scanners || {})
            },
            masking: {
                ...base.masking,
                ...(override.masking || {})
            },
            audit: {
                ...base.audit,
                ...(override.audit || {})
            },
            performance: {
                ...base.performance,
                ...(override.performance || {})
            }
        }
    }

    // ==================== PUBLIC API ====================

    /**
     * Prüft Input-Text (User → LLM)
     */
    public async validateInput(
        text: string,
        context?: { userId?: string; sessionId?: string; requestId?: string }
    ): Promise<GuardrailResult> {
        return this.processText(text, Direction.INPUT, context)
    }

    /**
     * Prüft Output-Text (LLM → User)
     */
    public async validateOutput(
        text: string,
        context?: { userId?: string; sessionId?: string; requestId?: string }
    ): Promise<GuardrailResult> {
        return this.processText(text, Direction.OUTPUT, context)
    }

    /**
     * Schnelle Maskierung ohne vollständigen Scan
     */
    public quickMask(text: string): string {
        // Nur kritische Muster maskieren
        const piiScanner = this.scanners.get(DetectionCategory.PII) as PIIScanner
        const credScanner = this.scanners.get(DetectionCategory.CREDENTIALS) as CredentialsScanner
        
        let masked = text
        
        if (piiScanner) {
            masked = piiScanner.quickMask(masked)
        }
        if (credScanner) {
            masked = credScanner.quickMask(masked)
        }
        
        return masked
    }

    /**
     * Gibt aktuelle Konfiguration zurück
     */
    public getConfig(): GuardrailsConfig {
        return { ...this.config }
    }

    /**
     * Aktualisiert Konfiguration zur Laufzeit
     */
    public updateConfig(config: Partial<GuardrailsConfig>): void {
        this.config = this.mergeConfig(this.config, config)
        
        // Scanner neu konfigurieren
        if (config.scanners) {
            for (const [category, scannerConfig] of Object.entries(config.scanners)) {
                const scanner = this.scanners.get(category as DetectionCategory)
                if (scanner) {
                    scanner.configure(scannerConfig)
                }
            }
        }

        // Masking Engine neu konfigurieren
        if (config.masking) {
            this.maskingEngine.configure(this.config.masking)
        }

        logger.info('[Guardrails] Configuration updated')
    }

    /**
     * Prüft ob ein Pfad von Guardrails ausgenommen ist
     */
    public isPathBypassed(path: string): boolean {
        return this.config.bypassPaths.some(
            bypassPath => path.startsWith(bypassPath)
        )
    }

    /**
     * Prüft ob ein User von Guardrails ausgenommen ist
     */
    public isUserBypassed(userId: string): boolean {
        return this.config.bypassUsers.includes(userId)
    }

    /**
     * Gibt Statistiken zurück
     */
    public async getStatistics(
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        return guardrailAuditService.getStatistics(startDate, endDate)
    }

    /**
     * Health-Check für Guardrails-System
     */
    public healthCheck(): {
        healthy: boolean
        scanners: Record<string, boolean>
        config: { mode: string; enabled: boolean }
    } {
        const scannersHealth: Record<string, boolean> = {}
        
        for (const [category, scanner] of this.scanners) {
            scannersHealth[category] = scanner.isEnabled()
        }

        return {
            healthy: this.initialized && this.config.enabled,
            scanners: scannersHealth,
            config: {
                mode: this.config.mode,
                enabled: this.config.enabled
            }
        }
    }
}

export const guardrailsService = GuardrailsService.getInstance()
