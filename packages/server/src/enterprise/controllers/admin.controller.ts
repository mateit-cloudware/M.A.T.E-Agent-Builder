/**
 * M.A.T.E. SuperAdmin Controller
 * 
 * Provides administrative endpoints for:
 * - System-wide statistics and metrics
 * - All user wallet management
 * - Manual balance adjustments
 * - Audit logging
 * 
 * All endpoints require 'users:manage' permission
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { WalletService, PricingConfig } from '../services/wallet.service'
import { WalletTransactionType, UsageType, WalletTransaction } from '../database/entities/wallet-transaction.entity'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { User } from '../database/entities/user.entity'
import { Wallet } from '../database/entities/wallet.entity'
import logger from '../../utils/logger'

interface AuthenticatedRequest extends Request {
    user?: {
        id: string
        email?: string
        name?: string
        isOrganizationAdmin?: boolean
        permissions?: string[]
    }
}

export class AdminController {
    /**
     * Get system-wide statistics
     * GET /admin/stats
     */
    public async getSystemStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            // Get total users count
            const totalUsers = await dataSource.getRepository(User).count()

            // Get active users (with wallet activity in last 30 days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            
            const activeWallets = await dataSource.getRepository(Wallet)
                .createQueryBuilder('wallet')
                .where('wallet.updatedAt >= :date', { date: thirtyDaysAgo })
                .getCount()

            // Get total balance across all wallets
            const totalBalanceResult = await dataSource.getRepository(Wallet)
                .createQueryBuilder('wallet')
                .select('SUM(wallet.balanceCents)', 'total')
                .getRawOne()
            const totalBalanceCents = totalBalanceResult?.total || 0

            // Get this month's revenue
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const monthlyRevenueResult = await dataSource.getRepository(WalletTransaction)
                .createQueryBuilder('tx')
                .where('tx.type = :type', { type: WalletTransactionType.TOPUP })
                .andWhere('tx.createdAt >= :date', { date: startOfMonth })
                .select('SUM(tx.amountCents)', 'total')
                .getRawOne()
            const monthlyRevenueCents = monthlyRevenueResult?.total || 0

            // Get this month's usage
            const monthlyUsageResult = await dataSource.getRepository(WalletTransaction)
                .createQueryBuilder('tx')
                .where('tx.type = :type', { type: WalletTransactionType.USAGE })
                .andWhere('tx.createdAt >= :date', { date: startOfMonth })
                .select([
                    'SUM(ABS(tx.amountCents)) as totalCost',
                    'SUM(tx.voiceSeconds) as totalVoiceSeconds',
                    'SUM(tx.tokensUsed) as totalTokens'
                ])
                .getRawOne()

            const monthlyUsageCents = monthlyUsageResult?.totalCost || 0
            const monthlyVoiceSeconds = monthlyUsageResult?.totalVoiceSeconds || 0
            const monthlyTokens = monthlyUsageResult?.totalTokens || 0

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    users: {
                        total: totalUsers,
                        activeInLast30Days: activeWallets
                    },
                    wallets: {
                        totalBalanceCents,
                        totalBalanceEur: (totalBalanceCents / 100).toFixed(2)
                    },
                    thisMonth: {
                        revenueCents: monthlyRevenueCents,
                        revenueEur: (monthlyRevenueCents / 100).toFixed(2),
                        usageCents: monthlyUsageCents,
                        usageEur: (monthlyUsageCents / 100).toFixed(2),
                        voiceSeconds: monthlyVoiceSeconds,
                        voiceMinutes: Math.floor(monthlyVoiceSeconds / 60),
                        tokensUsed: monthlyTokens
                    },
                    pricing: PricingConfig
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get all wallets with user info
     * GET /admin/wallets
     */
    public async getAllWallets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { limit = '50', offset = '0', search } = req.query

            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            let query = dataSource.getRepository(Wallet)
                .createQueryBuilder('wallet')
                .leftJoinAndSelect('wallet.user', 'user')
                .orderBy('wallet.updatedAt', 'DESC')
                .take(parseInt(limit as string, 10))
                .skip(parseInt(offset as string, 10))

            if (search) {
                query = query.where('user.email LIKE :search OR user.name LIKE :search', {
                    search: `%${search}%`
                })
            }

            const [wallets, total] = await query.getManyAndCount()

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    wallets: wallets.map((wallet: Wallet) => ({
                        id: wallet.id,
                        userId: wallet.userId,
                        userEmail: wallet.user?.email,
                        userName: wallet.user?.name,
                        balanceCents: wallet.balanceCents,
                        balanceEur: (wallet.balanceCents / 100).toFixed(2),
                        autoTopupEnabled: wallet.autoTopupEnabled,
                        createdAt: wallet.createdAt,
                        updatedAt: wallet.updatedAt
                    })),
                    total,
                    limit: parseInt(limit as string, 10),
                    offset: parseInt(offset as string, 10)
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get wallet details for a specific user
     * GET /admin/wallets/:userId
     */
    public async getWalletByUserId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params

            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'User ID is required')
            }

            const walletService = new WalletService()
            const wallet = await walletService.getOrCreateWallet(userId)

            // Get all-time usage summary
            const allTimeUsage = await walletService.getUsageSummary(userId, new Date(0), new Date())

            // Get this month's usage
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const thisMonthUsage = await walletService.getUsageSummary(userId, startOfMonth, now)

            // Get recent transactions
            const recentTransactions = await walletService.getTransactionHistory(userId, {
                limit: 10,
                offset: 0
            })

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    wallet: {
                        id: wallet.id,
                        userId: wallet.userId,
                        balanceCents: wallet.balanceCents,
                        balanceEur: (wallet.balanceCents / 100).toFixed(2),
                        autoTopupEnabled: wallet.autoTopupEnabled,
                        autoTopupThresholdCents: wallet.autoTopupThresholdCents,
                        autoTopupAmountCents: wallet.autoTopupAmountCents,
                        stripeCustomerId: wallet.stripeCustomerId,
                        createdAt: wallet.createdAt,
                        updatedAt: wallet.updatedAt
                    },
                    allTimeUsage: {
                        voiceSeconds: allTimeUsage.totalVoiceSeconds,
                        voiceMinutes: Math.floor(allTimeUsage.totalVoiceSeconds / 60),
                        voiceCostEur: (allTimeUsage.totalVoiceCost / 100).toFixed(2),
                        tokens: allTimeUsage.totalTokens,
                        llmCostEur: (allTimeUsage.totalLLMCost / 100).toFixed(2),
                        totalCostEur: (allTimeUsage.totalCost / 100).toFixed(2)
                    },
                    thisMonth: {
                        voiceSeconds: thisMonthUsage.totalVoiceSeconds,
                        voiceMinutes: Math.floor(thisMonthUsage.totalVoiceSeconds / 60),
                        voiceCostEur: (thisMonthUsage.totalVoiceCost / 100).toFixed(2),
                        tokens: thisMonthUsage.totalTokens,
                        llmCostEur: (thisMonthUsage.totalLLMCost / 100).toFixed(2),
                        totalCostEur: (thisMonthUsage.totalCost / 100).toFixed(2)
                    },
                    recentTransactions: recentTransactions.transactions.map(tx => ({
                        id: tx.id,
                        type: tx.type,
                        usageType: tx.usageType,
                        amountCents: tx.amountCents,
                        amountEur: (Math.abs(tx.amountCents) / 100).toFixed(2),
                        description: tx.description,
                        createdAt: tx.createdAt
                    }))
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Adjust wallet balance (admin-only)
     * POST /admin/wallets/:userId/adjust
     */
    public async adjustBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params
            const { amountEur, reason } = req.body
            const adminId = req.user?.id

            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'User ID is required')
            }

            if (!amountEur) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Amount is required')
            }

            if (!reason) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Reason is required for admin adjustments')
            }

            const amountCents = Math.round(parseFloat(amountEur) * 100)
            const walletService = new WalletService()

            let wallet: Wallet

            if (amountCents > 0) {
                // Adding balance
                wallet = await walletService.addBalance(
                    userId,
                    amountCents,
                    WalletTransactionType.ADJUSTMENT,
                    undefined,
                    `Admin adjustment: ${reason} (by ${adminId})`
                )
                logger.info(`[Admin] Balance added: user=${userId}, amount=€${amountEur}, admin=${adminId}, reason=${reason}`)
            } else if (amountCents < 0) {
                // Deducting balance (for refunds, corrections, etc.)
                wallet = await walletService.getOrCreateWallet(userId)
                
                // Create a manual deduction transaction
                const appServer = getRunningExpressApp()
                const txRepo = appServer.AppDataSource.getRepository(WalletTransaction)
                const walletRepo = appServer.AppDataSource.getRepository(Wallet)

                const newBalance = wallet.balanceCents + amountCents // amountCents is negative

                await walletRepo.update(
                    { id: wallet.id },
                    { balanceCents: newBalance }
                )

                await txRepo.save({
                    walletId: wallet.id,
                    type: WalletTransactionType.ADJUSTMENT,
                    amountCents: amountCents,
                    balanceAfterCents: newBalance,
                    description: `Admin adjustment: ${reason} (by ${adminId})`
                })

                wallet.balanceCents = newBalance
                logger.info(`[Admin] Balance deducted: user=${userId}, amount=€${amountEur}, admin=${adminId}, reason=${reason}`)
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Amount cannot be zero')
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Balance adjusted successfully',
                data: {
                    userId,
                    adjustmentCents: amountCents,
                    adjustmentEur: amountEur,
                    newBalanceCents: wallet.balanceCents,
                    newBalanceEur: (wallet.balanceCents / 100).toFixed(2),
                    reason,
                    adjustedBy: adminId
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get all transactions across all users (for audit)
     * GET /admin/transactions
     */
    public async getAllTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { limit = '50', offset = '0', type, usageType, startDate, endDate } = req.query

            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            let query = dataSource.getRepository(WalletTransaction)
                .createQueryBuilder('tx')
                .leftJoinAndSelect('tx.wallet', 'wallet')
                .orderBy('tx.createdAt', 'DESC')
                .take(parseInt(limit as string, 10))
                .skip(parseInt(offset as string, 10))

            if (type) {
                query = query.andWhere('tx.type = :type', { type })
            }

            if (usageType) {
                query = query.andWhere('tx.usageType = :usageType', { usageType })
            }

            if (startDate) {
                query = query.andWhere('tx.createdAt >= :startDate', { startDate: new Date(startDate as string) })
            }

            if (endDate) {
                query = query.andWhere('tx.createdAt <= :endDate', { endDate: new Date(endDate as string) })
            }

            const [transactions, total] = await query.getManyAndCount()

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    transactions: transactions.map((tx: WalletTransaction) => ({
                        id: tx.id,
                        walletId: tx.walletId,
                        userId: tx.wallet?.userId,
                        type: tx.type,
                        usageType: tx.usageType,
                        amountCents: tx.amountCents,
                        amountEur: (Math.abs(tx.amountCents) / 100).toFixed(2),
                        isCredit: tx.amountCents > 0,
                        voiceSeconds: tx.voiceSeconds,
                        tokensUsed: tx.tokensUsed,
                        modelName: tx.modelName,
                        description: tx.description,
                        createdAt: tx.createdAt
                    })),
                    total,
                    limit: parseInt(limit as string, 10),
                    offset: parseInt(offset as string, 10)
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get usage analytics
     * GET /admin/analytics
     */
    public async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { days = '30' } = req.query
            const numDays = parseInt(days as string, 10)

            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            const startDate = new Date()
            startDate.setDate(startDate.getDate() - numDays)
            startDate.setHours(0, 0, 0, 0)

            // Get daily usage breakdown
            const dailyUsage = await dataSource.getRepository(WalletTransaction)
                .createQueryBuilder('tx')
                .where('tx.type = :type', { type: WalletTransactionType.USAGE })
                .andWhere('tx.createdAt >= :startDate', { startDate })
                .select([
                    'DATE(tx.createdAt) as date',
                    'SUM(ABS(tx.amountCents)) as totalCost',
                    'SUM(tx.voiceSeconds) as voiceSeconds',
                    'SUM(tx.tokensUsed) as tokens',
                    'COUNT(*) as transactionCount'
                ])
                .groupBy('DATE(tx.createdAt)')
                .orderBy('date', 'ASC')
                .getRawMany()

            // Get top users by usage
            const topUsers = await dataSource.getRepository(WalletTransaction)
                .createQueryBuilder('tx')
                .leftJoin('tx.wallet', 'wallet')
                .where('tx.type = :type', { type: WalletTransactionType.USAGE })
                .andWhere('tx.createdAt >= :startDate', { startDate })
                .select([
                    'wallet.userId as userId',
                    'SUM(ABS(tx.amountCents)) as totalCost',
                    'SUM(tx.voiceSeconds) as voiceSeconds',
                    'SUM(tx.tokensUsed) as tokens'
                ])
                .groupBy('wallet.userId')
                .orderBy('totalCost', 'DESC')
                .limit(10)
                .getRawMany()

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    period: {
                        days: numDays,
                        start: startDate.toISOString(),
                        end: new Date().toISOString()
                    },
                    dailyUsage: dailyUsage.map((day: any) => ({
                        date: day.date,
                        costCents: day.totalCost || 0,
                        costEur: ((day.totalCost || 0) / 100).toFixed(2),
                        voiceMinutes: Math.floor((day.voiceSeconds || 0) / 60),
                        tokens: day.tokens || 0,
                        transactionCount: day.transactionCount
                    })),
                    topUsers: topUsers.map((user: any) => ({
                        userId: user.userId,
                        totalCostEur: ((user.totalCost || 0) / 100).toFixed(2),
                        voiceMinutes: Math.floor((user.voiceSeconds || 0) / 60),
                        tokens: user.tokens || 0
                    }))
                }
            })
        } catch (error) {
            next(error)
        }
    }
}
