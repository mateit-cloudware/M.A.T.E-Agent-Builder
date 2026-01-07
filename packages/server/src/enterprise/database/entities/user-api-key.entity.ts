/**
 * M.A.T.E. UserAPIKey Entity
 * 
 * Speichert verschlüsselte API-Keys für BYOK (Bring Your Own Key) Szenario.
 * Unterstützt verschiedene Provider (OpenRouter, OpenAI, etc.)
 * 
 * Security Features:
 * - AES-256-GCM Verschlüsselung
 * - SHA-256 Key-Hash für Duplicate-Check
 * - Expiration-Support
 * - Status-Tracking
 * - Audit-Trail (createdAt, updatedAt, lastValidated)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

export enum ApiKeyProvider {
    OPENROUTER = 'openrouter',
    OPENAI = 'openai',
    ANTHROPIC = 'anthropic',
    GOOGLE = 'google',
    CUSTOM = 'custom'
}

export enum ApiKeyStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    REVOKED = 'revoked',
    SUSPENDED = 'suspended',
    PENDING_VALIDATION = 'pending_validation'
}

@Entity()
export class UserAPIKey {
    @PrimaryGeneratedColumn('uuid')
    id: string

    /**
     * User ID (Foreign Key)
     */
    @Column({ type: 'uuid' })
    @Index()
    userId: string

    /**
     * API Provider (OpenRouter, OpenAI, etc.)
     */
    @Column({ 
        type: 'enum',
        enum: ApiKeyProvider,
        default: ApiKeyProvider.OPENROUTER
    })
    provider: ApiKeyProvider

    /**
     * Benutzerfreundlicher Name für den Key
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    name?: string

    /**
     * Verschlüsselter API-Key (AES-256-GCM)
     * Format: v2:iv:authTag:ciphertext
     */
    @Column({ type: 'text' })
    encryptedKey: string

    /**
     * Initialization Vector (für AES-256-GCM)
     * Wird separat gespeichert für bessere Query-Performance
     */
    @Column({ type: 'text' })
    iv: string

    /**
     * Authentication Tag (für AES-256-GCM)
     */
    @Column({ type: 'text', nullable: true })
    authTag?: string

    /**
     * SHA-256 Hash des Keys (für Duplicate-Check ohne Decryption)
     */
    @Column({ type: 'varchar', length: 64 })
    @Index()
    keyHash: string

    /**
     * Zeitpunkt der letzten erfolgreichen Validierung
     */
    @Column({ type: 'timestamp', nullable: true })
    lastValidated?: Date

    /**
     * Zeitpunkt der letzten Verwendung
     */
    @Column({ type: 'timestamp', nullable: true })
    lastUsed?: Date

    /**
     * Ablaufdatum (optional, für automatische Key-Rotation)
     */
    @Column({ type: 'timestamp', nullable: true })
    expiresAt?: Date

    /**
     * Status des API-Keys
     */
    @Column({ 
        type: 'enum',
        enum: ApiKeyStatus,
        default: ApiKeyStatus.ACTIVE
    })
    status: ApiKeyStatus

    /**
     * Geschätztes Guthaben beim Provider (optional)
     * Wird bei Validierung abgefragt
     */
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    estimatedBalance?: number

    /**
     * Währung des Guthabens
     */
    @Column({ type: 'varchar', length: 3, nullable: true, default: 'USD' })
    currency?: string

    /**
     * Fehler bei letzter Validierung
     */
    @Column({ type: 'text', nullable: true })
    lastValidationError?: string

    /**
     * Anzahl der fehlgeschlagenen Validierungsversuche
     */
    @Column({ type: 'int', default: 0 })
    failedValidationAttempts: number

    /**
     * Metadata (JSON)
     * Kann zusätzliche Informationen enthalten wie:
     * - Rate-Limits
     * - Provider-spezifische Einstellungen
     * - Custom-Endpoints
     */
    @Column({ type: 'simple-json', nullable: true })
    metadata?: {
        rateLimit?: {
            requestsPerMinute?: number
            tokensPerMinute?: number
        }
        customEndpoint?: string
        notes?: string
        [key: string]: any
    }

    /**
     * Audit-Trail: Erstellungszeitpunkt
     */
    @CreateDateColumn()
    createdAt: Date

    /**
     * Audit-Trail: Letzte Aktualisierung
     */
    @UpdateDateColumn()
    updatedAt: Date

    /**
     * Soft-Delete: Gelöschter Zeitpunkt
     */
    @Column({ type: 'timestamp', nullable: true })
    deletedAt?: Date

    // ==================== COMPUTED PROPERTIES ====================

    /**
     * Prüft ob der Key abgelaufen ist
     */
    get isExpired(): boolean {
        if (!this.expiresAt) return false
        return new Date() > this.expiresAt
    }

    /**
     * Prüft ob der Key aktiv ist
     */
    get isActive(): boolean {
        return this.status === ApiKeyStatus.ACTIVE && !this.isExpired && !this.deletedAt
    }

    /**
     * Gibt den maskierten Key zurück (für Anzeige)
     */
    get maskedKey(): string {
        return '••••••••••••'
    }

    /**
     * Tage bis zum Ablauf
     */
    get daysUntilExpiration(): number | null {
        if (!this.expiresAt) return null
        const diff = this.expiresAt.getTime() - new Date().getTime()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    /**
     * Warnung wenn Key bald abläuft (< 7 Tage)
     */
    get expirationWarning(): boolean {
        const days = this.daysUntilExpiration
        return days !== null && days <= 7 && days > 0
    }
}
