/**
 * M.A.T.E. Hybrid Router Service
 * 
 * Phase 2.2: Hybrid-Router - Routing zwischen BYOK und Managed Service
 * 
 * ARCHITECTURE:
 * - BYOK Mode: User verwendet eigenen API-Key (kostenfrei, keine Pre-Flight-Checks)
 * - Managed Mode: Platform-Key mit Pre-Flight-Check und Post-Flight-Billing
 * - Fallback: Kimi K2 → Qwen Max 3 bei Timeout/Error
 * 
 * WORKFLOW:
 * 1. Detect Mode (BYOK vs Managed)
 * 2. Pre-Flight Check (nur Managed)
 * 3. Route Request mit entsprechendem Key
 * 4. Fallback bei Fehler
 * 5. Post-Flight Billing (nur Managed)
 */

import { getDataSource } from '../../DataSource'
import { UserAPIKey, ApiKeyStatus } from '../database/entities/user-api-key.entity'
import { EncryptionService } from './encryption.service'
import { costEstimatorService } from './cost-estimator.service'
import { WalletService } from './wallet.service'
import logger from '../../utils/logger'

// ==================== TYPES ====================

export interface LLMRequest {
    prompt: string
    modelId?: string
    maxTokens?: number
    temperature?: number
    userId: string
    chatflowId?: string
    metadata?: Record<string, any>
}

export interface LLMResponse {
    text: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    modelUsed: string
    provider: string
    costCents?: number
    usedByok: boolean
    byokKeyId?: string
    billing?: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
        originalCostCents?: number
        costCents: number
        costEur: number
        discountPercent: number
        discountTier: string
        savingsCents: number
        savingsEur: number
        newBalanceCents: number
        newBalanceEur: number
        modelUsed: string
    }
}

export interface RoutingDecision {
    mode: 'byok' | 'managed'
    apiKey: string
    provider: string
    modelId: string
    reason: string
    byokKeyId?: string
}

export interface HybridRouterOptions {
    preferByok?: boolean // User-Preference: BYOK bevorzugen wenn verfügbar
    allowFallback?: boolean // Fallback zu anderem Model bei Fehler
    skipPreFlight?: boolean // Nur für Testing/Admin
}

// ==================== HYBRID ROUTER SERVICE ====================

/**
 * HybridRouterService (Singleton)
 * 
 * Intelligentes Routing zwischen BYOK und Managed Service
 */
export class HybridRouterService {
    private static instance: HybridRouterService
    private encryptionService: EncryptionService
    private walletService: WalletService

    // Platform API-Keys (aus ENV)
    private readonly PLATFORM_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || ''
    private readonly PLATFORM_OPENAI_KEY = process.env.OPENAI_API_KEY || ''

    // Default Models
    private readonly PRIMARY_MODEL = 'deepseek/kimi-k2-thinking'
    private readonly FALLBACK_MODEL = 'qwen/qwen-max-3'

    private constructor() {
        this.encryptionService = EncryptionService.getInstance()
        this.walletService = new WalletService()
    }

    public static getInstance(): HybridRouterService {
        if (!HybridRouterService.instance) {
            HybridRouterService.instance = new HybridRouterService()
        }
        return HybridRouterService.instance
    }

    /**
     * MAIN ROUTING FUNCTION
     * 
     * Entscheidet ob BYOK oder Managed und routet Request entsprechend
     */
    public async routeRequest(
        request: LLMRequest,
        options: HybridRouterOptions = {}
    ): Promise<LLMResponse> {
        const startTime = Date.now()

        try {
            // Step 1: Routing-Entscheidung
            const routing = await this.makeRoutingDecision(request, options)
            
            logger.info(`[HybridRouter] Routing decision for user ${request.userId}: ${routing.mode} (${routing.reason})`)

            // Step 2: Execute based on mode
            let response: LLMResponse

            if (routing.mode === 'byok') {
                response = await this.executeBYOKRequest(request, routing)
            } else {
                response = await this.executeManagedRequest(request, routing)
            }

            const duration = Date.now() - startTime
            logger.info(`[HybridRouter] Request completed in ${duration}ms, used ${response.totalTokens} tokens`)

            return response

        } catch (error) {
            logger.error('[HybridRouter] Request failed:', error)

            // Fallback-Logik bei Fehler
            if (options.allowFallback !== false) {
                return await this.executeFailoverRequest(request, error)
            }

            throw error
        }
    }

