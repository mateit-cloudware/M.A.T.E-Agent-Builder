/**
 * M.A.T.E. GDPR Entities
 * 
 * Persistente Speicherung für DSGVO-Compliance:
 * - ConsentRecord: Einwilligungen
 * - DeletionRequest: Löschanfragen
 * - ProcessingRestriction: Verarbeitungseinschränkungen
 * - DataExportRequest: Datenexport-Anfragen
 */

import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

// ==================== CONSENT RECORD ====================

/**
 * Typen von Einwilligungen
 */
export enum ConsentType {
    ESSENTIAL = 'essential',
    ANALYTICS = 'analytics',
    MARKETING = 'marketing',
    THIRD_PARTY = 'third_party',
    AI_TRAINING = 'ai_training',
    DATA_SHARING = 'data_sharing',
    PERSONALIZATION = 'personalization'
}

/**
 * Status der Einwilligung
 */
export enum ConsentStatus {
    GRANTED = 'granted',
    DENIED = 'denied',
    WITHDRAWN = 'withdrawn',
    PENDING = 'pending',
    EXPIRED = 'expired'
}

/**
 * ConsentRecord Entity
 * Speichert alle Einwilligungen mit vollständigem Audit-Trail
 */
@Entity('mate_consent_record')
@Index(['userId', 'consentType'])
@Index(['userId', 'status'])
@Index(['createdAt'])
export class ConsentRecord {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId: string = ''

    @Column({ name: 'consent_type', type: 'varchar', length: 50 })
    consentType: ConsentType = ConsentType.ESSENTIAL

    @Column({ type: 'varchar', length: 20 })
    status: ConsentStatus = ConsentStatus.PENDING

    // Consent-Version für Compliance-Tracking
    @Column({ type: 'varchar', length: 20, default: '1.0' })
    version: string = '1.0'

    // Metadaten für Nachweis
    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress?: string

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string

    // Zeitstempel
    @Column({ name: 'granted_at', type: 'timestamp', nullable: true })
    grantedAt?: Date

    @Column({ name: 'withdrawn_at', type: 'timestamp', nullable: true })
    withdrawnAt?: Date

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt?: Date

    // Rechtsgrundlage und Zwecke
    @Column({ name: 'legal_basis', type: 'varchar', length: 255 })
    legalBasis: string = 'Art. 6 Abs. 1 lit. a DSGVO'

    @Column({ name: 'data_categories', type: 'simple-json', nullable: true })
    dataCategories?: string[]

    @Column({ type: 'simple-json', nullable: true })
    purposes?: string[]

    @Column({ name: 'third_parties', type: 'simple-json', nullable: true })
    thirdParties?: string[]

    // Zusätzliche Metadaten
    @Column({ type: 'simple-json', nullable: true })
    metadata?: Record<string, any>

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date = new Date()
}

// ==================== DATA EXPORT REQUEST ====================

/**
 * Datenexport-Format
 */
export enum DataExportFormat {
    JSON = 'json',
    CSV = 'csv',
    ZIP = 'zip'
}

/**
 * Export-Status
 */
export enum DataExportStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    EXPIRED = 'expired',
    DOWNLOADED = 'downloaded'
}

/**
 * DataExportRequest Entity
 * Verfolgt Datenexport-Anfragen (Art. 15 & 20 DSGVO)
 */
@Entity('mate_data_export_request')
@Index(['userId', 'status'])
@Index(['requestedAt'])
@Index(['expiresAt'])
export class DataExportRequest {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId: string = ''

    @Column({ type: 'varchar', length: 10 })
    format: DataExportFormat = DataExportFormat.ZIP

    @Column({ type: 'varchar', length: 20 })
    status: DataExportStatus = DataExportStatus.PENDING

    // Welche Datenkategorien exportiert werden
    @Column({ name: 'data_categories', type: 'simple-json', nullable: true })
    dataCategories?: string[]

    // Zeitstempel
    @Column({ name: 'requested_at', type: 'timestamp' })
    requestedAt: Date = new Date()

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt?: Date

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt?: Date

    @Column({ name: 'downloaded_at', type: 'timestamp', nullable: true })
    downloadedAt?: Date

    // Export-Details
    @Column({ name: 'download_url', type: 'varchar', length: 500, nullable: true })
    downloadUrl?: string

    @Column({ name: 'file_size', type: 'bigint', nullable: true })
    fileSize?: number

    @Column({ type: 'varchar', length: 64, nullable: true })
    checksum?: string

    // Verschlüsselung (Key wird separat übermittelt)
    @Column({ name: 'is_encrypted', type: 'boolean', default: false })
    isEncrypted: boolean = false

    // Fehler-Details
    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage?: string

    @Column({ type: 'simple-json', nullable: true })
    metadata?: Record<string, any>

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date = new Date()
}

// ==================== DELETION REQUEST ====================

/**
 * Löschanfrage-Status
 */
export enum DeletionRequestStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    PARTIALLY_COMPLETED = 'partially_completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

/**
 * Löschprotokoll-Eintrag
 */
export interface DeletionLogEntry {
    category: string
    itemCount: number
    deletedAt: string
    success: boolean
    error?: string
}

/**
 * DeletionRequest Entity
 * Verfolgt Datenlöschungsanfragen (Art. 17 DSGVO)
 */
@Entity('mate_deletion_request')
@Index(['userId', 'status'])
@Index(['scheduledAt'])
@Index(['requestedAt'])
export class DeletionRequest {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId: string = ''

