import { Request, Response, NextFunction } from 'express'
import { llmProxyService, LLMRequestOptions, TOKEN_PRICING, KIMI_K2_CONFIG } from '../services/llm-proxy.service'
import { tokenUsageService } from '../services/token-usage.service'
import logger from '../../utils/logger'

/**
 * M.A.T.E. LLM Middleware
 * 
 * Middleware für:
 * - Pre-Request: Balance-Prüfung
 * - Post-Request: Token-Tracking und Billing
 * - Rate-Limiting pro User
 */

// Rate-Limit Konfiguration
const RATE_LIMIT_CONFIG = {
    // Requests pro Minute pro User
    requestsPerMinute: parseInt(process.env.LLM_RATE_LIMIT_PER_MINUTE || '60'),
    // Tokens pro Tag pro User
    tokensPerDay: parseInt(process.env.LLM_RATE_LIMIT_TOKENS_PER_DAY || '1000000'),
    // Window für Request-Limit (in ms)
    windowMs: 60 * 1000
}

// In-Memory Rate-Limit Store (für Production: Redis verwenden)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const dailyTokenStore = new Map<string, { tokens: number; resetAt: number }>()

/**
 * Prüft Rate-Limits für User
 */
export const checkRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const now = Date.now()
        const key = `rate:${userId}`

        // Request-Limit prüfen
        let rateData = rateLimitStore.get(key)
        if (!rateData || now >= rateData.resetAt) {
            rateData = { count: 0, resetAt: now + RATE_LIMIT_CONFIG.windowMs }
            rateLimitStore.set(key, rateData)
        }

        if (rateData.count >= RATE_LIMIT_CONFIG.requestsPerMinute) {
            logger.warn(`[RateLimit] User ${userId} hat Request-Limit erreicht`)
            return res.status(429).json({
                error: 'Rate-Limit erreicht',
                retryAfter: Math.ceil((rateData.resetAt - now) / 1000),
                limit: RATE_LIMIT_CONFIG.requestsPerMinute,
                window: 'minute'
            })
        }

        rateData.count++
        
        // Tägliches Token-Limit prüfen
        const dailyKey = `daily:${userId}`
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

        let dailyData = dailyTokenStore.get(dailyKey)
        if (!dailyData || now >= dailyData.resetAt) {
            dailyData = { tokens: 0, resetAt: endOfDay.getTime() }
            dailyTokenStore.set(dailyKey, dailyData)
        }

        if (dailyData.tokens >= RATE_LIMIT_CONFIG.tokensPerDay) {
            logger.warn(`[RateLimit] User ${userId} hat tägliches Token-Limit erreicht`)
            return res.status(429).json({
                error: 'Tägliches Token-Limit erreicht',
                retryAfter: Math.ceil((dailyData.resetAt - now) / 1000),
                limit: RATE_LIMIT_CONFIG.tokensPerDay,
                window: 'day'
            })
        }

        // Rate-Limit Info im Request speichern für spätere Aktualisierung
        (req as any).rateLimit = {
            dailyKey,
            remainingRequests: RATE_LIMIT_CONFIG.requestsPerMinute - rateData.count,
            remainingTokens: RATE_LIMIT_CONFIG.tokensPerDay - dailyData.tokens
        }

        next()
    } catch (error) {
        logger.error('[RateLimit] Fehler bei Rate-Limit-Prüfung', { error })
        next(error)
    }
}

/**
 * Aktualisiert Token-Zähler nach LLM-Request
 */
export const updateTokenCount = (userId: string, tokens: number) => {
    const dailyKey = `daily:${userId}`
    const dailyData = dailyTokenStore.get(dailyKey)
    if (dailyData) {
        dailyData.tokens += tokens
    }
}

/**
 * Prüft Balance vor LLM-Request
 */
export const checkBalanceBeforeLLM = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        // Geschätzte Tokens für Anfrage (basierend auf Message-Länge)
        const messages = req.body?.messages || []
        const estimatedInputTokens = messages.reduce((acc: number, msg: any) => {
            // Grobe Schätzung: 4 Zeichen = 1 Token
            return acc + Math.ceil((msg.content?.length || 0) / 4)
        }, 0)

        // Schätze Output-Tokens (ca. 2x Input für typische Antworten)
        const estimatedTotalTokens = estimatedInputTokens * 3

        const balanceCheck = await tokenUsageService.checkBalance(userId, estimatedTotalTokens, req.body?.model)

        if (!balanceCheck.hasBalance) {
            return res.status(402).json({
                error: 'Nicht genug Guthaben',
                required: balanceCheck.estimatedCostCents,
                available: balanceCheck.currentBalanceCents,
                requiredEur: (balanceCheck.estimatedCostCents / 100).toFixed(2),
                availableEur: (balanceCheck.currentBalanceCents / 100).toFixed(2)
            })
        }

        next()
    } catch (error) {
        logger.error('[BalanceCheck] Fehler bei Balance-Prüfung', { error })
        next(error)
    }
}

/**
 * Gibt Rate-Limit Info in Response-Headers zurück
 */
export const addRateLimitHeaders = (req: Request, res: Response, next: NextFunction) => {
    const rateLimit = (req as any).rateLimit
    if (rateLimit) {
        res.setHeader('X-RateLimit-Remaining-Requests', rateLimit.remainingRequests)
        res.setHeader('X-RateLimit-Remaining-Tokens', rateLimit.remainingTokens)
    }
    next()
}

/**
 * Bereinigt abgelaufene Rate-Limit Einträge (periodisch aufrufen)
 */
export const cleanupRateLimitStore = () => {
    const now = Date.now()
    
    for (const [key, data] of rateLimitStore.entries()) {
        if (now >= data.resetAt) {
            rateLimitStore.delete(key)
        }
    }
    
    for (const [key, data] of dailyTokenStore.entries()) {
        if (now >= data.resetAt) {
            dailyTokenStore.delete(key)
        }
    }
}

// Cleanup alle 5 Minuten
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)

export default {
    checkRateLimit,
    checkBalanceBeforeLLM,
    addRateLimitHeaders,
    updateTokenCount,
    cleanupRateLimitStore
}
