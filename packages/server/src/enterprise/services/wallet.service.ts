import { StatusCodes } from 'http-status-codes'
import { DataSource, QueryRunner } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { generateId } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { Wallet } from '../database/entities/wallet.entity'
import { WalletTransaction, WalletTransactionType, UsageType } from '../database/entities/wallet-transaction.entity'
import { isInvalidUUID } from '../utils/validation.util'
import { UserErrorMessage, UserService } from './user.service'

/**
 * Pricing configuration for M.A.T.E. billing
 * All prices in cents to avoid floating point issues
 */
export const PricingConfig = {
    // Voice pricing: €1.50 per minute = 150 cents per minute = 2.5 cents per second
    VOICE_CENTS_PER_MINUTE: 150,
    VOICE_CENTS_PER_SECOND: 2.5,
    
    // LLM pricing: €0.03 per 1000 tokens = 3 cents per 1000 tokens = 0.003 cents per token
    LLM_CENTS_PER_1K_TOKENS: 3,
    
    // Minimum top-up amount: €10 = 1000 cents
    MINIMUM_TOPUP_CENTS: 1000,
    
    // Default auto-topup settings
    DEFAULT_AUTO_TOPUP_THRESHOLD_CENTS: 500,  // €5.00
    DEFAULT_AUTO_TOPUP_AMOUNT_CENTS: 2500,    // €25.00
    
    // Initial free credits for new users: €10 = 1000 cents (100 Credits)
    INITIAL_FREE_CREDITS_CENTS: 1000,
}

export const enum WalletErrorMessage {
    INVALID_WALLET_ID = 'Invalid Wallet Id',
    INVALID_USER_ID = 'Invalid User Id',
    WALLET_NOT_FOUND = 'Wallet Not Found',
    WALLET_ALREADY_EXISTS = 'Wallet Already Exists For This User',
    INSUFFICIENT_BALANCE = 'Insufficient Balance',
    INVALID_AMOUNT = 'Invalid Amount',
    MINIMUM_TOPUP_REQUIRED = 'Minimum top-up amount is €10.00',
    BALANCE_UPDATE_FAILED = 'Balance Update Failed'
}

/**
 * WalletService - Manages user wallets and billing for M.A.T.E.
 * 
 * SECURITY NOTES:
 * - All balance operations use pessimistic locking to prevent race conditions
 * - Transactions are atomic - either complete fully or rollback
 * - All operations are logged in wallet_transaction for audit trail
 * 
 * PRICING MODEL:
 * - Voice: €1.50/minute (billed per second)
 * - LLM: €0.03/1K tokens
 * - Minimum top-up: €10
 */