    @Column({ type: 'varchar', length: 30 })
    status: DeletionRequestStatus = DeletionRequestStatus.PENDING

    // Zeitstempel
    @Column({ name: 'requested_at', type: 'timestamp' })
    requestedAt: Date = new Date()

    @Column({ name: 'scheduled_at', type: 'timestamp' })
    scheduledAt: Date = new Date()

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt?: Date

    // Zu löschende Kategorien
    @Column({ name: 'data_categories', type: 'simple-json', nullable: true })
    dataCategories?: string[]

    // Ausnahmen (gesetzliche Aufbewahrungspflicht)
    @Column({ name: 'retention_exceptions', type: 'simple-json', nullable: true })
    retentionExceptions?: string[]

    // Löschprotokoll
    @Column({ name: 'deletion_log', type: 'simple-json', nullable: true })
    deletionLog?: DeletionLogEntry[]

    // Stornierung
    @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
    cancellationReason?: string

    @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
    cancelledAt?: Date

    // Admin-Override (sofortige Löschung)
    @Column({ name: 'admin_override', type: 'boolean', default: false })
    adminOverride: boolean = false

    @Column({ name: 'admin_id', type: 'uuid', nullable: true })
    adminId?: string

    @Column({ type: 'simple-json', nullable: true })
    metadata?: Record<string, any>

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date = new Date()
}

// ==================== PROCESSING RESTRICTION ====================

/**
 * Einschränkungstypen
 */
export enum ProcessingRestrictionType {
    FULL = 'full',
    MARKETING_ONLY = 'marketing',
    ANALYTICS_ONLY = 'analytics',
    AI_TRAINING = 'ai_training'
}

/**
 * Gründe für Einschränkung
 */
export enum ProcessingRestrictionReason {
    USER_REQUEST = 'user_request',
    ACCURACY_DISPUTE = 'accuracy_dispute',
    UNLAWFUL_PROCESSING = 'unlawful_processing',
    LEGAL_CLAIMS = 'legal_claims',
    OBJECTION_PENDING = 'objection_pending'
}

/**
 * ProcessingRestriction Entity
 * Verfolgt Verarbeitungseinschränkungen (Art. 18 DSGVO)
 */
@Entity('mate_processing_restriction')
@Index(['userId', 'isActive'])
@Index(['startDate'])
export class ProcessingRestriction {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId: string = ''

    @Column({ name: 'restriction_type', type: 'varchar', length: 30 })
    restrictionType: ProcessingRestrictionType = ProcessingRestrictionType.FULL

    @Column({ type: 'varchar', length: 30 })
    reason: ProcessingRestrictionReason = ProcessingRestrictionReason.USER_REQUEST

    // Zeitraum
    @Column({ name: 'start_date', type: 'timestamp' })
    startDate: Date = new Date()

    @Column({ name: 'end_date', type: 'timestamp', nullable: true })
    endDate?: Date

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean = true

    // Betroffene Verarbeitungen
    @Column({ name: 'affected_processes', type: 'simple-json', nullable: true })
    affectedProcesses?: string[]

    // Notizen
    @Column({ type: 'text', nullable: true })
    notes?: string

    // Wer hat angefordert
    @Column({ name: 'requested_by', type: 'varchar', length: 20 })
    requestedBy: 'user' | 'admin' | 'system' = 'user'

    // Wer hat aufgehoben
    @Column({ name: 'lifted_by', type: 'varchar', length: 20, nullable: true })
    liftedBy?: 'user' | 'admin' | 'system'

    @Column({ type: 'simple-json', nullable: true })
    metadata?: Record<string, any>

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date = new Date()
}

// ==================== GDPR SETTINGS ====================

/**
 * GDPRSettings Entity
 * Speichert GDPR-Konfiguration
 */
@Entity('mate_gdpr_settings')
export class GDPRSettings {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ name: 'setting_key', type: 'varchar', length: 100, unique: true })
    settingKey: string = ''

    @Column({ name: 'setting_value', type: 'simple-json' })
    settingValue: any = {}

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ name: 'updated_by', type: 'uuid', nullable: true })
    updatedBy?: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date = new Date()
}

// ==================== COOKIE CONSENT LOG ====================

/**
 * CookieConsentLog Entity
 * Detailliertes Protokoll für Cookie-Einwilligungen (ePrivacy)
 */
@Entity('mate_cookie_consent_log')
@Index(['userId', 'createdAt'])
@Index(['sessionId'])
export class CookieConsentLog {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    // User oder Session ID (anonyme Besucher)
    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    userId?: string

    @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
    sessionId?: string

    // Consent-Daten
    @Column({ type: 'simple-json' })
    consents: Record<string, boolean> = {}

    // Banner-Interaktion
    @Column({ name: 'banner_shown_at', type: 'timestamp' })
    bannerShownAt: Date = new Date()

    @Column({ name: 'decision_made_at', type: 'timestamp', nullable: true })
    decisionMadeAt?: Date

    @Column({ name: 'decision_type', type: 'varchar', length: 30, nullable: true })
    decisionType?: 'accept_all' | 'reject_all' | 'customize' | 'dismiss'

    // Nachweis-Metadaten
    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress?: string

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string

    @Column({ type: 'varchar', length: 10, nullable: true })
    language?: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    country?: string

    // Banner-Version für Compliance
    @Column({ name: 'banner_version', type: 'varchar', length: 20, default: '1.0' })
    bannerVersion: string = '1.0'

    @Column({ name: 'policy_version', type: 'varchar', length: 20, default: '1.0' })
    policyVersion: string = '1.0'

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()
}
