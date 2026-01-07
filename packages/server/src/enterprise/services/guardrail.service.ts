/**
 * M.A.T.E. Guardrail Service
 * 
 * Phase 1.3: AI Guardrails Basis
 * - PII-Detection (E-Mail, Telefon, SSN, Namen)
 * - Credentials-Detection (API-Keys, Tokens, Passwörter)
 * - Input-Sanitization und Output-Filtering
 * - Audit-Logging
 * 
 * Enterprise Security Standards: Fintech/Healthcare-Grade
 */

import { getDataSource } from '../../DataSource'
import { 
    GuardrailAuditLog, 
    AuditDirection, 
    AuditAction, 
    AuditSeverity,
    GuardrailConfig,
    GuardrailCategory,
    createGuardrailAuditLog
} from '../database/entities/guardrail.entity'
import logger from '../../utils/logger'

// ==================== TYPES ====================

export interface DetectionResult {
    detected: boolean
    category: string
    detectionType: string
    severity: AuditSeverity
    confidence: number
    originalValue?: string
    maskedValue?: string
    position?: { start: number; end: number }
    metadata?: Record<string, any>
}

export interface ScanResult {
    hasDetections: boolean
    action: AuditAction
    detections: DetectionResult[]
    sanitizedText: string
    originalText: string
    processingTimeMs: number
}

export interface GuardrailOptions {
    userId?: string
    sessionId?: string
    requestId?: string
    direction?: AuditDirection
    sourcePath?: string
    sourceIp?: string
    skipAuditLog?: boolean
    enabledCategories?: GuardrailCategory[]
}

// ==================== REGEX PATTERNS ====================

/**
 * PII-Detection Patterns (GDPR/CCPA/HIPAA)
 */
const PII_PATTERNS = {
    // E-Mail (RFC 5322)
    email: {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        severity: AuditSeverity.HIGH,
        maskStyle: 'partial' // test***@example.com
    },
    
    // Telefonnummern (International)
    phone: {
        pattern: /(?:\+?(\d{1,3}))?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
        severity: AuditSeverity.MEDIUM,
        maskStyle: 'partial' // +49 ***-***-1234
    },
    
    // US Social Security Number (SSN)
    ssn: {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact' // ***-**-****
    },
    
    // Personennamen (Heuristik: Großbuchstaben am Wortanfang)
    personName: {
        pattern: /\b[A-Z][a-z]{2,}\s[A-Z][a-z]{2,}\b/g,
        severity: AuditSeverity.MEDIUM,
        maskStyle: 'asterisk', // ***** *****
        confidence: 0.7 // Niedrigere Konfidenz wegen Heuristik
    }
}

/**
 * Credentials-Detection Patterns
 */
const CREDENTIALS_PATTERNS = {
    // API-Keys (gängige Formate)
    apiKey: {
        pattern: /(?:api[_-]?key|apikey|access[_-]?token)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/gi,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact'
    },
    
    // Bearer Tokens
    bearerToken: {
        pattern: /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact'
    },
    
    // OpenRouter/OpenAI Keys
    openrouterKey: {
        pattern: /sk-or-v1-[A-Za-z0-9]{64,}/g,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact'
    },
    
    openaiKey: {
        pattern: /sk-[A-Za-z0-9]{48,}/g,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact'
    },
    
    // Anthropic Keys
    anthropicKey: {
        pattern: /sk-ant-[A-Za-z0-9\-]{95,}/g,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact'
    },
    
    // Passwörter in Klartext
    password: {
        pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{6,})['"]?/gi,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact'
    }
}

/**
 * Financial-Detection Patterns
 */
