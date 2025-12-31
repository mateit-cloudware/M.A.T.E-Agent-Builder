/**
 * M.A.T.E. Audit Log Entity
 * 
 * S1.4b - Umfassendes Audit-Log-System mit Tamper-Proof Hashing
 * 
 * Features:
 * - Unveränderliche Protokollierung aller Systemaktivitäten
 * - SHA-256 Hash-Kette für Tamper-Proof Integrität
 * - Retention Policy Support (90/365 Tage)
 * - Export-Unterstützung (CSV, JSON)
 */

import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

// ==================== AUDIT LOG ENUMS ====================

/**
 * Kategorien von Audit-Ereignissen
 */
export enum AuditCategory {
    // Authentifizierung
    AUTH = 'auth',
    
    // Benutzerverwaltung
    USER = 'user',
    
    // Wallet & Billing
    WALLET = 'wallet',
    BILLING = 'billing',
    
    // LLM & AI
    LLM = 'llm',
    
    // Voice & VAPI
    VOICE = 'voice',
    
    // Agents & Chatflows
    AGENT = 'agent',
    CHATFLOW = 'chatflow',
    
    // Security
    SECURITY = 'security',
    
    // Admin-Aktionen
    ADMIN = 'admin',
    
    // Konfiguration
    CONFIG = 'config',
    
    // System
    SYSTEM = 'system',
    
    // Data Access
    DATA = 'data',
    
    // API
    API = 'api'
}

/**
 * Aktionstypen für Audit-Logs
 */
export enum AuditAction {
    // CRUD
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    
    // Auth
    LOGIN = 'login',
    LOGOUT = 'logout',
    LOGIN_FAILED = 'login_failed',
    PASSWORD_CHANGE = 'password_change',
    PASSWORD_RESET = 'password_reset',
    
    // User
    USER_CREATE = 'user_create',
    USER_UPDATE = 'user_update',
    USER_DELETE = 'user_delete',
    USER_SUSPEND = 'user_suspend',
    USER_ACTIVATE = 'user_activate',
    
    // Wallet
    WALLET_CREDIT = 'wallet_credit',
    WALLET_DEBIT = 'wallet_debit',
    WALLET_ADJUST = 'wallet_adjust',
    
    // Billing
    PAYMENT_RECEIVED = 'payment_received',
    PAYMENT_FAILED = 'payment_failed',
    INVOICE_GENERATED = 'invoice_generated',
    
    // LLM
    LLM_REQUEST = 'llm_request',
    LLM_RESPONSE = 'llm_response',
    LLM_ERROR = 'llm_error',
    
    // Voice
    CALL_START = 'call_start',
    CALL_END = 'call_end',
    CALL_BILLED = 'call_billed',
    
    // Security
    THREAT_DETECTED = 'threat_detected',
    THREAT_BLOCKED = 'threat_blocked',
    PII_DETECTED = 'pii_detected',
    INJECTION_ATTEMPT = 'injection_attempt',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    
    // Admin
    ADMIN_ACCESS = 'admin_access',
    CONFIG_CHANGE = 'config_change',
    
    // Data
    DATA_EXPORT = 'data_export',
    DATA_IMPORT = 'data_import',
    DATA_DELETE = 'data_delete',
    
    // API
    API_KEY_CREATE = 'api_key_create',
    API_KEY_REVOKE = 'api_key_revoke',
    
    // System
    SYSTEM_START = 'system_start',
    SYSTEM_SHUTDOWN = 'system_shutdown',
    BACKUP_CREATE = 'backup_create',
    BACKUP_RESTORE = 'backup_restore'
}

/**
 * Status des Audit-Eintrags
 */
export enum AuditStatus {
    SUCCESS = 'success',
    FAILURE = 'failure',
    PENDING = 'pending',
    BLOCKED = 'blocked'
}

/**
 * Risikostufe der Aktion
 */
export enum AuditRiskLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// ==================== AUDIT LOG ENTITY ====================

/**
 * AuditLog Entity
 * Speichert alle Audit-Ereignisse mit Hash-Chain für Tamper-Proof
 */