    /**
     * ROUTING DECISION
     * 
     * Entscheidet zwischen BYOK und Managed basierend auf:
     * - User hat aktiven BYOK-Key?
     * - User-Preference
     * - Guthaben verfügbar?
     */
    private async makeRoutingDecision(
        request: LLMRequest,
        options: HybridRouterOptions
    ): Promise<RoutingDecision> {
        const dataSource = getDataSource()
        const userKeyRepo = dataSource.getRepository(UserAPIKey)

        // Suche nach aktivem BYOK-Key des Users
        const userKeys = await userKeyRepo.find({
            where: {
                userId: request.userId,
                status: ApiKeyStatus.ACTIVE,
                deletedAt: null as any
            },
            order: {
                lastValidated: 'DESC'
            }
        })

        // Hat User einen aktiven BYOK-Key?
        const hasByokKey = userKeys.length > 0

        if (hasByokKey && options.preferByok !== false) {
            // BYOK-Mode: User-Key verwenden
            const userKey = userKeys[0]
            
            // Entschlüssele Key
            const decryptedKey = await this.encryptionService.decryptApiKey(userKey.encryptedKey)

            return {
                mode: 'byok',
                apiKey: decryptedKey,
                provider: userKey.provider,
                modelId: request.modelId || this.PRIMARY_MODEL,
                reason: 'User has active BYOK key',
                byokKeyId: userKey.id
            }
        }

        // Managed-Mode: Platform-Key mit Pre-Flight-Check
        if (!options.skipPreFlight) {
            // Schätze Kosten
            const costEstimate = costEstimatorService.estimateCost(
                request.prompt,
                request.maxTokens || 500,
                request.modelId || this.PRIMARY_MODEL
            )

            // Pre-Flight Balance-Check
            const preFlightCheck = await this.walletService.performPreFlightCheck(
                request.userId,
                costEstimate.estimatedCostCents,
                false // nicht BYOK
            )

            if (!preFlightCheck.allowed) {
                throw new Error(`Insufficient balance: ${preFlightCheck.reason}`)
            }
        }

        return {
            mode: 'managed',
            apiKey: this.PLATFORM_OPENROUTER_KEY,
            provider: 'openrouter',
            modelId: request.modelId || this.PRIMARY_MODEL,
            reason: hasByokKey ? 'User preference: Managed' : 'No BYOK key available'
        }
    }

    /**
     * BYOK MODE EXECUTION
     * 
     * Verwendet User's eigenen API-Key (kostenfrei)
     */
    private async executeBYOKRequest(
        request: LLMRequest,
        routing: RoutingDecision
    ): Promise<LLMResponse> {
        logger.info(`[HybridRouter] Executing BYOK request with ${routing.provider}`)

        // Call LLM mit User-Key
        const llmResponse = await this.callLLM(
            request.prompt,
            routing.apiKey,
            routing.modelId,
            request.maxTokens,
            request.temperature
        )

        return {
            ...llmResponse,
            usedByok: true,
            byokKeyId: routing.byokKeyId,
            costCents: 0 // BYOK ist kostenfrei
        }
    }

    /**
     * MANAGED MODE EXECUTION
     * 
     * Verwendet Platform-Key mit Billing
     */
    private async executeManagedRequest(
        request: LLMRequest,
        routing: RoutingDecision
    ): Promise<LLMResponse> {
        logger.info(`[HybridRouter] Executing Managed request with ${routing.provider}`)

        // Call LLM mit Platform-Key
        const llmResponse = await this.callLLM(
            request.prompt,
            routing.apiKey,
            routing.modelId,
            request.maxTokens,
            request.temperature
        )

        // Get user's monthly token usage for discount tier calculation
        const monthlyTokens = await this.walletService.getMonthlyTokenUsage(request.userId)

        // Post-Flight Billing: Berechne exakte Kosten mit Volumen-Rabatt
        const exactCost = costEstimatorService.calculateExactCost(
            llmResponse.inputTokens,
            llmResponse.outputTokens,
            routing.modelId,
            monthlyTokens
        )

        // Ziehe Kosten vom Wallet ab
        try {
            await this.walletService.deductBalance(
                request.userId,
                exactCost.costCents,
                'llm' as any,
                {
                    tokensUsed: llmResponse.totalTokens,
                    modelName: routing.modelId,
                    chatflowId: request.chatflowId,
                    description: exactCost.discountPercent && exactCost.discountPercent > 0
                        ? `LLM usage: ${llmResponse.totalTokens} tokens (${routing.modelId}) - ${exactCost.discountTier} tier: ${exactCost.discountPercent}% discount applied`
                        : `LLM usage: ${llmResponse.totalTokens} tokens (${routing.modelId})`
                }
            )

            logger.info(`[HybridRouter] Billed €${(exactCost.costCents / 100).toFixed(4)} for ${llmResponse.totalTokens} tokens` +
                       (exactCost.discountPercent && exactCost.discountPercent > 0 ? ` (${exactCost.discountPercent}% ${exactCost.discountTier} discount saved €${((exactCost.savingsCents || 0) / 100).toFixed(4)})` : ''))
        } catch (error) {
            logger.error('[HybridRouter] Billing failed:', error)
            // Wichtig: Request war erfolgreich, nur Billing fehlgeschlagen
            // In Production: Alert-System benachrichtigen
        }

        return {
            ...llmResponse,
            usedByok: false,
            costCents: exactCost.costCents,
            billing: {
                inputTokens: llmResponse.inputTokens,
                outputTokens: llmResponse.outputTokens,
                totalTokens: llmResponse.totalTokens,
                originalCostCents: exactCost.originalCostCents,
                costCents: exactCost.costCents,
                costEur: exactCost.costCents / 100,
                discountPercent: exactCost.discountPercent || 0,
                discountTier: exactCost.discountTier || 'Bronze',
                savingsCents: exactCost.savingsCents || 0,
                savingsEur: (exactCost.savingsCents || 0) / 100,
                newBalanceCents: (await this.walletService.getWalletBalance(request.userId)).balanceCents,
                newBalanceEur: (await this.walletService.getWalletBalance(request.userId)).balanceEur,
                modelUsed: routing.modelId
            }
        }
    }

