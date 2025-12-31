/**
 * M.A.T.E. Guardrail Entities (G8 + G9)
 * 
 * G8: GuardrailConfig - Konfiguration der Guardrails
 * G9: GuardrailAuditLog - Protokollierung der Guardrails-Aktivitäten
 */

import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

// ==================== G8: GUARDRAIL CONFIG ENTITY ====================

/**
 * Konfigurationstypen für Guardrails
 */
export enum GuardrailConfigType {
    SCANNER = 'scanner',           // Scanner-Konfiguration (PII, Credentials, etc.)
    MASKING = 'masking',           // Maskierungsregeln
    POLICY = 'policy',             // Richtlinien (Block, Warn, etc.)
    WHITELIST = 'whitelist',       // Whitelist-Einträge
    BLACKLIST = 'blacklist',       // Blacklist-Einträge
    PATTERN = 'pattern'            // Custom Patterns
}

/**
 * Kategorien für Guardrail-Konfigurationen
 */
export enum GuardrailCategory {
    PII = 'pii',
    CREDENTIALS = 'credentials',
    FINANCIAL = 'financial',
    HEALTH = 'health',
    CONTENT = 'content',
    INJECTION = 'injection',
    GLOBAL = 'global'
}

/**
 * GuardrailConfig Entity
 * Speichert Konfigurationseinstellungen für das Guardrails-System
 */
@Entity('guardrail_config')
export class GuardrailConfig {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ type: 'varchar', length: 50, name: 'config_type' })
    @Index()
    configType: GuardrailConfigType = GuardrailConfigType.SCANNER

    @Column({ type: 'varchar', length: 50 })
    @Index()
    category: GuardrailCategory = GuardrailCategory.GLOBAL

    @Column({ type: 'varchar', length: 100, name: 'config_key' })
    key: string = ''

    @Column({ type: 'text', name: 'config_value' })
    value: string = ''

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ type: 'boolean', default: true, name: 'is_enabled' })
    isEnabled: boolean = true

    @Column({ type: 'int', default: 0 })
    priority: number = 0

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'applies_to' })
    appliesTo?: string  // User-ID, Org-ID, Workspace-ID oder 'all'

    @Column({ type: 'text', nullable: true })
    metadata?: string  // JSON für zusätzliche Konfiguration

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'created_by' })
    createdBy?: string

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'updated_by' })
    updatedBy?: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date = new Date()
}

// ==================== G9: GUARDRAIL AUDIT LOG ENTITY ====================

/**
 * Richtung der Prüfung
 */
export enum AuditDirection {
    INPUT = 'input',
    OUTPUT = 'output'
}

/**
 * Aktion die ausgeführt wurde
 */
export enum AuditAction {
    ALLOW = 'allow',
    BLOCK = 'block',
    MASK = 'mask',
    WARN = 'warn',
    LOG = 'log'
}

/**
 * Schweregrad der Erkennung
 */
export enum AuditSeverity {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
    INFO = 'info'
}

/**
 * GuardrailAuditLog Entity
 * Protokolliert alle Guardrails-Aktivitäten für Compliance und Analyse
 */
@Entity('guardrail_audit_log')
@Index(['createdAt'])
@Index(['userId', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['severity', 'createdAt'])
export class GuardrailAuditLog {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'user_id' })
    @Index()
    userId?: string

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'session_id' })
    sessionId?: string

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'request_id' })
    requestId?: string

    @Column({ type: 'varchar', length: 20, default: AuditDirection.INPUT })
    direction: AuditDirection = AuditDirection.INPUT

    @Column({ type: 'varchar', length: 20, default: AuditAction.LOG })
    action: AuditAction = AuditAction.LOG

    @Column({ type: 'varchar', length: 50 })
    @Index()
    category: string = ''

    @Column({ type: 'varchar', length: 100, name: 'detection_type' })
    detectionType: string = ''

    @Column({ type: 'varchar', length: 20, default: AuditSeverity.INFO })
    severity: AuditSeverity = AuditSeverity.INFO

    @Column({ type: 'text', nullable: true, name: 'masked_value' })
    maskedValue?: string

    @Column({ type: 'float', nullable: true })
    confidence?: number

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'source_path' })
    sourcePath?: string  // API-Pfad

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'source_ip' })
    sourceIp?: string

    @Column({ type: 'text', nullable: true })
    metadata?: string  // JSON für zusätzliche Informationen

    @Column({ type: 'int', nullable: true, name: 'processing_time_ms' })
    processingTimeMs?: number

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Standard-Guardrail-Konfigurationen
 */
