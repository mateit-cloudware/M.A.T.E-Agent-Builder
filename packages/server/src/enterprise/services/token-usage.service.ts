import { StatusCodes } from 'http-status-codes'
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { TokenUsage, TokenUsageStats } from '../database/entities/token-usage.entity'
import { UsageType } from '../database/entities/wallet-transaction.entity'
import { llmProxyService, TokenUsage as LLMTokenUsage } from './llm-proxy.service'
import { WalletService } from './wallet.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'

/**
 * M.A.T.E. Token Usage Service
 * 
 * Verwaltet Token-Nutzung und integriert mit Billing:
 * - Token-Tracking pro Request
 * - Kosten-Berechnung und Wallet-Abzug
 * - Usage-Analytics und Reporting
 */

export interface TrackUsageParams {
    userId: string
    workspaceId?: string
    chatflowId?: string
    model: string
    usage: LLMTokenUsage
    requestType?: 'chat_completion' | 'embedding' | 'transcription' | 'tts'
    sessionId?: string
    latencyMs?: number
    success?: boolean
    errorMessage?: string
}

export interface UsageQueryParams {
    userId?: string
    workspaceId?: string
    chatflowId?: string
    model?: string
    requestType?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
}

class TokenUsageService {
    private static instance: TokenUsageService
    private repository: Repository<TokenUsage> | null = null
    private walletService: WalletService | null = null

    private constructor() {}

    public static getInstance(): TokenUsageService {
        if (!TokenUsageService.instance) {
            TokenUsageService.instance = new TokenUsageService()
        }
        return TokenUsageService.instance
    }

    private getRepository(): Repository<TokenUsage> {
        if (!this.repository) {
            const appServer = getRunningExpressApp()
            this.repository = appServer.AppDataSource.getRepository(TokenUsage)
        }
        return this.repository
    }

    private getWalletService(): WalletService {
        if (!this.walletService) {
            this.walletService = new WalletService()
        }
        return this.walletService
    }

    /**
     * Trackt Token-Nutzung und zieht Kosten vom Wallet ab
     */
    public async trackUsage(params: TrackUsageParams): Promise<TokenUsage> {
        const {
            userId,
            workspaceId,
            chatflowId,
            model,
            usage,
            requestType = 'chat_completion',
            sessionId,
            latencyMs = 0,
            success = true,
            errorMessage
        } = params

        // Kosten berechnen
        const costs = llmProxyService.calculateTokenCost(usage, model)

        // Token-Usage Record erstellen
        const tokenUsage = this.getRepository().create({
            userId,
            workspaceId,
            chatflowId,
            model,
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            costCents: costs.costCents,
            inputCostCents: costs.inputCostCents,
            outputCostCents: costs.outputCostCents,
            requestType,
            sessionId,
            latencyMs,
            success,
            errorMessage
        })

        const savedUsage = await this.getRepository().save(tokenUsage)

        // Kosten vom Wallet abziehen (wenn erfolgreich und Kosten > 0)
        if (success && costs.costCents > 0) {
            try {
                await this.getWalletService().deductBalance(userId, costs.costCents, UsageType.LLM, {
                    tokensUsed: usage.total_tokens,
                    modelName: model,
                    description: `LLM Token Nutzung: ${usage.total_tokens} tokens (${model})`
                })

                logger.debug(`[TokenUsage] Nutzung getrackt und ${costs.costCents} Cents abgezogen`, {
                    userId,
                    model,
                    tokens: usage.total_tokens,
                    costCents: costs.costCents
                })
            } catch (error: any) {
                logger.warn(`[TokenUsage] Wallet-Abzug fehlgeschlagen: ${error.message}`, {
                    userId,
                    costCents: costs.costCents
                })
                // Nutzung trotzdem speichern, Billing wird nachträglich verrechnet
            }
        }

        return savedUsage
    }

