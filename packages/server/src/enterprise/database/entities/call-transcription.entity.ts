import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './user.entity'

/**
 * Call Transcription Entity - Stores voice call transcripts and AI summaries
 * 
 * Features:
 * - Full call transcript storage
 * - AI-generated summaries
 * - Call metadata (duration, status, etc.)
 * - Search and filter capabilities
 */
@Entity('call_transcription')
export class CallTranscription {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid', nullable: false, name: 'user_id' })
    @Index()
    userId: string

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User

    /**
     * VAPI Call ID for reference
     */
    @Column({ type: 'varchar', length: 255, nullable: true, name: 'vapi_call_id' })
    @Index()
    vapiCallId?: string

    /**
     * Agent/Assistant that handled the call
     */
    @Column({ type: 'varchar', length: 255, nullable: true, name: 'agent_id' })
    agentId?: string

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'agent_name' })
    agentName?: string

    /**
     * Caller information
     */
    @Column({ type: 'varchar', length: 50, nullable: true, name: 'caller_phone' })
    callerPhone?: string

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'caller_name' })
    callerName?: string

    /**
     * Call status
     */
    @Column({
        type: 'varchar',
        length: 50,
        default: 'completed',
        name: 'call_status'
    })
    callStatus: 'in_progress' | 'completed' | 'failed' | 'missed'

    /**
     * Call direction
     */
    @Column({
        type: 'varchar',
        length: 20,
        default: 'inbound',
        name: 'call_direction'
    })
    callDirection: 'inbound' | 'outbound'

    /**
     * Call duration in seconds
     */
    @Column({ type: 'int', default: 0, name: 'duration_seconds' })
    durationSeconds: number

    /**
     * Full transcript as text
     */
    @Column({ type: 'text', nullable: true })
    transcript?: string

    /**
     * Structured messages (JSON array of role/content pairs)
     */
    @Column({ type: 'simple-json', nullable: true })
    messages?: Array<{
        role: 'user' | 'assistant' | 'system'
        content: string
        timestamp?: string
    }>

    /**
     * AI-generated summary of the call
     */
    @Column({ type: 'text', nullable: true })
    summary?: string

    /**
     * Key topics/tags extracted from the call
     */
    @Column({ type: 'simple-json', nullable: true })
    tags?: string[]

    /**
     * Sentiment analysis result
     */
    @Column({
        type: 'varchar',
        length: 20,
        nullable: true
    })
    sentiment?: 'positive' | 'neutral' | 'negative'

    /**
     * Action items extracted from the call
     */
    @Column({ type: 'simple-json', nullable: true, name: 'action_items' })
    actionItems?: string[]

    /**
     * Call ended reason (from VAPI)
     */
    @Column({ type: 'varchar', length: 100, nullable: true, name: 'ended_reason' })
    endedReason?: string

    /**
     * Cost of this call in cents
     */
    @Column({ type: 'int', default: 0, name: 'cost_cents' })
    costCents: number

    /**
     * When the call started
     */
    @Column({ type: 'timestamp', nullable: true, name: 'call_started_at' })
    callStartedAt?: Date

    /**
     * When the call ended
     */
    @Column({ type: 'timestamp', nullable: true, name: 'call_ended_at' })
    callEndedAt?: Date

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date
}