export const DEFAULT_GUARDRAIL_CONFIGS: Partial<GuardrailConfig>[] = [
    // Scanner-Konfigurationen
    {
        configType: GuardrailConfigType.SCANNER,
        category: GuardrailCategory.PII,
        key: 'pii_scanner_enabled',
        value: 'true',
        description: 'PII-Scanner aktivieren (E-Mail, Telefon, SSN, Namen)',
        priority: 100
    },
    {
        configType: GuardrailConfigType.SCANNER,
        category: GuardrailCategory.CREDENTIALS,
        key: 'credentials_scanner_enabled',
        value: 'true',
        description: 'Credentials-Scanner aktivieren (API-Keys, Tokens, Passwörter)',
        priority: 100
    },
    {
        configType: GuardrailConfigType.SCANNER,
        category: GuardrailCategory.FINANCIAL,
        key: 'financial_scanner_enabled',
        value: 'true',
        description: 'Financial-Scanner aktivieren (Kreditkarten, IBAN)',
        priority: 100
    },
    {
        configType: GuardrailConfigType.SCANNER,
        category: GuardrailCategory.HEALTH,
        key: 'health_scanner_enabled',
        value: 'true',
        description: 'Health-Scanner aktivieren (Diagnosen, Medikamente)',
        priority: 100
    },

    // Richtlinien
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'default_action',
        value: 'mask',
        description: 'Standard-Aktion bei Erkennung (allow, mask, warn, block)',
        priority: 50
    },
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'block_on_critical',
        value: 'true',
        description: 'Bei kritischer Schwere blockieren',
        priority: 50
    },
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'mask_on_high',
        value: 'true',
        description: 'Bei hoher Schwere maskieren',
        priority: 50
    },
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'check_input',
        value: 'true',
        description: 'Eingehende Requests prüfen',
        priority: 50
    },
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'check_output',
        value: 'true',
        description: 'Ausgehende Responses prüfen',
        priority: 50
    },

    // Maskierungsregeln
    {
        configType: GuardrailConfigType.MASKING,
        category: GuardrailCategory.PII,
        key: 'email_mask_style',
        value: 'partial',
        description: 'E-Mail-Maskierungsstil (asterisk, redact, partial)',
        priority: 30
    },
    {
        configType: GuardrailConfigType.MASKING,
        category: GuardrailCategory.FINANCIAL,
        key: 'credit_card_mask_style',
        value: 'partial',
        description: 'Kreditkarten-Maskierungsstil',
        priority: 30
    },
    {
        configType: GuardrailConfigType.MASKING,
        category: GuardrailCategory.CREDENTIALS,
        key: 'api_key_mask_style',
        value: 'redact',
        description: 'API-Key-Maskierungsstil',
        priority: 30
    },

    // Audit-Einstellungen
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'audit_enabled',
        value: 'true',
        description: 'Audit-Logging aktivieren',
        priority: 40
    },
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'audit_retention_days',
        value: '90',
        description: 'Audit-Log Aufbewahrungsdauer in Tagen',
        priority: 40
    },
    {
        configType: GuardrailConfigType.POLICY,
        category: GuardrailCategory.GLOBAL,
        key: 'audit_log_all',
        value: 'false',
        description: 'Alle Requests loggen (nicht nur Erkennungen)',
        priority: 40
    }
]

/**
 * Erstellt eine GuardrailConfig mit Default-Werten
 */
export function createGuardrailConfig(data: Partial<GuardrailConfig>): GuardrailConfig {
    const config = new GuardrailConfig()
    config.id = data.id || uuidv4()
    config.configType = data.configType || GuardrailConfigType.SCANNER
    config.category = data.category || GuardrailCategory.GLOBAL
    config.key = data.key || ''
    config.value = data.value || ''
    config.description = data.description
    config.isEnabled = data.isEnabled !== undefined ? data.isEnabled : true
    config.priority = data.priority || 0
    config.appliesTo = data.appliesTo
    config.metadata = data.metadata
    config.createdBy = data.createdBy
    config.updatedBy = data.updatedBy
    return config
}

/**
 * Erstellt einen GuardrailAuditLog-Eintrag
 */
export function createGuardrailAuditLog(data: Partial<GuardrailAuditLog>): GuardrailAuditLog {
    const log = new GuardrailAuditLog()
    log.id = data.id || uuidv4()
    log.userId = data.userId
    log.sessionId = data.sessionId
    log.requestId = data.requestId
    log.direction = data.direction || AuditDirection.INPUT
    log.action = data.action || AuditAction.LOG
    log.category = data.category || ''
    log.detectionType = data.detectionType || ''
    log.severity = data.severity || AuditSeverity.INFO
    log.maskedValue = data.maskedValue
    log.confidence = data.confidence
    log.sourcePath = data.sourcePath
    log.sourceIp = data.sourceIp
    log.metadata = data.metadata
    log.processingTimeMs = data.processingTimeMs
    return log
}
