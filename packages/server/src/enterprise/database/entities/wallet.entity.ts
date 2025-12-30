import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn, Check } from 'typeorm'
import { User } from './user.entity'

/**
 * Wallet Entity - Stores user balance for M.A.T.E. billing
 * 
 * SECURITY: All balance operations must use transactions with pessimistic locking
 * to prevent race conditions and ensure atomic updates.
 */
@Entity()
@Check(`"balance_cents" >= 0`)
export class Wallet {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid', unique: true, nullable: false })
    userId: string

    @OneToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User

    /**
     * Current balance in cents (1 EUR = 100 cents)
     * Using integer to avoid floating point precision issues
     */
    @Column({ type: 'int', default: 0, name: 'balance_cents' })
    balanceCents: number

    /**
     * Auto top-up settings
     */
    @Column({ type: 'boolean', default: false, name: 'auto_topup_enabled' })
    autoTopupEnabled: boolean

    @Column({ type: 'int', default: 500, name: 'auto_topup_threshold_cents' })
    autoTopupThresholdCents: number // €5.00 default

    @Column({ type: 'int', default: 2500, name: 'auto_topup_amount_cents' })
    autoTopupAmountCents: number // €25.00 default

    /**
     * Stripe integration
     */
    @Column({ type: 'varchar', length: 255, nullable: true, name: 'stripe_customer_id' })
    stripeCustomerId?: string

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'stripe_payment_method_id' })
    stripePaymentMethodId?: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date
}