export class WalletService {
    private dataSource: DataSource
    private userService: UserService

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.userService = new UserService()
    }

    // ==================== VALIDATION ====================

    public validateWalletId(id: string | undefined) {
        if (isInvalidUUID(id)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WalletErrorMessage.INVALID_WALLET_ID)
        }
    }

    public validateUserId(userId: string | undefined) {
        if (isInvalidUUID(userId)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WalletErrorMessage.INVALID_USER_ID)
        }
    }

    public validateAmount(amountCents: number) {
        if (!Number.isInteger(amountCents) || amountCents <= 0) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WalletErrorMessage.INVALID_AMOUNT)
        }
    }

    // ==================== READ OPERATIONS ====================

    public async readWalletById(id: string, queryRunner: QueryRunner): Promise<Wallet | null> {
        this.validateWalletId(id)
        return await queryRunner.manager.findOneBy(Wallet, { id })
    }

    public async readWalletByUserId(userId: string, queryRunner: QueryRunner): Promise<Wallet | null> {
        this.validateUserId(userId)
        return await queryRunner.manager.findOneBy(Wallet, { userId })
    }

    /**
     * Get wallet with pessimistic lock for balance operations
     * CRITICAL: Use this for any operation that modifies balance
     */
    public async readWalletForUpdate(userId: string, queryRunner: QueryRunner): Promise<Wallet | null> {
        this.validateUserId(userId)
        return await queryRunner.manager.findOne(Wallet, {
            where: { userId },
            lock: { mode: 'pessimistic_write' }
        })
    }

    public async getWalletBalance(userId: string): Promise<{ balanceCents: number; balanceEur: number }> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        
        try {
            const wallet = await this.readWalletByUserId(userId, queryRunner)
            if (!wallet) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WalletErrorMessage.WALLET_NOT_FOUND)
            }
            
            return {
                balanceCents: wallet.balanceCents,
                balanceEur: wallet.balanceCents / 100
            }
        } finally {
            await queryRunner.release()
        }
    }

    // ==================== CREATE OPERATIONS ====================

    /**
     * Create a new wallet for a user
     * Called automatically when a user is created
     * Includes initial free credits (€10) as signup bonus
     */
    public async createWallet(userId: string): Promise<Wallet> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            // Validate user exists
            const user = await this.userService.readUserById(userId, queryRunner)
            if (!user) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, UserErrorMessage.USER_NOT_FOUND)
            }

            // Check if wallet already exists
            const existingWallet = await this.readWalletByUserId(userId, queryRunner)
            if (existingWallet) {
                throw new InternalFlowiseError(StatusCodes.CONFLICT, WalletErrorMessage.WALLET_ALREADY_EXISTS)
            }

            await queryRunner.startTransaction()

            // Create wallet with initial free credits
            const initialBalance = PricingConfig.INITIAL_FREE_CREDITS_CENTS
            const wallet = queryRunner.manager.create(Wallet, {
                id: generateId(),
                userId,
                balanceCents: initialBalance,
                autoTopupEnabled: false,
                autoTopupThresholdCents: PricingConfig.DEFAULT_AUTO_TOPUP_THRESHOLD_CENTS,
                autoTopupAmountCents: PricingConfig.DEFAULT_AUTO_TOPUP_AMOUNT_CENTS
            })

            await queryRunner.manager.save(Wallet, wallet)

            // Create signup bonus transaction record
            const transaction = queryRunner.manager.create(WalletTransaction, {
                id: generateId(),
                walletId: wallet.id,
                type: WalletTransactionType.SIGNUP_BONUS,
                amountCents: initialBalance,
                balanceAfterCents: initialBalance,
                description: `Signup bonus: €${(initialBalance / 100).toFixed(2)} free credits`
            })

            await queryRunner.manager.save(WalletTransaction, transaction)
            await queryRunner.commitTransaction()

            logger.info(`Created wallet for user ${userId} with €${(initialBalance / 100).toFixed(2)} signup bonus`)

            return wallet
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Get or create wallet for a user
     * Ensures every user has a wallet
     */
    public async getOrCreateWallet(userId: string): Promise<Wallet> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            let wallet = await this.readWalletByUserId(userId, queryRunner)
            if (!wallet) {
                await queryRunner.release()
                wallet = await this.createWallet(userId)
            } else {
                await queryRunner.release()
            }
            return wallet
        } catch (error) {
            if (!queryRunner.isReleased) {
                await queryRunner.release()
            }
            throw error
        }
    }

    // ==================== BALANCE OPERATIONS ====================

    /**
     * Add balance to wallet (for top-ups)
     * Minimum top-up amount: €10 (1000 cents)
     */
    public async addBalance(
        userId: string,
        amountCents: number,
        transactionType: WalletTransactionType = WalletTransactionType.TOPUP,
        stripePaymentId?: string,
        description?: string
    ): Promise<Wallet> {
        this.validateAmount(amountCents)
        
        if (transactionType === WalletTransactionType.TOPUP && amountCents < PricingConfig.MINIMUM_TOPUP_CENTS) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WalletErrorMessage.MINIMUM_TOPUP_REQUIRED)
        }

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            await queryRunner.startTransaction()

            // Lock wallet for update
            const wallet = await this.readWalletForUpdate(userId, queryRunner)
            if (!wallet) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WalletErrorMessage.WALLET_NOT_FOUND)
            }

            // Update balance
            const newBalance = wallet.balanceCents + amountCents
            wallet.balanceCents = newBalance

            await queryRunner.manager.save(Wallet, wallet)

            // Create transaction record
            const transaction = queryRunner.manager.create(WalletTransaction, {
                id: generateId(),
                walletId: wallet.id,
                type: transactionType,
                amountCents: amountCents,  // Positive for credits
                balanceAfterCents: newBalance,
                stripePaymentId,
                description: description || `Top-up: €${(amountCents / 100).toFixed(2)}`
            })

            await queryRunner.manager.save(WalletTransaction, transaction)
            await queryRunner.commitTransaction()

            return wallet
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Deduct balance for usage
     * Returns true if deduction successful, throws error if insufficient balance
     */
    public async deductBalance(
        userId: string,
        amountCents: number,
        usageType: UsageType,
        metadata: {
            voiceSeconds?: number
            tokensUsed?: number
            flowId?: string
            chatflowId?: string
            callId?: string
            modelName?: string
            description?: string
        } = {}
    ): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
        this.validateAmount(amountCents)

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            await queryRunner.startTransaction()

            // Lock wallet for update
            const wallet = await this.readWalletForUpdate(userId, queryRunner)
            if (!wallet) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WalletErrorMessage.WALLET_NOT_FOUND)
            }

            // Check sufficient balance
            if (wallet.balanceCents < amountCents) {
                throw new InternalFlowiseError(StatusCodes.PAYMENT_REQUIRED, WalletErrorMessage.INSUFFICIENT_BALANCE)
            }

            // Update balance
            const newBalance = wallet.balanceCents - amountCents
            wallet.balanceCents = newBalance

            await queryRunner.manager.save(Wallet, wallet)

            // Create transaction record
            const transaction = queryRunner.manager.create(WalletTransaction, {
                id: generateId(),
                walletId: wallet.id,
                type: WalletTransactionType.USAGE,
                usageType,
                amountCents: -amountCents,  // Negative for debits
                balanceAfterCents: newBalance,
                voiceSeconds: metadata.voiceSeconds,
                tokensUsed: metadata.tokensUsed,
                flowId: metadata.flowId,
                chatflowId: metadata.chatflowId,
                callId: metadata.callId,
                modelName: metadata.modelName,
                description: metadata.description || this.generateUsageDescription(usageType, metadata)
            })

            await queryRunner.manager.save(WalletTransaction, transaction)
            await queryRunner.commitTransaction()

            // Check if auto-topup should be triggered
            if (wallet.autoTopupEnabled && newBalance <= wallet.autoTopupThresholdCents) {
                // Trigger auto-topup asynchronously (don't await)
                this.triggerAutoTopup(userId, wallet.autoTopupAmountCents).catch(err => {
                    logger.error('Auto-topup failed:', err)
                })
            }

            return {
                success: true,
                newBalance,
                transactionId: transaction.id
            }
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Check if user has sufficient balance for an operation
     */
    public async hasBalance(userId: string, requiredCents: number): Promise<boolean> {
        try {
            const { balanceCents } = await this.getWalletBalance(userId)
            return balanceCents >= requiredCents
        } catch (error) {
            return false
        }
    }

    // ==================== USAGE CALCULATION ====================

    /**
     * Calculate cost for voice usage
     * @param seconds - Duration in seconds
     * @returns Cost in cents
     */
    public calculateVoiceCost(seconds: number): number {
        return Math.ceil(seconds * PricingConfig.VOICE_CENTS_PER_SECOND)
    }

    /**
     * Calculate cost for LLM usage
     * @param tokens - Number of tokens used
     * @returns Cost in cents
     */
    public calculateLLMCost(tokens: number): number {
        return Math.ceil((tokens / 1000) * PricingConfig.LLM_CENTS_PER_1K_TOKENS)
    }

    /**
     * Charge for voice usage
     */
    public async chargeVoiceUsage(
        userId: string,
        seconds: number,
        callId?: string,
        chatflowId?: string
    ): Promise<{ costCents: number; newBalance: number; transactionId: string }> {
        const costCents = this.calculateVoiceCost(seconds)
        
        const result = await this.deductBalance(userId, costCents, UsageType.VOICE, {
            voiceSeconds: seconds,
            callId,
            chatflowId
        })

        return {
            costCents,
            newBalance: result.newBalance,
            transactionId: result.transactionId
        }
    }

    /**
     * Charge for LLM usage
     */
    public async chargeLLMUsage(
        userId: string,
        tokens: number,
        modelName?: string,
        chatflowId?: string
    ): Promise<{ costCents: number; newBalance: number; transactionId: string }> {
        const costCents = this.calculateLLMCost(tokens)
        
        const result = await this.deductBalance(userId, costCents, UsageType.LLM, {
            tokensUsed: tokens,
            modelName,
            chatflowId
        })

        return {
            costCents,
            newBalance: result.newBalance,
            transactionId: result.transactionId
        }
    }

    // ==================== AUTO-TOPUP ====================

    /**
     * Update auto-topup settings
     */
    public async updateAutoTopupSettings(
        userId: string,
        settings: {
            enabled?: boolean
            thresholdCents?: number
            amountCents?: number
            stripePaymentMethodId?: string
        }
    ): Promise<Wallet> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            await queryRunner.startTransaction()

            const wallet = await this.readWalletForUpdate(userId, queryRunner)
            if (!wallet) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WalletErrorMessage.WALLET_NOT_FOUND)
            }

            if (settings.enabled !== undefined) {
                wallet.autoTopupEnabled = settings.enabled
            }
            if (settings.thresholdCents !== undefined) {
                wallet.autoTopupThresholdCents = settings.thresholdCents
            }
            if (settings.amountCents !== undefined) {
                if (settings.amountCents < PricingConfig.MINIMUM_TOPUP_CENTS) {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, WalletErrorMessage.MINIMUM_TOPUP_REQUIRED)
                }
                wallet.autoTopupAmountCents = settings.amountCents
            }
            if (settings.stripePaymentMethodId !== undefined) {
                wallet.stripePaymentMethodId = settings.stripePaymentMethodId
            }

            await queryRunner.manager.save(Wallet, wallet)
            await queryRunner.commitTransaction()

            return wallet
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Trigger auto-topup (called when balance falls below threshold)
     * This will be integrated with Stripe
     */
    private async triggerAutoTopup(userId: string, amountCents: number): Promise<void> {
        // TODO: Integrate with Stripe to charge saved payment method
        // For now, log the attempt
        logger.info(`Auto-topup triggered for user ${userId}: €${(amountCents / 100).toFixed(2)}`)
    }

    // ==================== TRANSACTION HISTORY ====================

    /**
     * Get transaction history for a wallet
     */
    public async getTransactionHistory(
        userId: string,
        options: {
            limit?: number
            offset?: number
            usageType?: UsageType
            startDate?: Date
            endDate?: Date
        } = {}
    ): Promise<{ transactions: WalletTransaction[]; total: number }> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const wallet = await this.readWalletByUserId(userId, queryRunner)
            if (!wallet) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WalletErrorMessage.WALLET_NOT_FOUND)
            }

            const qb = queryRunner.manager.createQueryBuilder(WalletTransaction, 'tx')
                .where('tx.wallet_id = :walletId', { walletId: wallet.id })
                .orderBy('tx.created_at', 'DESC')

            if (options.usageType) {
                qb.andWhere('tx.usage_type = :usageType', { usageType: options.usageType })
            }

            if (options.startDate) {
                qb.andWhere('tx.created_at >= :startDate', { startDate: options.startDate })
            }

            if (options.endDate) {
                qb.andWhere('tx.created_at <= :endDate', { endDate: options.endDate })
            }

            const total = await qb.getCount()

            if (options.limit) {
                qb.take(options.limit)
            }
            if (options.offset) {
                qb.skip(options.offset)
            }

            const transactions = await qb.getMany()

            return { transactions, total }
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Get usage summary for a period
     */
    public async getUsageSummary(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        totalVoiceSeconds: number
        totalVoiceCost: number
        totalTokens: number
        totalLLMCost: number
        totalCost: number
    }> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            const wallet = await this.readWalletByUserId(userId, queryRunner)
            if (!wallet) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WalletErrorMessage.WALLET_NOT_FOUND)
            }

            const result = await queryRunner.manager.createQueryBuilder(WalletTransaction, 'tx')
                .select([
                    'tx.usage_type as usageType',
                    'SUM(CASE WHEN tx.usage_type = :voice THEN tx.voice_seconds ELSE 0 END) as totalVoiceSeconds',
                    'SUM(CASE WHEN tx.usage_type = :llm THEN tx.tokens_used ELSE 0 END) as totalTokens',
                    'SUM(CASE WHEN tx.usage_type = :voice THEN ABS(tx.amount_cents) ELSE 0 END) as totalVoiceCost',
                    'SUM(CASE WHEN tx.usage_type = :llm THEN ABS(tx.amount_cents) ELSE 0 END) as totalLLMCost'
                ])
                .where('tx.wallet_id = :walletId', { walletId: wallet.id })
                .andWhere('tx.type = :usageType', { usageType: WalletTransactionType.USAGE })
                .andWhere('tx.created_at >= :startDate', { startDate })
                .andWhere('tx.created_at <= :endDate', { endDate })
                .setParameters({ voice: UsageType.VOICE, llm: UsageType.LLM })
                .getRawOne()

            return {
                totalVoiceSeconds: parseInt(result?.totalVoiceSeconds) || 0,
                totalVoiceCost: parseInt(result?.totalVoiceCost) || 0,
                totalTokens: parseInt(result?.totalTokens) || 0,
                totalLLMCost: parseInt(result?.totalLLMCost) || 0,
                totalCost: (parseInt(result?.totalVoiceCost) || 0) + (parseInt(result?.totalLLMCost) || 0)
            }
        } finally {
            await queryRunner.release()
        }
    }

    // ==================== HELPERS ====================

    private generateUsageDescription(usageType: UsageType, metadata: any): string {
        if (usageType === UsageType.VOICE) {
            const minutes = Math.floor((metadata.voiceSeconds || 0) / 60)
            const seconds = (metadata.voiceSeconds || 0) % 60
            return `Voice usage: ${minutes}m ${seconds}s`
        } else {
            return `LLM usage: ${metadata.tokensUsed || 0} tokens${metadata.modelName ? ` (${metadata.modelName})` : ''}`
        }
    }

    /**
     * Set Stripe customer ID for a wallet
     */
    public async setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<Wallet> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()

        try {
            await queryRunner.startTransaction()

            const wallet = await this.readWalletForUpdate(userId, queryRunner)
            if (!wallet) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, WalletErrorMessage.WALLET_NOT_FOUND)
            }

            wallet.stripeCustomerId = stripeCustomerId
            await queryRunner.manager.save(Wallet, wallet)
            await queryRunner.commitTransaction()

            return wallet
        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction()
            }
            throw error
        } finally {
            await queryRunner.release()
        }
    }
}
