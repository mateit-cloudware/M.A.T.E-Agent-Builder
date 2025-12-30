/**
 * M.A.T.E. Balance Gate Middleware
 * 
 * This middleware checks if a user has sufficient balance before allowing
 * access to billable operations (LLM calls, Voice usage, etc.)
 * 
 * SECURITY NOTES:
 * - Must be applied AFTER authentication middleware
 * - Uses pessimistic locking for balance checks
 * - Logs all access denials for audit trail
 * 
 * PRICING MODEL:
 * - Voice: €1.50/minute (150 cents/minute)
 * - LLM: €0.03/1K tokens (3 cents/1K tokens)
 */

import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'
import { WalletService, WalletErrorMessage, PricingConfig } from '../services/wallet.service'

// Enable/disable balance gate (can be disabled for development)
const BALANCE_GATE_ENABLED = process.env.BALANCE_GATE_ENABLED !== 'false'

// Minimum balance required to use the platform (prevents edge cases with very small operations)
const MINIMUM_BALANCE_CENTS = parseInt(process.env.MINIMUM_BALANCE_CENTS || '50', 10) // €0.50 default

/**
 * Error messages for balance gate
 */
export const enum BalanceGateErrorMessage {
    INSUFFICIENT_BALANCE = 'Insufficient balance. Please top up your wallet to continue.',
    WALLET_NOT_FOUND = 'Wallet not found. Please contact support.',
    USER_NOT_AUTHENTICATED = 'User not authenticated.',
    BALANCE_CHECK_FAILED = 'Failed to check balance. Please try again.'
}

/**
 * Interface for requests with user information
 */
interface AuthenticatedRequest extends Request {
    user?: {
        id: string
        email?: string
        name?: string
    }
}

/**
 * Balance Gate Middleware Factory
 * 
 * Creates a middleware that checks if the user has sufficient balance
 * for the specified operation type.
 * 
 * @param estimatedCostCents - Estimated cost of the operation in cents
 *                             If not provided, uses MINIMUM_BALANCE_CENTS
 * @param operationType - Type of operation (for logging)
 */
export const requireBalance = (
    estimatedCostCents?: number,
    operationType: string = 'operation'
) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Skip if balance gate is disabled
        if (!BALANCE_GATE_ENABLED) {
            logger.debug('[Balance Gate] Disabled, skipping balance check')
            return next()
        }

        try {
            // Check if user is authenticated
            const userId = req.user?.id
            if (!userId) {
                logger.warn('[Balance Gate] User not authenticated')
                throw new InternalFlowiseError(
                    StatusCodes.UNAUTHORIZED,
                    BalanceGateErrorMessage.USER_NOT_AUTHENTICATED
                )
            }

            const walletService = new WalletService()
            const requiredBalance = estimatedCostCents || MINIMUM_BALANCE_CENTS

            try {
                // Get or create wallet (ensures every user has a wallet)
                const wallet = await walletService.getOrCreateWallet(userId)
                
                // Check balance
                if (wallet.balanceCents < requiredBalance) {
                    logger.info(`[Balance Gate] Insufficient balance for user ${userId}: ` +
                        `has €${(wallet.balanceCents / 100).toFixed(2)}, ` +
                        `needs €${(requiredBalance / 100).toFixed(2)} for ${operationType}`)
                    
                    return res.status(StatusCodes.PAYMENT_REQUIRED).json({
                        success: false,
                        error: BalanceGateErrorMessage.INSUFFICIENT_BALANCE,
                        code: 'INSUFFICIENT_BALANCE',
                        details: {
                            currentBalance: wallet.balanceCents,
                            currentBalanceEur: (wallet.balanceCents / 100).toFixed(2),
                            requiredBalance: requiredBalance,
                            requiredBalanceEur: (requiredBalance / 100).toFixed(2),
                            minimumTopup: PricingConfig.MINIMUM_TOPUP_CENTS,
                            minimumTopupEur: (PricingConfig.MINIMUM_TOPUP_CENTS / 100).toFixed(2)
                        }
                    })
                }

                // Balance is sufficient, continue
                logger.debug(`[Balance Gate] Balance check passed for user ${userId}: ` +
                    `€${(wallet.balanceCents / 100).toFixed(2)} available`)
                
                return next()
            } catch (error: any) {
                if (error.message === WalletErrorMessage.WALLET_NOT_FOUND) {
                    logger.error(`[Balance Gate] Wallet not found for user ${userId}`)
                    return res.status(StatusCodes.NOT_FOUND).json({
                        success: false,
                        error: BalanceGateErrorMessage.WALLET_NOT_FOUND,
                        code: 'WALLET_NOT_FOUND'
                    })
                }
                throw error
            }
        } catch (error: any) {
            logger.error('[Balance Gate] Error checking balance:', error)
            
            if (error instanceof InternalFlowiseError) {
                return res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                    code: 'BALANCE_GATE_ERROR'
                })
            }

            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: BalanceGateErrorMessage.BALANCE_CHECK_FAILED,
                code: 'BALANCE_CHECK_FAILED'
            })
        }
    }
}