@Entity('mate_audit_log')
@Index(['createdAt'])
@Index(['userId', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['riskLevel', 'createdAt'])
export class AuditLog {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    // Sequenznummer für Hash-Kette
    @Column({ type: 'bigint', name: 'sequence_number' })
    @Index({ unique: true })
    sequenceNumber!: number

    // Zeitstempel (nicht veränderbar)
    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    @Index()
    createdAt: Date = new Date()

    // Kategorie des Ereignisses
    @Column({ type: 'varchar', length: 50 })
    @Index()
    category: AuditCategory = AuditCategory.SYSTEM

    // Aktion
    @Column({ type: 'varchar', length: 50 })
    @Index()
    action: AuditAction = AuditAction.READ

    // Status
    @Column({ type: 'varchar', length: 20, default: AuditStatus.SUCCESS })
    @Index()
    status: AuditStatus = AuditStatus.SUCCESS

    // Risikostufe
    @Column({ type: 'varchar', length: 20, name: 'risk_level', default: AuditRiskLevel.LOW })
    @Index()
    riskLevel: AuditRiskLevel = AuditRiskLevel.LOW

    // Benutzer (optional - System-Events haben keinen User)
    @Column({ type: 'varchar', length: 100, name: 'user_id', nullable: true })
    @Index()
    userId?: string

    // Username für lesbare Logs
    @Column({ type: 'varchar', length: 255, name: 'username', nullable: true })
    username?: string

    // Target User (bei Admin-Aktionen)
    @Column({ type: 'varchar', length: 100, name: 'target_user_id', nullable: true })
    targetUserId?: string

    // IP-Adresse
    @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
    ipAddress?: string

    // User Agent
    @Column({ type: 'varchar', length: 500, name: 'user_agent', nullable: true })
    userAgent?: string

    // Request-Path
    @Column({ type: 'varchar', length: 500, name: 'request_path', nullable: true })
    requestPath?: string

    // HTTP-Methode
    @Column({ type: 'varchar', length: 10, name: 'request_method', nullable: true })
    requestMethod?: string

    // Request-ID für Korrelation
    @Column({ type: 'varchar', length: 100, name: 'request_id', nullable: true })
    @Index()
    requestId?: string

    // Session-ID
    @Column({ type: 'varchar', length: 100, name: 'session_id', nullable: true })
    sessionId?: string

    // Ressourcen-Typ (chatflow, user, wallet, etc.)
    @Column({ type: 'varchar', length: 50, name: 'resource_type', nullable: true })
    resourceType?: string

    // Ressourcen-ID
    @Column({ type: 'varchar', length: 100, name: 'resource_id', nullable: true })
    resourceId?: string

    // Beschreibung der Aktion
    @Column({ type: 'text', nullable: true })
    description?: string

    // Details als JSON (nur nicht-sensible Daten)
    @Column({ type: 'text', nullable: true })
    details?: string  // JSON-String

    // Alte Werte bei Updates (für Audit-Trail)
    @Column({ type: 'text', name: 'old_values', nullable: true })
    oldValues?: string  // JSON-String

    // Neue Werte bei Updates
    @Column({ type: 'text', name: 'new_values', nullable: true })
    newValues?: string  // JSON-String

    // Response-Status-Code
    @Column({ type: 'int', name: 'response_status', nullable: true })
    responseStatus?: number

    // Fehlercode (bei Failure)
    @Column({ type: 'varchar', length: 50, name: 'error_code', nullable: true })
    errorCode?: string

    // Fehlermeldung
    @Column({ type: 'text', name: 'error_message', nullable: true })
    errorMessage?: string

    // Dauer in Millisekunden
    @Column({ type: 'int', name: 'duration_ms', nullable: true })
    durationMs?: number

    // ==================== TAMPER-PROOF HASHING ====================

    /**
     * SHA-256 Hash des vorherigen Eintrags
     * Bildet eine Hash-Kette für Integritätsprüfung
     */
    @Column({ type: 'varchar', length: 64, name: 'previous_hash' })
    previousHash: string = ''

    /**
     * SHA-256 Hash dieses Eintrags
     * Hash = SHA256(sequenceNumber + previousHash + data)
     */
    @Column({ type: 'varchar', length: 64, name: 'entry_hash' })
    @Index()
    entryHash: string = ''

    /**
     * Signatur-Zeitstempel (ISO 8601)
     * Wird beim Erstellen des Hashs festgelegt
     */
    @Column({ type: 'varchar', length: 30, name: 'hash_timestamp' })
    hashTimestamp: string = ''

    // ==================== RETENTION METADATA ====================

    /**
     * Retention-Kategorie
     * - 'standard': 90 Tage (normale Logs)
     * - 'extended': 365 Tage (Security, Compliance)
     * - 'permanent': Nie löschen (kritische Events)
     */
    @Column({ type: 'varchar', length: 20, name: 'retention_category', default: 'standard' })
    @Index()
    retentionCategory: 'standard' | 'extended' | 'permanent' = 'standard'

    /**
     * Ablaufdatum basierend auf Retention Policy
     */
    @Column({ type: 'timestamp', name: 'expires_at', nullable: true })
    @Index()
    expiresAt?: Date

    /**
     * Wurde dieser Log exportiert?
     */
    @Column({ type: 'boolean', name: 'exported', default: false })
    exported: boolean = false

    /**
     * Export-Zeitstempel
     */
    @Column({ type: 'timestamp', name: 'exported_at', nullable: true })
    exportedAt?: Date

    // ==================== HELPER METHODS ====================

    /**
     * Setzt die Details als JSON
     */
    setDetails(data: Record<string, any>): void {
        this.details = JSON.stringify(data)
    }

    /**
     * Gibt die Details als Objekt zurück
     */
    getDetails(): Record<string, any> {
        try {
            return this.details ? JSON.parse(this.details) : {}
        } catch {
            return {}
        }
    }

    /**
     * Setzt die alten Werte als JSON
     */
    setOldValues(data: Record<string, any>): void {
        this.oldValues = JSON.stringify(data)
    }

    /**
     * Gibt die alten Werte als Objekt zurück
     */
    getOldValues(): Record<string, any> {
        try {
            return this.oldValues ? JSON.parse(this.oldValues) : {}
        } catch {
            return {}
        }
    }

    /**
     * Setzt die neuen Werte als JSON
     */
    setNewValues(data: Record<string, any>): void {
        this.newValues = JSON.stringify(data)
    }

    /**
     * Gibt die neuen Werte als Objekt zurück
     */
    getNewValues(): Record<string, any> {
        try {
            return this.newValues ? JSON.parse(this.newValues) : {}
        } catch {
            return {}
        }
    }
}

// ==================== RETENTION SETTINGS ENTITY ====================

/**
 * Audit Retention Settings
 * Konfiguration für die Aufbewahrungsrichtlinien
 */
@Entity('mate_audit_retention_settings')
export class AuditRetentionSettings {
    @PrimaryColumn('varchar', { length: 50 })
    id: string = 'default'

    /**
     * Standard-Aufbewahrungsdauer in Tagen
     */
    @Column({ type: 'int', name: 'standard_retention_days', default: 90 })
    standardRetentionDays: number = 90

    /**
     * Erweiterte Aufbewahrungsdauer in Tagen (Security/Compliance)
     */
    @Column({ type: 'int', name: 'extended_retention_days', default: 365 })
    extendedRetentionDays: number = 365

    /**
     * Automatische Bereinigung aktiviert?
     */
    @Column({ type: 'boolean', name: 'auto_cleanup_enabled', default: true })
    autoCleanupEnabled: boolean = true

    /**
     * Letzte Bereinigung
     */
    @Column({ type: 'timestamp', name: 'last_cleanup_at', nullable: true })
    lastCleanupAt?: Date

    /**
     * Anzahl gelöschter Einträge bei letzter Bereinigung
     */
    @Column({ type: 'int', name: 'last_cleanup_count', default: 0 })
    lastCleanupCount: number = 0

    /**
     * Vor Löschung exportieren?
     */
    @Column({ type: 'boolean', name: 'export_before_delete', default: false })
    exportBeforeDelete: boolean = false

    /**
     * Export-Pfad
     */
    @Column({ type: 'varchar', length: 500, name: 'export_path', nullable: true })
    exportPath?: string

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt: Date = new Date()

    @Column({ type: 'timestamp', name: 'updated_at', nullable: true })
    updatedAt?: Date
}

// ==================== EXPORT HISTORY ENTITY ====================

/**
 * Audit Export History
 * Protokolliert alle Audit-Log-Exporte
 */
@Entity('mate_audit_export_history')
@Index(['createdAt'])
export class AuditExportHistory {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    /**
     * Format des Exports
     */
    @Column({ type: 'varchar', length: 10 })
    format: 'csv' | 'json' = 'json'

    /**
     * Zeitraum Start
     */
    @Column({ type: 'timestamp', name: 'period_start' })
    periodStart!: Date

    /**
     * Zeitraum Ende
     */
    @Column({ type: 'timestamp', name: 'period_end' })
    periodEnd!: Date

    /**
     * Anzahl exportierter Einträge
     */
    @Column({ type: 'int', name: 'entry_count', default: 0 })
    entryCount: number = 0

    /**
     * Dateigröße in Bytes
     */
    @Column({ type: 'bigint', name: 'file_size', default: 0 })
    fileSize: number = 0

    /**
     * Dateipfad oder Download-ID
     */
    @Column({ type: 'varchar', length: 500, name: 'file_path', nullable: true })
    filePath?: string

    /**
     * SHA-256 Hash der exportierten Datei
     */
    @Column({ type: 'varchar', length: 64, name: 'file_hash', nullable: true })
    fileHash?: string

    /**
     * Filter die beim Export verwendet wurden
     */
    @Column({ type: 'text', name: 'export_filters', nullable: true })
    exportFilters?: string  // JSON

    /**
     * Benutzer der den Export durchgeführt hat
     */
    @Column({ type: 'varchar', length: 100, name: 'exported_by', nullable: true })
    exportedBy?: string

    /**
     * Grund für den Export
     */
    @Column({ type: 'varchar', length: 500, name: 'export_reason', nullable: true })
    exportReason?: string

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt: Date = new Date()
}