    /**
     * Holt Token-Nutzung mit Filtern
     */
    public async getUsage(params: UsageQueryParams): Promise<{ data: TokenUsage[]; total: number }> {
        const { userId, workspaceId, chatflowId, model, requestType, startDate, endDate, limit = 50, offset = 0 } = params

        const where: any = {}

        if (userId) where.userId = userId
        if (workspaceId) where.workspaceId = workspaceId
        if (chatflowId) where.chatflowId = chatflowId
        if (model) where.model = model
        if (requestType) where.requestType = requestType
        
        if (startDate && endDate) {
            where.createdAt = Between(startDate, endDate)
        } else if (startDate) {
            where.createdAt = MoreThanOrEqual(startDate)
        } else if (endDate) {
            where.createdAt = LessThanOrEqual(endDate)
        }

        const [data, total] = await this.getRepository().findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        })

        return { data, total }
    }

    /**
     * Berechnet aggregierte Statistiken für einen User
     */
    public async getUserStats(userId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<TokenUsageStats> {
        const startDate = this.getStartDate(period)

        const qb = this.getRepository()
            .createQueryBuilder('usage')
            .where('usage.userId = :userId', { userId })
            .andWhere('usage.createdAt >= :startDate', { startDate })

        // Aggregierte Werte
        const aggregates = await qb
            .select([
                'SUM(usage.promptTokens) as totalPromptTokens',
                'SUM(usage.completionTokens) as totalCompletionTokens',
                'SUM(usage.totalTokens) as totalTokens',
                'SUM(usage.costCents) as totalCostCents',
                'COUNT(usage.id) as requestCount',
                'AVG(CASE WHEN usage.success = true THEN 1 ELSE 0 END) as successRate',
                'AVG(usage.latencyMs) as avgLatencyMs'
            ])
            .getRawOne()

        // Top Modelle
        const topModels = await this.getRepository()
            .createQueryBuilder('usage')
            .select([
                'usage.model as model',
                'SUM(usage.totalTokens) as tokens',
                'SUM(usage.costCents) as costCents'
            ])
            .where('usage.userId = :userId', { userId })
            .andWhere('usage.createdAt >= :startDate', { startDate })
            .groupBy('usage.model')
            .orderBy('tokens', 'DESC')
            .limit(5)
            .getRawMany()

        return {
            userId,
            period,
            totalPromptTokens: parseInt(aggregates?.totalPromptTokens || '0'),
            totalCompletionTokens: parseInt(aggregates?.totalCompletionTokens || '0'),
            totalTokens: parseInt(aggregates?.totalTokens || '0'),
            totalCostCents: parseInt(aggregates?.totalCostCents || '0'),
            requestCount: parseInt(aggregates?.requestCount || '0'),
            successRate: parseFloat(aggregates?.successRate || '0') * 100,
            avgLatencyMs: Math.round(parseFloat(aggregates?.avgLatencyMs || '0')),
            topModels: topModels.map((m: any) => ({
                model: m.model,
                tokens: parseInt(m.tokens || '0'),
                costCents: parseInt(m.costCents || '0')
            }))
        }
    }

    /**
     * Berechnet Startdatum für Periode
     */
    private getStartDate(period: 'day' | 'week' | 'month'): Date {
        const now = new Date()
        switch (period) {
            case 'day':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000)
            case 'week':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            case 'month':
            default:
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
    }

    /**
     * Prüft ob User genug Balance für geschätzte Tokens hat
     */
    public async checkBalance(userId: string, estimatedTokens: number, model?: string): Promise<{
        hasBalance: boolean
        estimatedCostCents: number
        currentBalanceCents: number
    }> {
        const wallet = await this.getWalletService().getOrCreateWallet(userId)
        const currentBalanceCents = wallet?.balanceCents || 0

        // Schätze Kosten (50% Input, 50% Output als Durchschnitt)
        const estimatedUsage: LLMTokenUsage = {
            prompt_tokens: Math.floor(estimatedTokens * 0.5),
            completion_tokens: Math.floor(estimatedTokens * 0.5),
            total_tokens: estimatedTokens
        }

        const costs = llmProxyService.calculateTokenCost(estimatedUsage, model || llmProxyService.getDefaultModel())

        return {
            hasBalance: currentBalanceCents >= costs.costCents,
            estimatedCostCents: costs.costCents,
            currentBalanceCents
        }
    }
}

export const tokenUsageService = TokenUsageService.getInstance()
