import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity'

/**
 * M.A.T.E. Token Usage Entity
 * 
 * Speichert detaillierte Token-Nutzung pro LLM-Anfrage.
 * Ermöglicht Abrechnung und Analytics auf Token-Basis.
 */
@Entity('token_usage')
export class TokenUsage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid' })
    @Index()
    userId: string

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User

    @Column({ type: 'uuid', nullable: true })
    @Index()
    workspaceId: string

    @Column({ type: 'uuid', nullable: true })
    @Index()
    chatflowId: string

    @Column({ type: 'varchar', length: 100 })
    @Index()
    model: string

    @Column({ type: 'int', default: 0 })
    promptTokens: number

    @Column({ type: 'int', default: 0 })
    completionTokens: number

    @Column({ type: 'int', default: 0 })
    totalTokens: number

    @Column({ type: 'int', default: 0 })
    costCents: number

    @Column({ type: 'int', default: 0 })
    inputCostCents: number

    @Column({ type: 'int', default: 0 })
    outputCostCents: number

    @Column({ type: 'varchar', length: 50, default: 'chat_completion' })
    @Index()
    requestType: string // 'chat_completion' | 'embedding' | 'transcription' | 'tts'

    @Column({ type: 'varchar', length: 255, nullable: true })
    sessionId: string

    @Column({ type: 'int', default: 0 })
    latencyMs: number

    @Column({ type: 'boolean', default: true })
    success: boolean

    @Column({ type: 'varchar', length: 500, nullable: true })
    errorMessage: string

    @CreateDateColumn()
    @Index()
    createdAt: Date
}

/**
 * Aggregierte Token-Statistiken für Reports
 */
export interface TokenUsageStats {
    userId: string
    period: 'day' | 'week' | 'month'
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
    totalCostCents: number
    requestCount: number
    successRate: number
    avgLatencyMs: number
    topModels: Array<{
        model: string
        tokens: number
        costCents: number
    }>
}
