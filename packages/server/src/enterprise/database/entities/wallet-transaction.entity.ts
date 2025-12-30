import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm'
import { Wallet } from './wallet.entity'

/**
 * Transaction types for wallet operations
 */
export enum WalletTransactionType {
    TOPUP = 'TOPUP',           // Manual top-up via Stripe
    AUTO_TOPUP = 'AUTO_TOPUP', // Automatic top-up
    USAGE = 'USAGE',           // Usage deduction (Voice/LLM)
    REFUND = 'REFUND'          // Refund
}

/**
 * Usage types for billing differentiation
 */
export enum UsageType {
    VOICE = 'VOICE',   // Voice minutes (€1.50/min)
    LLM = 'LLM'        // LLM tokens (€0.03/1K tokens)
}

/**
 * WalletTransaction Entity - Tracks all wallet movements
 * 
 * SECURITY: Immutable audit log - transactions should never be modified or deleted
 * COMPLIANCE: Provides full audit trail for billing disputes
 */
@Entity({ name: 'wallet_transaction' })
@Index(['walletId', 'createdAt'])
@Index(['usageType', 'createdAt'])
export class WalletTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid', nullable: false, name: 'wallet_id' })
    walletId: string

    @ManyToOne(() => Wallet)
    @JoinColumn({ name: 'wallet_id' })
    wallet: Wallet

    /**
     * Transaction type: TOPUP, AUTO_TOPUP, USAGE, REFUND
     */
    @Column({ type: 'varchar', length: 20, nullable: false })
    type: WalletTransactionType

    /**
     * Usage type: VOICE or LLM (null for top-ups)
     */
    @Column({ type: 'varchar', length: 10, nullable: true, name: 'usage_type' })
    usageType?: UsageType

    /**
     * Amount in cents (positive = credit, negative = debit)
     */
    @Column({ type: 'int', nullable: false, name: 'amount_cents' })
    amountCents: number

    /**
     * Balance after this transaction
     */
    @Column({ type: 'int', nullable: false, name: 'balance_after_cents' })
    balanceAfterCents: number

    /**
     * Voice usage: duration in seconds
     */
    @Column({ type: 'int', nullable: true, name: 'voice_seconds' })
    voiceSeconds?: number

    /**
     * LLM usage: number of tokens consumed
     */
    @Column({ type: 'int', nullable: true, name: 'tokens_used' })
    tokensUsed?: number

    /**
     * Reference to the flow/chatflow that generated this usage
     */
    @Column({ type: 'varchar', length: 255, nullable: true, name: 'flow_id' })
    flowId?: string

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'chatflow_id' })
    chatflowId?: string

    /**
     * Voice call reference
     */
    @Column({ type: 'varchar', length: 255, nullable: true, name: 'call_id' })
    callId?: string

    /**
     * LLM model used
     */
    @Column({ type: 'varchar', length: 100, nullable: true, name: 'model_name' })
    modelName?: string

    /**
     * Human-readable description
     */
    @Column({ type: 'text', nullable: true })
    description?: string

    /**
     * Stripe payment reference (for top-ups)
     */
    @Column({ type: 'varchar', length: 255, nullable: true, name: 'stripe_payment_id' })
    stripePaymentId?: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date
}
