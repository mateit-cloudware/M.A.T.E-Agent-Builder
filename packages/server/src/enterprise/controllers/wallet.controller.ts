/**
 * M.A.T.E. Wallet Controller
 * 
 * Handles all wallet-related API operations including:
 * - Balance retrieval
 * - Top-up processing
 * - Transaction history
 * - Usage summaries
 * - Auto-topup configuration
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { WalletService, PricingConfig, WalletErrorMessage } from '../services/wallet.service'
import { UsageType } from '../database/entities/wallet-transaction.entity'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'

// Extend Request type to include user
interface AuthenticatedRequest extends Omit<Request, 'user'> {
    user?: {
        id: string
        email?: string
        name?: string
    }
}

export class WalletController {
    /**
     * Get current wallet balance
     * GET /wallet/balance
     */
    public async getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const walletService = new WalletService()
            const wallet = await walletService.getOrCreateWallet(userId)
            
            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    balanceCents: wallet.balanceCents,
                    balanceEur: (wallet.balanceCents / 100).toFixed(2),
                    autoTopupEnabled: wallet.autoTopupEnabled,
                    autoTopupThresholdCents: wallet.autoTopupThresholdCents,
                    autoTopupAmountCents: wallet.autoTopupAmountCents,
                    hasStripePaymentMethod: !!wallet.stripePaymentMethodId
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get full wallet details
     * GET /wallet
     */
    public async getWallet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const walletService = new WalletService()
            const wallet = await walletService.getOrCreateWallet(userId)
            
            // Get this month's usage summary
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const usageSummary = await walletService.getUsageSummary(userId, startOfMonth, now)
            
            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    wallet: {
                        id: wallet.id,
                        balanceCents: wallet.balanceCents,
                        balanceEur: (wallet.balanceCents / 100).toFixed(2),
                        autoTopupEnabled: wallet.autoTopupEnabled,
                        autoTopupThresholdEur: (wallet.autoTopupThresholdCents / 100).toFixed(2),
                        autoTopupAmountEur: (wallet.autoTopupAmountCents / 100).toFixed(2),
                        hasStripePaymentMethod: !!wallet.stripePaymentMethodId,
                        createdAt: wallet.createdAt,
                        updatedAt: wallet.updatedAt
                    },
                    thisMonth: {
                        totalVoiceMinutes: Math.floor(usageSummary.totalVoiceSeconds / 60),
                        totalVoiceSeconds: usageSummary.totalVoiceSeconds,
                        totalVoiceCostEur: (usageSummary.totalVoiceCost / 100).toFixed(2),
                        totalTokens: usageSummary.totalTokens,
                        totalLLMCostEur: (usageSummary.totalLLMCost / 100).toFixed(2),
                        totalCostEur: (usageSummary.totalCost / 100).toFixed(2)
                    },
                    pricing: {
                        voiceCentsPerMinute: PricingConfig.VOICE_CENTS_PER_MINUTE,
                        voiceEurPerMinute: (PricingConfig.VOICE_CENTS_PER_MINUTE / 100).toFixed(2),
                        llmCentsPer1kTokens: PricingConfig.LLM_CENTS_PER_1K_TOKENS,
                        llmEurPer1kTokens: (PricingConfig.LLM_CENTS_PER_1K_TOKENS / 100).toFixed(2),
                        minimumTopupEur: (PricingConfig.MINIMUM_TOPUP_CENTS / 100).toFixed(2)
                    }
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get transaction history
     * GET /wallet/transactions
     */
    public async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { limit = '20', offset = '0', usageType, startDate, endDate } = req.query

            const walletService = new WalletService()
            const result = await walletService.getTransactionHistory(userId, {
                limit: parseInt(limit as string, 10),
                offset: parseInt(offset as string, 10),
                usageType: usageType as UsageType | undefined,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined
            })

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    transactions: result.transactions.map(tx => ({
                        id: tx.id,
                        type: tx.type,
                        usageType: tx.usageType,
                        amountCents: tx.amountCents,
                        amountEur: (Math.abs(tx.amountCents) / 100).toFixed(2),
                        isCredit: tx.amountCents > 0,
                        balanceAfterCents: tx.balanceAfterCents,
                        balanceAfterEur: (tx.balanceAfterCents / 100).toFixed(2),
                        voiceSeconds: tx.voiceSeconds,
                        voiceMinutes: tx.voiceSeconds ? Math.floor(tx.voiceSeconds / 60) : null,
                        tokensUsed: tx.tokensUsed,
                        modelName: tx.modelName,
                        description: tx.description,
                        createdAt: tx.createdAt
                    })),
                    total: result.total,
                    limit: parseInt(limit as string, 10),
                    offset: parseInt(offset as string, 10)
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get usage summary for a period
     * GET /wallet/usage
     */
    public async getUsageSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { startDate, endDate } = req.query

            // Default to current month if not provided
            const now = new Date()
            const start = startDate ? new Date(startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1)
            const end = endDate ? new Date(endDate as string) : now

            const walletService = new WalletService()
            const summary = await walletService.getUsageSummary(userId, start, end)

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    period: {
                        start: start.toISOString(),
                        end: end.toISOString()
                    },
                    voice: {
                        totalSeconds: summary.totalVoiceSeconds,
                        totalMinutes: Math.floor(summary.totalVoiceSeconds / 60),
                        totalCostCents: summary.totalVoiceCost,
                        totalCostEur: (summary.totalVoiceCost / 100).toFixed(2)
                    },
                    llm: {
                        totalTokens: summary.totalTokens,
                        totalCostCents: summary.totalLLMCost,
                        totalCostEur: (summary.totalLLMCost / 100).toFixed(2)
                    },
                    total: {
                        costCents: summary.totalCost,
                        costEur: (summary.totalCost / 100).toFixed(2)
                    }
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Update auto-topup settings
     * PUT /wallet/auto-topup
     */
    public async updateAutoTopup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { enabled, thresholdEur, amountEur } = req.body

            const walletService = new WalletService()
            const wallet = await walletService.updateAutoTopupSettings(userId, {
                enabled: enabled !== undefined ? Boolean(enabled) : undefined,
                thresholdCents: thresholdEur !== undefined ? Math.round(parseFloat(thresholdEur) * 100) : undefined,
                amountCents: amountEur !== undefined ? Math.round(parseFloat(amountEur) * 100) : undefined
            })

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Auto-topup settings updated',
                data: {
                    autoTopupEnabled: wallet.autoTopupEnabled,
                    autoTopupThresholdEur: (wallet.autoTopupThresholdCents / 100).toFixed(2),
                    autoTopupAmountEur: (wallet.autoTopupAmountCents / 100).toFixed(2)
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Create a top-up session (initiates Stripe checkout)
     * POST /wallet/topup
     */
    public async createTopup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { amountEur } = req.body

            if (!amountEur) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Amount is required')
            }

            const amountCents = Math.round(parseFloat(amountEur) * 100)

            if (amountCents < PricingConfig.MINIMUM_TOPUP_CENTS) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `Minimum top-up amount is €${(PricingConfig.MINIMUM_TOPUP_CENTS / 100).toFixed(2)}`
                )
            }

            // TODO: Integrate with Stripe to create checkout session
            // For now, return placeholder response
            logger.info(`[Wallet] Top-up requested: user=${userId}, amount=€${amountEur}`)

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Top-up session created',
                data: {
                    // TODO: Return Stripe checkout URL
                    checkoutUrl: `/checkout?amount=${amountCents}`,
                    amountCents,
                    amountEur
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Handle Stripe webhook for successful payments
     * POST /wallet/webhook/stripe
     */
    public async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            // TODO: Verify Stripe webhook signature
            // TODO: Extract payment details
            // TODO: Add balance to wallet

            const { userId, amountCents, stripePaymentId } = req.body

            if (!userId || !amountCents || !stripePaymentId) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Missing required fields')
            }

            const walletService = new WalletService()
            const wallet = await walletService.addBalance(
                userId,
                amountCents,
                undefined,
                stripePaymentId
            )

            logger.info(`[Wallet] Payment processed: user=${userId}, amount=€${(amountCents / 100).toFixed(2)}, stripeId=${stripePaymentId}`)

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Payment processed',
                data: {
                    newBalanceCents: wallet.balanceCents,
                    newBalanceEur: (wallet.balanceCents / 100).toFixed(2)
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get pricing information
     * GET /wallet/pricing
     */
    public async getPricing(req: Request, res: Response, next: NextFunction) {
        try {
            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    voice: {
                        centsPerMinute: PricingConfig.VOICE_CENTS_PER_MINUTE,
                        eurPerMinute: (PricingConfig.VOICE_CENTS_PER_MINUTE / 100).toFixed(2),
                        centsPerSecond: PricingConfig.VOICE_CENTS_PER_SECOND,
                        description: '€1.50 per minute of voice usage'
                    },
                    llm: {
                        centsPer1kTokens: PricingConfig.LLM_CENTS_PER_1K_TOKENS,
                        eurPer1kTokens: (PricingConfig.LLM_CENTS_PER_1K_TOKENS / 100).toFixed(2),
                        description: '€0.03 per 1,000 tokens'
                    },
                    topup: {
                        minimumCents: PricingConfig.MINIMUM_TOPUP_CENTS,
                        minimumEur: (PricingConfig.MINIMUM_TOPUP_CENTS / 100).toFixed(2),
                        description: 'Minimum top-up: €10.00'
                    },
                    currency: 'EUR'
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Estimate cost for an operation
     * POST /wallet/estimate
     */
    public async estimateCost(req: Request, res: Response, next: NextFunction) {
        try {
            const { voiceSeconds, tokens } = req.body

            const walletService = new WalletService()
            
            let voiceCost = 0
            let llmCost = 0

            if (voiceSeconds) {
                voiceCost = walletService.calculateVoiceCost(parseInt(voiceSeconds, 10))
            }

            if (tokens) {
                llmCost = walletService.calculateLLMCost(parseInt(tokens, 10))
            }

            const totalCost = voiceCost + llmCost

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    voice: voiceSeconds ? {
                        seconds: parseInt(voiceSeconds, 10),
                        minutes: Math.floor(parseInt(voiceSeconds, 10) / 60),
                        costCents: voiceCost,
                        costEur: (voiceCost / 100).toFixed(2)
                    } : null,
                    llm: tokens ? {
                        tokens: parseInt(tokens, 10),
                        costCents: llmCost,
                        costEur: (llmCost / 100).toFixed(2)
                    } : null,
                    total: {
                        costCents: totalCost,
                        costEur: (totalCost / 100).toFixed(2)
                    }
                }
            })
        } catch (error) {
            next(error)
        }
    }
}