const FINANCIAL_PATTERNS = {
    // Kreditkarten (Luhn-Algorithm aware)
    creditCard: {
        pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'partial' // ****-****-****-1234
    },
    
    // IBAN (European)
    iban: {
        pattern: /\b[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{0,2}\b/g,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'partial'
    }
}

/**
 * Injection-Detection Patterns
 */
const INJECTION_PATTERNS = {
    // SQL-Injection
    sqlInjection: {
        pattern: /(\bUNION\b.*\bSELECT\b|\bDROP\b.*\bTABLE\b|\bINSERT\b.*\bINTO\b|\bDELETE\b.*\bFROM\b)/gi,
        severity: AuditSeverity.CRITICAL,
        maskStyle: 'redact'
    },
    
    // XSS (Cross-Site Scripting)
    xss: {
        pattern: /<script[^>]*>.*?<\/script>/gi,
        severity: AuditSeverity.HIGH,
        maskStyle: 'redact'
    }
}

// ==================== GUARDRAIL SERVICE ====================

/**
 * GuardrailService (Singleton)
 * 
 * Implementiert Enterprise-Grade Security Guardrails für LLM-Interaktionen
 */
export class GuardrailService {
    private static instance: GuardrailService
    private configCache: Map<string, GuardrailConfig> = new Map()
    private cacheExpiry: number = 300000 // 5 Minuten

    private constructor() {
        this.loadConfigurations()
    }

    public static getInstance(): GuardrailService {
        if (!GuardrailService.instance) {
            GuardrailService.instance = new GuardrailService()
        }
        return GuardrailService.instance
    }

    /**
     * Lädt Guardrail-Konfigurationen aus der Datenbank
     */
    private async loadConfigurations(): Promise<void> {
        try {
            const dataSource = getDataSource()
            const configRepo = dataSource.getRepository(GuardrailConfig)
            
            const configs = await configRepo.find({
                where: { isEnabled: true }
            })

            configs.forEach((config: GuardrailConfig) => {
                this.configCache.set(config.key, config)
            })

            logger.info(`[GuardrailService] Loaded ${configs.length} configurations`)
        } catch (error) {
            logger.error('[GuardrailService] Failed to load configurations:', error)
        }
    }

    /**
     * Scannt Text auf PII, Credentials und andere sensible Daten
     * 
     * @param text - Zu scannender Text
     * @param options - Scan-Optionen
     * @returns Scan-Ergebnis mit Detektionen und sanitisiertem Text
     */
    public async scanText(text: string, options: GuardrailOptions = {}): Promise<ScanResult> {
        const startTime = Date.now()
        const detections: DetectionResult[] = []
        let sanitizedText = text

        // PII-Scans
        if (this.isCategoryEnabled(GuardrailCategory.PII, options)) {
            for (const [type, config] of Object.entries(PII_PATTERNS)) {
                const results = this.detectPattern(
                    text,
                    config.pattern,
                    GuardrailCategory.PII,
                    type,
                    config.severity,
                    config.maskStyle,
                    (config as any).confidence || 1.0
                )
                detections.push(...results)
            }
        }

        // Credentials-Scans
        if (this.isCategoryEnabled(GuardrailCategory.CREDENTIALS, options)) {
            for (const [type, config] of Object.entries(CREDENTIALS_PATTERNS)) {
                const results = this.detectPattern(
                    text,
                    config.pattern,
                    GuardrailCategory.CREDENTIALS,
                    type,
                    config.severity,
                    config.maskStyle
                )
                detections.push(...results)
            }
        }

        // Financial-Scans
        if (this.isCategoryEnabled(GuardrailCategory.FINANCIAL, options)) {
            for (const [type, config] of Object.entries(FINANCIAL_PATTERNS)) {
                const results = this.detectPattern(
                    text,
                    config.pattern,
                    GuardrailCategory.FINANCIAL,
                    type,
                    config.severity,
                    config.maskStyle
                )
                detections.push(...results)
            }
        }

        // Injection-Scans
        if (this.isCategoryEnabled(GuardrailCategory.INJECTION, options)) {
            for (const [type, config] of Object.entries(INJECTION_PATTERNS)) {
                const results = this.detectPattern(
                    text,
                    config.pattern,
                    GuardrailCategory.INJECTION,
                    type,
                    config.severity,
                    config.maskStyle
                )
                detections.push(...results)
            }
        }

        // Maskierung durchführen
        if (detections.length > 0) {
            sanitizedText = this.applySanitization(text, detections)
        }

        // Aktion bestimmen
        const action = this.determineAction(detections)

        const processingTimeMs = Date.now() - startTime

        // Audit-Log erstellen
        if (!options.skipAuditLog && detections.length > 0) {
            await this.logDetections(detections, options, processingTimeMs, action)
        }

        return {
            hasDetections: detections.length > 0,
            action,
            detections,
            sanitizedText,
            originalText: text,
            processingTimeMs
        }
    }

    /**
     * Erkennt Pattern im Text
     */
    private detectPattern(
        text: string,
        pattern: RegExp,
        category: string,
        detectionType: string,
        severity: AuditSeverity,
        maskStyle: string,
        confidence: number = 1.0
    ): DetectionResult[] {
        const results: DetectionResult[] = []
        let match: RegExpExecArray | null

        // Reset regex state
        pattern.lastIndex = 0

        while ((match = pattern.exec(text)) !== null) {
            const originalValue = match[0]
            const maskedValue = this.maskValue(originalValue, maskStyle)

            results.push({
                detected: true,
                category,
                detectionType,
                severity,
                confidence,
                originalValue,
                maskedValue,
                position: {
                    start: match.index,
                    end: match.index + originalValue.length
                }
            })
        }

        return results
    }

    /**
     * Maskiert einen Wert basierend auf dem Maskierungsstil
     */
    private maskValue(value: string, maskStyle: string): string {
        switch (maskStyle) {
            case 'asterisk':
                return '*'.repeat(value.length)
            
            case 'redact':
                return '[REDACTED]'
            
            case 'partial':
                if (value.length <= 4) {
                    return '*'.repeat(value.length)
                }
                // Zeige letzten 4 Zeichen
                const visible = value.slice(-4)
                const masked = '*'.repeat(value.length - 4)
                return masked + visible
            
            default:
                return '[MASKED]'
        }
    }

    /**
     * Wendet Maskierung auf den gesamten Text an
     */
    private applySanitization(text: string, detections: DetectionResult[]): string {
        let sanitized = text

        // Sortiere Detektionen rückwärts nach Position (wichtig für String-Ersetzung)
        const sorted = [...detections].sort((a, b) => {
            if (!a.position || !b.position) return 0
            return b.position.start - a.position.start
        })

        for (const detection of sorted) {
            if (detection.originalValue && detection.maskedValue && detection.position) {
                const before = sanitized.substring(0, detection.position.start)
                const after = sanitized.substring(detection.position.end)
                sanitized = before + detection.maskedValue + after
            }
        }

        return sanitized
    }

    /**
     * Bestimmt die Aktion basierend auf den Detektionen
     */
    private determineAction(detections: DetectionResult[]): AuditAction {
        if (detections.length === 0) {
            return AuditAction.ALLOW
        }

        // Prüfe höchste Schwere
        const hasCritical = detections.some(d => d.severity === AuditSeverity.CRITICAL)
        const hasHigh = detections.some(d => d.severity === AuditSeverity.HIGH)

        if (hasCritical) {
            // Check config für block_on_critical
            const blockOnCritical = this.configCache.get('block_on_critical')?.value === 'true'
            return blockOnCritical ? AuditAction.BLOCK : AuditAction.MASK
        }

        if (hasHigh) {
            // Check config für mask_on_high
            const maskOnHigh = this.configCache.get('mask_on_high')?.value === 'true'
            return maskOnHigh ? AuditAction.MASK : AuditAction.WARN
        }

        return AuditAction.WARN
    }

    /**
     * Prüft, ob eine Kategorie aktiviert ist
     */
    private isCategoryEnabled(category: GuardrailCategory, options: GuardrailOptions): boolean {
        // Wenn spezifische Kategorien übergeben wurden
        if (options.enabledCategories) {
            return options.enabledCategories.includes(category)
        }

        // Prüfe Konfiguration
        const configKey = `${category}_scanner_enabled`
        const config = this.configCache.get(configKey)
        return config?.value === 'true' || true // Default: enabled
    }

    /**
     * Loggt Detektionen im Audit-Log
     */
    private async logDetections(
        detections: DetectionResult[],
        options: GuardrailOptions,
        processingTimeMs: number,
        action: AuditAction
    ): Promise<void> {
        try {
            const dataSource = getDataSource()
            const auditRepo = dataSource.getRepository(GuardrailAuditLog)

            const logs = detections.map(detection => 
                createGuardrailAuditLog({
                    userId: options.userId,
                    sessionId: options.sessionId,
                    requestId: options.requestId,
                    direction: options.direction || AuditDirection.INPUT,
                    action,
                    category: detection.category,
                    detectionType: detection.detectionType,
                    severity: detection.severity,
                    maskedValue: detection.maskedValue,
                    confidence: detection.confidence,
                    sourcePath: options.sourcePath,
                    sourceIp: options.sourceIp,
                    processingTimeMs,
                    metadata: JSON.stringify(detection.metadata || {})
                })
            )

            await auditRepo.save(logs)
            logger.info(`[GuardrailService] Logged ${logs.length} detections`)
        } catch (error) {
            logger.error('[GuardrailService] Failed to log detections:', error)
        }
    }

    /**
     * Prüft Input vor LLM-Call
     */
    public async validateInput(
        input: string,
        options: GuardrailOptions = {}
    ): Promise<{ allowed: boolean; sanitized: string; reason?: string }> {
        const scanResult = await this.scanText(input, {
            ...options,
            direction: AuditDirection.INPUT
        })

        if (scanResult.action === AuditAction.BLOCK) {
            return {
                allowed: false,
                sanitized: '',
                reason: 'Critical security violation detected'
            }
        }

        return {
            allowed: true,
            sanitized: scanResult.sanitizedText
        }
    }

    /**
     * Prüft Output nach LLM-Call
     */
    public async validateOutput(
        output: string,
        options: GuardrailOptions = {}
    ): Promise<{ allowed: boolean; sanitized: string; reason?: string }> {
        const scanResult = await this.scanText(output, {
            ...options,
            direction: AuditDirection.OUTPUT
        })

        if (scanResult.action === AuditAction.BLOCK) {
            return {
                allowed: false,
                sanitized: '',
                reason: 'Critical security violation in LLM output'
            }
        }

        return {
            allowed: true,
            sanitized: scanResult.sanitizedText
        }
    }
}

// Export Singleton-Instanz
export const guardrailService = GuardrailService.getInstance()