    /**
     * FAILOVER REQUEST
     * 
     * Fallback zu Qwen Max 3 bei Kimi K2-Fehler
     */
    private async executeFailoverRequest(
        request: LLMRequest,
        originalError: any
    ): Promise<LLMResponse> {
        logger.warn(`[HybridRouter] Failover to ${this.FALLBACK_MODEL} due to error:`, originalError.message)

        try {
            // Versuche mit Fallback-Model
            const llmResponse = await this.callLLM(
                request.prompt,
                this.PLATFORM_OPENROUTER_KEY,
                this.FALLBACK_MODEL,
                request.maxTokens,
                request.temperature
            )

            // Billing für Fallback-Model mit Volumen-Rabatt
            const monthlyTokens = await this.walletService.getMonthlyTokenUsage(request.userId)
            const exactCost = costEstimatorService.calculateExactCost(
                llmResponse.inputTokens,
                llmResponse.outputTokens,
                this.FALLBACK_MODEL,
                monthlyTokens
            )

            await this.walletService.deductBalance(
                request.userId,
                exactCost.costCents,
                'llm' as any,
                {
                    tokensUsed: llmResponse.totalTokens,
                    modelName: this.FALLBACK_MODEL,
                    chatflowId: request.chatflowId,
                    description: `LLM usage (fallback): ${llmResponse.totalTokens} tokens` +
                                (exactCost.discountPercent && exactCost.discountPercent > 0 
                                    ? ` - ${exactCost.discountTier} tier: ${exactCost.discountPercent}% discount` 
                                    : '')
                }
            )

            return {
                ...llmResponse,
                usedByok: false,
                costCents: exactCost.costCents,
                billing: {
                    inputTokens: llmResponse.inputTokens,
                    outputTokens: llmResponse.outputTokens,
                    totalTokens: llmResponse.totalTokens,
                    originalCostCents: exactCost.originalCostCents,
                    costCents: exactCost.costCents,
                    costEur: exactCost.costCents / 100,
                    discountPercent: exactCost.discountPercent || 0,
                    discountTier: exactCost.discountTier || 'Bronze',
                    savingsCents: exactCost.savingsCents || 0,
                    savingsEur: (exactCost.savingsCents || 0) / 100,
                    newBalanceCents: (await this.walletService.getWalletBalance(request.userId)).balanceCents,
                    newBalanceEur: (await this.walletService.getWalletBalance(request.userId)).balanceEur,
                    modelUsed: this.FALLBACK_MODEL
                }
            }
        } catch (fallbackError) {
            logger.error('[HybridRouter] Fallback also failed:', fallbackError)
            throw new Error(`Primary and fallback models failed: ${originalError.message}`)
        }
    }

    /**
     * LLM API CALL
     * 
     * Generischer Call zu OpenRouter/OpenAI
     */
    private async callLLM(
        prompt: string,
        apiKey: string,
        modelId: string,
        maxTokens: number = 500,
        temperature: number = 0.7
    ): Promise<Omit<LLMResponse, 'usedByok' | 'costCents'>> {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://mate-ai.platform',
                'X-Title': 'M.A.T.E. AI Platform'
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens,
                temperature
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`LLM API error (${response.status}): ${errorText}`)
        }

        const data: any = await response.json()

        return {
            text: data.choices[0]?.message?.content || '',
            inputTokens: data.usage?.prompt_tokens || 0,
            outputTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
            modelUsed: data.model || modelId,
            provider: 'openrouter'
        }
    }

    /**
     * Check if user has BYOK configured
     */
    public async hasByokKey(userId: string): Promise<boolean> {
        const dataSource = getDataSource()
        const userKeyRepo = dataSource.getRepository(UserAPIKey)

        const count = await userKeyRepo.count({
            where: {
                userId,
                status: ApiKeyStatus.ACTIVE,
                deletedAt: null as any
            }
        })

        return count > 0
    }
}

// Export Singleton-Instanz
export const hybridRouterService = HybridRouterService.getInstance()