/**
 * Middleware to require minimum balance for chatflow execution
 * Uses estimated cost for a typical LLM call (1000 tokens = 3 cents)
 */
export const requireBalanceForChat = requireBalance(
    PricingConfig.LLM_CENTS_PER_1K_TOKENS * 10, // Estimate ~10K tokens per chat
    'chat'
)

/**
 * Middleware to require minimum balance for voice operations
 * Uses estimated cost for 1 minute of voice (150 cents)
 */
export const requireBalanceForVoice = requireBalance(
    PricingConfig.VOICE_CENTS_PER_MINUTE,
    'voice'
)

/**
 * Middleware to require minimum balance for prediction (general API calls)
 * Uses minimum balance threshold
 */
export const requireBalanceForPrediction = requireBalance(
    MINIMUM_BALANCE_CENTS,
    'prediction'
)

/**
 * Estimate cost for a specific operation
 */
export const estimateCost = {
    /**
     * Estimate cost for voice call
     * @param estimatedSeconds - Estimated call duration in seconds
     */
    voice: (estimatedSeconds: number): number => {
        return Math.ceil(estimatedSeconds * PricingConfig.VOICE_CENTS_PER_SECOND)
    },

    /**
     * Estimate cost for LLM usage
     * @param estimatedTokens - Estimated token count
     */
    llm: (estimatedTokens: number): number => {
        return Math.ceil((estimatedTokens / 1000) * PricingConfig.LLM_CENTS_PER_1K_TOKENS)
    },

    /**
     * Combined estimate for voice + LLM
     */
    combined: (voiceSeconds: number, llmTokens: number): number => {
        return estimateCost.voice(voiceSeconds) + estimateCost.llm(llmTokens)
    }
}

/**
 * Check if balance gate is enabled
 */
export const isBalanceGateEnabled = (): boolean => BALANCE_GATE_ENABLED

/**
 * Get minimum required balance
 */
export const getMinimumBalanceRequired = (): number => MINIMUM_BALANCE_CENTS

/**
 * Helper to attach billing info to request for post-processing
 */
export interface BillingInfo {
    userId: string
    startTime: number
    operationType: 'voice' | 'llm' | 'combined'
    metadata?: {
        chatflowId?: string
        callId?: string
        modelName?: string
    }
}

/**
 * Attach billing info to request for later processing
 */
export const attachBillingInfo = (
    req: AuthenticatedRequest,
    operationType: BillingInfo['operationType'],
    metadata?: BillingInfo['metadata']
) => {
    if (!req.user?.id) return

    (req as any).billingInfo = {
        userId: req.user.id,
        startTime: Date.now(),
        operationType,
        metadata
    } as BillingInfo
}

/**
 * Get billing info from request
 */
export const getBillingInfo = (req: Request): BillingInfo | null => {
    return (req as any).billingInfo || null
}

/**
 * Express middleware to track request duration for billing
 * Should be applied at the end of request processing
 */
export const trackUsage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const billingInfo = getBillingInfo(req)
    if (!billingInfo) {
        return next()
    }

    const originalEnd = res.end
    const originalJson = res.json

    // Override res.end to capture when response finishes
    res.end = function(this: Response, ...args: any[]) {
        const endTime = Date.now()
        const duration = endTime - billingInfo.startTime

        // Log usage (actual billing happens in specific handlers)
        logger.debug(`[Billing] Request completed: ` +
            `user=${billingInfo.userId}, ` +
            `type=${billingInfo.operationType}, ` +
            `duration=${duration}ms`)

        return originalEnd.apply(this, args as any)
    }

    return next()
}
