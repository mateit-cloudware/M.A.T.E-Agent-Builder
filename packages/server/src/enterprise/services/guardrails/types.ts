/**
 * M.A.T.E. AI Guardrails System - Type Definitions
 * 
 * Zentrale Typdefinitionen für das Guardrails-System
 */

// ==================== DETECTION TYPES ====================

export enum DetectionCategory {
    PII = 'pii',
    CREDENTIALS = 'credentials',
    FINANCIAL = 'financial',
    HEALTH = 'health',
    CONTENT = 'content',
    INJECTION = 'injection'
}

export enum SeverityLevel {
    CRITICAL = 'critical',   // Sofort blockieren
    HIGH = 'high',           // Blockieren oder starke Warnung
    MEDIUM = 'medium',       // Warnung + Maskierung
    LOW = 'low',             // Nur loggen
    INFO = 'info'            // Informativ
}

export enum ActionType {
    BLOCK = 'block',         // Request komplett blockieren
    MASK = 'mask',           // Sensible Daten maskieren
    WARN = 'warn',           // Warnung + weiterleiten
    LOG = 'log',             // Nur loggen
    ALLOW = 'allow'          // Erlauben
}

export enum Direction {
    INPUT = 'input',         // Eingehender Text (User → LLM)
    OUTPUT = 'output',       // Ausgehender Text (LLM → User)
    BOTH = 'both'            // Beide Richtungen
}

// ==================== DETECTION RESULTS ====================

export interface DetectedMatch {
    type: string
    category: DetectionCategory
    value: string
    masked: string
    startIndex: number
    endIndex: number
    severity: SeverityLevel
    confidence: number       // 0.0 - 1.0
    metadata?: Record<string, any>
}

export interface ScanResult {
    hasDetections: boolean
    category: DetectionCategory
    matches: DetectedMatch[]
    summary: {
        totalMatches: number
        highestSeverity: SeverityLevel
        typeCounts: Record<string, number>
    }
    processingTimeMs: number
}

export interface GuardrailResult {
    isBlocked: boolean
    action: ActionType
    originalText: string
    processedText: string
    scanResults: ScanResult[]
    aggregatedSeverity: SeverityLevel
    warnings: string[]
    auditInfo: {
        timestamp: Date
        direction: Direction
        userId?: string
        sessionId?: string
        requestId?: string
    }
}

// ==================== SCANNER INTERFACE ====================

export interface IScannerConfig {
    enabled: boolean
    direction: Direction
    severity: SeverityLevel
    action: ActionType
    customPatterns?: RegExp[]
    excludePatterns?: RegExp[]
    whitelist?: string[]
}

export interface IScanner {
    readonly name: string
    readonly category: DetectionCategory
    readonly version: string
    
    configure(config: Partial<IScannerConfig>): void
    scan(text: string, direction: Direction): Promise<ScanResult>
    isEnabled(): boolean
}

// ==================== MASKING INTERFACE ====================

export enum MaskingStyle {
    ASTERISK = 'asterisk',       // ****
    REDACT = 'redact',           // [REDACTED]
    HASH = 'hash',               // [#####]
    PARTIAL = 'partial',         // jo**@ma**.com
    PLACEHOLDER = 'placeholder', // [EMAIL]
    CUSTOM = 'custom'            // Benutzerdefiniert
}

export interface MaskingRule {
    type: string
    category: DetectionCategory
    style: MaskingStyle
    preserveLength?: boolean
    preservePrefix?: number
    preserveSuffix?: number
    placeholder?: string
}

export interface MaskingResult {
    original: string
    masked: string
    masksApplied: Array<{
        type: string
        original: string
        masked: string
        position: { start: number; end: number }
    }>
}

// ==================== CONFIGURATION ====================

export interface GuardrailsConfig {
    enabled: boolean
    mode: 'strict' | 'standard' | 'permissive'
    
    // Scanner-Konfigurationen
    scanners: {
        pii: IScannerConfig
        credentials: IScannerConfig
        financial: IScannerConfig
        health: IScannerConfig
    }
    
    // Aktionen
    defaultAction: ActionType
    blockOnCritical: boolean
    maskOnHigh: boolean
    
    // Maskierung
    masking: {
        enabled: boolean
        defaultStyle: MaskingStyle
        rules: MaskingRule[]
    }
    
    // Audit
    audit: {
        enabled: boolean
        logAllRequests: boolean
        logDetectionsOnly: boolean
        retentionDays: number
    }
    
    // Performance
    performance: {
        maxTextLength: number
        timeoutMs: number
        cacheEnabled: boolean
        cacheTTLSeconds: number
    }
    
    // Bypass
    bypassPaths: string[]
    bypassUsers: string[]
}

// Default-Konfiguration
export const DEFAULT_GUARDRAILS_CONFIG: GuardrailsConfig = {
    enabled: true,
    mode: 'standard',
    
    scanners: {
        pii: {
            enabled: true,
            direction: Direction.BOTH,
            severity: SeverityLevel.HIGH,
            action: ActionType.MASK
        },
        credentials: {
            enabled: true,
            direction: Direction.BOTH,
            severity: SeverityLevel.CRITICAL,
            action: ActionType.MASK
        },
        financial: {
            enabled: true,
            direction: Direction.BOTH,
            severity: SeverityLevel.HIGH,
            action: ActionType.MASK
        },
        health: {
            enabled: true,
            direction: Direction.BOTH,
            severity: SeverityLevel.HIGH,
            action: ActionType.MASK
        }
    },
    
    defaultAction: ActionType.WARN,
    blockOnCritical: true,
    maskOnHigh: true,
    
    masking: {
        enabled: true,
        defaultStyle: MaskingStyle.PARTIAL,
        rules: []
    },
    
    audit: {
        enabled: true,
        logAllRequests: false,
        logDetectionsOnly: true,
        retentionDays: 90
    },
    
    performance: {
        maxTextLength: 100000,
        timeoutMs: 5000,
        cacheEnabled: true,
        cacheTTLSeconds: 300
    },
    
    bypassPaths: [
        '/api/v1/ping',
        '/api/v1/health',
        '/api/v1/version'
    ],
    bypassUsers: []
}

// ==================== AUDIT TYPES ====================

export interface GuardrailAuditEntry {
    id: string
    timestamp: Date
    userId?: string
    sessionId?: string
    requestId?: string
    direction: Direction
    action: ActionType
    category: DetectionCategory
    detectionType: string
    severity: SeverityLevel
    originalValue?: string      // Nur bei Audit-Log mit erhöhter Berechtigung
    maskedValue: string
    metadata?: Record<string, any>
}

// ==================== STATISTICS ====================

export interface GuardrailStats {
    period: {
        start: Date
        end: Date
    }
    totalScans: number
    totalDetections: number
    blockedRequests: number
    maskedValues: number
    byCategory: Record<DetectionCategory, {
        scans: number
        detections: number
        blocked: number
    }>
    bySeverity: Record<SeverityLevel, number>
    topDetectionTypes: Array<{
        type: string
        count: number
        percentage: number
    }>
    averageProcessingTimeMs: number
}
