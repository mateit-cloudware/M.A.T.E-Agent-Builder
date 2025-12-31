import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { tokenUsageService } from '../services/token-usage.service'
import { llmProxyService } from '../services/llm-proxy.service'
import logger from '../../utils/logger'

/**
 * M.A.T.E. Token Usage Controller
 * 
 * API-Endpunkte für Token-Nutzung und LLM-Proxy:
 * - GET /api/v1/token-usage - Token-Nutzung abrufen
 * - GET /api/v1/token-usage/stats - Aggregierte Statistiken
 * - GET /api/v1/token-usage/models - Verfügbare Modelle
 * - POST /api/v1/token-usage/estimate - Kosten schätzen
 */

/**
 * GET /api/v1/token-usage
 * Holt Token-Nutzung für den aktuellen User
 */
export const getTokenUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Nicht authentifiziert' })
        }

        const { workspaceId, chatflowId, model, startDate, endDate, limit, offset } = req.query

        const result = await tokenUsageService.getUsage({
            userId,
            workspaceId: workspaceId as string,
            chatflowId: chatflowId as string,
            model: model as string,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            limit: limit ? parseInt(limit as string) : 50,
            offset: offset ? parseInt(offset as string) : 0
        })

        return res.status(StatusCodes.OK).json(result)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/token-usage/stats
 * Holt aggregierte Statistiken für den User
 */
export const getTokenStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Nicht authentifiziert' })
        }

        const period = (req.query.period as 'day' | 'week' | 'month') || 'month'
        const stats = await tokenUsageService.getUserStats(userId, period)

        return res.status(StatusCodes.OK).json(stats)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/token-usage/models
 * Gibt verfügbare LLM-Modelle zurück
 */
export const getAvailableModels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const models = llmProxyService.getAvailableModels()
        const defaultModel = llmProxyService.getDefaultModel()

        return res.status(StatusCodes.OK).json({
            models,
            defaultModel,
            isConfigured: llmProxyService.isConfigured()
        })
    } catch (error) {
        next(error)
    }
}

/**
 * POST /api/v1/token-usage/estimate
 * Schätzt Kosten für geschätzte Token-Nutzung
 */
export const estimateCost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Nicht authentifiziert' })
        }

        const { estimatedTokens, model } = req.body

        if (!estimatedTokens || typeof estimatedTokens !== 'number' || estimatedTokens <= 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                error: 'estimatedTokens muss eine positive Zahl sein' 
            })
        }

        const result = await tokenUsageService.checkBalance(userId, estimatedTokens, model)

        return res.status(StatusCodes.OK).json({
            ...result,
            estimatedCostEur: (result.estimatedCostCents / 100).toFixed(2),
            currentBalanceEur: (result.currentBalanceCents / 100).toFixed(2)
        })
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/admin/token-usage
 * Admin: Holt Token-Nutzung für alle User
 */
export const getAdminTokenUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, workspaceId, model, startDate, endDate, limit, offset } = req.query

        const result = await tokenUsageService.getUsage({
            userId: userId as string,
            workspaceId: workspaceId as string,
            model: model as string,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            limit: limit ? parseInt(limit as string) : 50,
            offset: offset ? parseInt(offset as string) : 0
        })

        return res.status(StatusCodes.OK).json(result)
    } catch (error) {
        next(error)
    }
}
