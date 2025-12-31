/**
 * M.A.T.E. Usage Record Entity
 * 
 * Detaillierte Aufzeichnung aller Nutzungsvorgänge für:
 * - LLM Token-Nutzung (Input/Output getrennt)
 * - Voice-Nutzung (Anrufdauer, Typ)
 * - Zuordnung zu Chatflows/Agents
 * - Preiskalkulation und Rabatte
 */

import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'

export enum UsageRecordType {
    LLM = 'llm',
    VOICE = 'voice',
    PHONE_NUMBER = 'phone_number',
    STORAGE = 'storage'
}

export enum UsageRecordStatus {
    PENDING = 'pending',      // Noch nicht abgerechnet
    CHARGED = 'charged',      // Erfolgreich abgerechnet
    FAILED = 'failed',        // Abrechnung fehlgeschlagen
    FREE = 'free',            // Kostenlos (z.B. im Free-Tier)
    REFUNDED = 'refunded'     // Erstattet
}

@Entity('usage_record')
export class UsageRecord {
    @PrimaryColumn('uuid')
    id: string

    @Index('idx_usage_user')
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string

    @Index('idx_usage_type')
    @Column({
        type: 'varchar',
        length: 20,
        name: 'usage_type'
    })
    usageType: UsageRecordType

    @Index('idx_usage_status')
    @Column({
        type: 'varchar',
        length: 20,
        default: UsageRecordStatus.PENDING
    })
    status: UsageRecordStatus

    // === LLM-spezifische Felder ===
    
    @Column({ name: 'model_name', type: 'varchar', length: 100, nullable: true })
    modelName?: string

    @Column({ name: 'input_tokens', type: 'int', default: 0 })
    inputTokens: number

    @Column({ name: 'output_tokens', type: 'int', default: 0 })
    outputTokens: number

    @Column({ name: 'total_tokens', type: 'int', default: 0 })
    totalTokens: number

    // === Voice-spezifische Felder ===

    @Column({ name: 'duration_seconds', type: 'int', default: 0 })
    durationSeconds: number

    @Column({ name: 'call_type', type: 'varchar', length: 20, nullable: true })
    callType?: 'inbound' | 'outbound'

    @Column({ name: 'call_id', type: 'varchar', length: 100, nullable: true })
    callId?: string

    @Column({ name: 'phone_number', type: 'varchar', length: 50, nullable: true })
    phoneNumber?: string

    // === Referenzen ===

    @Index('idx_usage_chatflow')
    @Column({ name: 'chatflow_id', type: 'uuid', nullable: true })
    chatflowId?: string

    @Column({ name: 'flow_id', type: 'uuid', nullable: true })
    flowId?: string

    @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
    sessionId?: string

    @Column({ name: 'assistant_id', type: 'varchar', length: 100, nullable: true })
    assistantId?: string

    // === Kosten und Abrechnung ===

    @Column({ name: 'base_cost_cents', type: 'int', default: 0 })
    baseCostCents: number

    @Column({ name: 'margin_cents', type: 'int', default: 0 })
    marginCents: number

    @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    discountPercent: number

    @Column({ name: 'discount_cents', type: 'int', default: 0 })
    discountCents: number

    @Column({ name: 'final_cost_cents', type: 'int', default: 0 })
    finalCostCents: number

    @Index('idx_usage_transaction')
    @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
    transactionId?: string

    // === Metadaten ===

    @Column({ name: 'metadata', type: 'simple-json', nullable: true })
    metadata?: Record<string, any>

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage?: string

    // === Zeitstempel ===

    @Index('idx_usage_created')
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date

    @Column({ name: 'charged_at', type: 'timestamp', nullable: true })
    chargedAt?: Date
}

/**
 * Monatliche Aggregation der Nutzung
 */
@Entity('usage_monthly_summary')
export class UsageMonthlySummary {
    @PrimaryColumn('uuid')
    id: string

    @Index('idx_monthly_user')
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string

    @Index('idx_monthly_period')
    @Column({ name: 'year', type: 'int' })
    year: number

    @Column({ name: 'month', type: 'int' })
    month: number

    // === Token-Nutzung ===

    @Column({ name: 'total_input_tokens', type: 'bigint', default: 0 })
    totalInputTokens: number

    @Column({ name: 'total_output_tokens', type: 'bigint', default: 0 })
    totalOutputTokens: number

    @Column({ name: 'total_tokens', type: 'bigint', default: 0 })
    totalTokens: number

    @Column({ name: 'llm_cost_cents', type: 'int', default: 0 })
    llmCostCents: number

    @Column({ name: 'llm_requests', type: 'int', default: 0 })
    llmRequests: number

    // === Voice-Nutzung ===

    @Column({ name: 'total_voice_seconds', type: 'int', default: 0 })
    totalVoiceSeconds: number

    @Column({ name: 'voice_cost_cents', type: 'int', default: 0 })
    voiceCostCents: number

    @Column({ name: 'voice_calls', type: 'int', default: 0 })
    voiceCalls: number

    // === Rabatte ===

    @Column({ name: 'token_discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    tokenDiscountPercent: number

    @Column({ name: 'voice_discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    voiceDiscountPercent: number

    @Column({ name: 'total_discount_cents', type: 'int', default: 0 })
    totalDiscountCents: number

    // === Gesamt ===

    @Column({ name: 'total_cost_cents', type: 'int', default: 0 })
    totalCostCents: number

    // === Top-Modelle (JSON) ===

    @Column({ name: 'top_models', type: 'simple-json', nullable: true })
    topModels?: Array<{ model: string; tokens: number; costCents: number }>

    // === Zeitstempel ===

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date
}

/**
 * Preiskonfiguration (für Admin-Dashboard editierbar)
 */
@Entity('pricing_config')
export class PricingConfiguration {
    @PrimaryColumn('uuid')
    id: string

    @Column({ name: 'config_key', type: 'varchar', length: 100, unique: true })
    configKey: string

    @Column({ name: 'config_value', type: 'simple-json' })
    configValue: Record<string, any>

    @Column({ name: 'description', type: 'text', nullable: true })
    description?: string

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date

    @Column({ name: 'updated_by', type: 'uuid', nullable: true })
    updatedBy?: string
}
