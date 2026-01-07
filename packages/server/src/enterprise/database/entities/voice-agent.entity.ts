/**
 * M.A.T.E. Voice Agent Entity
 * 
 * Phase 4.1.1: Voice-Agent Entity für VAPI-Integration
 * 
 * Speichert VAPI Voice Agents mit automatischer Synchronisation
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

export enum VoiceAgentStatus {
    DRAFT = 'draft',           // Erstellt, noch nicht deployed
    ACTIVE = 'active',         // Deployed und aktiv
    PAUSED = 'paused',         // Pausiert
    SYNCING = 'syncing',       // Wird gerade mit VAPI synchronisiert
    SYNC_ERROR = 'sync_error', // Sync fehlgeschlagen
    DELETED = 'deleted'        // Gelöscht
}

export enum VoiceProvider {
    VAPI = 'vapi',
    TWILIO = 'twilio',
    CUSTOM = 'custom'
}

@Entity('voice_agents')
export class VoiceAgent {
    @PrimaryGeneratedColumn('uuid')
    id: string

    /**
     * Reference to Chatflow ID
     * Links to chatflows table
     */
    @Column({ type: 'uuid' })
    @Index()
    chatflowId: string

    /**
     * User who created this voice agent
     */
    @Column({ type: 'uuid' })
    @Index()
    userId: string

    /**
     * Voice agent name
     */
    @Column({ type: 'varchar', length: 255 })
    name: string

    /**
     * Description of what this voice agent does
     */
    @Column({ type: 'text', nullable: true })
    description: string

    /**
     * Current status
     */
    @Column({
        type: 'enum',
        enum: VoiceAgentStatus,
        default: VoiceAgentStatus.DRAFT
    })
    status: VoiceAgentStatus

    /**
     * Voice provider (VAPI, Twilio, etc.)
     */
    @Column({
        type: 'enum',
        enum: VoiceProvider,
        default: VoiceProvider.VAPI
    })
    provider: VoiceProvider

    /**
     * VAPI Assistant ID (from VAPI API)
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    @Index()
    vapiAssistantId: string

    /**
     * VAPI Phone Number ID (if booked)
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    vapiPhoneNumberId: string

    /**
     * Assigned phone number (E.164 format)
     */
    @Column({ type: 'varchar', length: 20, nullable: true })
    @Index()
    phoneNumber: string

    /**
     * Voice configuration as JSON
     * Includes: voice model, language, speed, etc.
     */
    @Column({ type: 'text', nullable: true })
    voiceConfig: string

    /**
     * First message to say when call starts
     */
    @Column({ type: 'text', nullable: true })
    firstMessage: string

    /**
     * System prompt for the voice agent
     */
    @Column({ type: 'text', nullable: true })
    systemPrompt: string

    /**
     * Last sync timestamp with VAPI
     */
    @Column({ type: 'timestamp', nullable: true })
    lastSyncedAt: Date

    /**
     * Sync error message if sync failed
     */
    @Column({ type: 'text', nullable: true })
    syncErrorMessage: string

    /**
     * Total number of calls received
     */
    @Column({ type: 'int', default: 0 })
    totalCalls: number

    /**
     * Total call duration in seconds
     */
    @Column({ type: 'int', default: 0 })
    totalCallDurationSeconds: number

    /**
     * Total cost in cents for all calls
     */
    @Column({ type: 'int', default: 0 })
    totalCostCents: number

    /**
     * Monthly phone number fee in cents (e.g., 500 for 5 EUR)
     */
    @Column({ type: 'int', default: 500 })
    monthlyPhoneFeeCents: number

    /**
     * Last billing date for phone number
     */
    @Column({ type: 'timestamp', nullable: true })
    lastBilledAt: Date

    /**
     * Is auto-sync enabled?
     * If true, changes to chatflow will automatically sync to VAPI
     */
    @Column({ type: 'boolean', default: true })
    autoSync: boolean

    /**
     * Is this voice agent active/deployed?
     */
    @Column({ type: 'boolean', default: false })
    isDeployed: boolean

    /**
     * Additional metadata as JSON
     */
    @Column({ type: 'text', nullable: true })
    metadata: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date
}
