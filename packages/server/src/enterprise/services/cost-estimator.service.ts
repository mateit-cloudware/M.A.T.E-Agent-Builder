/**
 * M.A.T.E. Cost Estimator Service
 * 
 * Phase 2.1: Pre-Flight Token-Check
 * - Schätzt Token-Kosten vor LLM-Call (Char/4 Heuristik)
 * - Prüft User-Guthaben
 * - Blockiert Requests bei unzureichendem Guthaben
 * - Unterstützt BYOK (kostenfrei) und Managed Service
 */

import logger from '../../utils/logger'
import { PricingConfig } from './wallet.service'

// ==================== VOLUME DISCOUNT TIERS ====================

/**
 * Volume Discount Tiers - Applied based on monthly token consumption
 * Users automatically upgrade to higher tiers as usage increases
 */
export enum DiscountTier {
    BRONZE = 'bronze',    // 0-100K tokens/month - 0% discount
    SILVER = 'silver',    // 100K-500K tokens/month - 5% discount
    GOLD = 'gold',        // 500K-2M tokens/month - 10% discount
    PLATINUM = 'platinum' // 2M+ tokens/month - 15% discount
}

export interface DiscountTierConfig {
    minMonthlyTokens: number
    maxMonthlyTokens: number
    discountPercent: number
    label: string
    color: string
    description: string
}

export const DISCOUNT_TIER_CONFIG: Record<DiscountTier, DiscountTierConfig> = {
    [DiscountTier.BRONZE]: {
        minMonthlyTokens: 0,
        maxMonthlyTokens: 100000,
        discountPercent: 0,
        label: 'Bronze',
        color: '#cd7f32',
        description: 'Standard tier - no discount'
    },
    [DiscountTier.SILVER]: {
        minMonthlyTokens: 100000,
        maxMonthlyTokens: 500000,
        discountPercent: 5,
        label: 'Silver',
        color: '#c0c0c0',
        description: '5% discount on all LLM costs'
    },
    [DiscountTier.GOLD]: {
        minMonthlyTokens: 500000,
        maxMonthlyTokens: 2000000,
        discountPercent: 10,
        label: 'Gold',
        color: '#ffd700',
        description: '10% discount on all LLM costs'
    },
    [DiscountTier.PLATINUM]: {
        minMonthlyTokens: 2000000,
        maxMonthlyTokens: Infinity,
        discountPercent: 15,
        label: 'Platinum',
        color: '#e5e4e2',
        description: '15% discount on all LLM costs'
    }
}

// ==================== TYPES ====================

export interface TokenEstimate {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCostCents: number
    estimatedCostEur: number
    confidence: number // 0.0 - 1.0
    originalCostCents?: number
    savingsCents?: number
    discountPercent?: number
    discountTier?: string
}

export interface PreFlightCheck {
    allowed: boolean
    reason?: string
    userBalanceCents: number
    estimatedCostCents: number
    safetyMarginCents: number
    requiredBalanceCents: number
    hasSufficientBalance: boolean
    usingByok: boolean
}

export interface ModelPricing {
    inputCentsPerToken: number
    outputCentsPerToken: number
    modelName: string
    provider: string
}

// ==================== MODEL PRICING ====================

/**
 * Preise pro Token in Cents (1 EUR = 100 Cents)
 * Quelle: OpenRouter Pricing (Stand 2024)
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
    // Kimi K2 Thinking (Premium Reasoning)
    'deepseek/kimi-k2-thinking': {
        inputCentsPerToken: 0.0003,    // $0.003 per 1K tokens = 0.0003 cents per token
        outputCentsPerToken: 0.0003,
        modelName: 'Kimi K2 Thinking',
        provider: 'deepseek'
    },
    
    // Qwen Max 3 (Fallback)
    'qwen/qwen-max-3': {
        inputCentsPerToken: 0.0002,    // $0.002 per 1K tokens
        outputCentsPerToken: 0.0002,
        modelName: 'Qwen Max 3',
        provider: 'qwen'
    },
    
    // OpenAI GPT-4o (Premium)
    'openai/gpt-4o': {
        inputCentsPerToken: 0.0025,    // $0.0025 per 1K tokens
        outputCentsPerToken: 0.01,     // $0.01 per 1K tokens
        modelName: 'GPT-4o',
        provider: 'openai'
    },
    
    // OpenAI GPT-4o-mini (Budget)
    'openai/gpt-4o-mini': {
        inputCentsPerToken: 0.000015,  // $0.00015 per 1K tokens
        outputCentsPerToken: 0.0006,   // $0.0006 per 1K tokens
        modelName: 'GPT-4o-mini',
        provider: 'openai'
    },
    
    // Claude 3.5 Sonnet
    'anthropic/claude-3-5-sonnet': {
        inputCentsPerToken: 0.0003,
        outputCentsPerToken: 0.0015,
        modelName: 'Claude 3.5 Sonnet',
        provider: 'anthropic'
    },
    
    // Default/Fallback pricing (Durchschnitt)
    'default': {
        inputCentsPerToken: 0.0003,
        outputCentsPerToken: 0.0003,
        modelName: 'Unknown Model',
        provider: 'unknown'
    }
}

// ==================== COST ESTIMATOR SERVICE ====================

/**
 * CostEstimatorService
 * 
 * Schätzt LLM-Kosten vor dem Request (Pre-Flight) mit Char/4-Heuristik
 */
export class CostEstimatorService {
    private static instance: CostEstimatorService

    // Safety-Margin: Zusätzliche Reserve für Abweichungen (20% = 1.2x)
    private readonly SAFETY_MARGIN_MULTIPLIER = 1.2

    // Durchschnittliche Zeichen pro Token (Heuristik)
    private readonly CHARS_PER_TOKEN = 4

    private constructor() {}

    public static getInstance(): CostEstimatorService {
        if (!CostEstimatorService.instance) {
            CostEstimatorService.instance = new CostEstimatorService()
        }
        return CostEstimatorService.instance
    }

    /**
     * Schätzt Token-Anzahl aus Text mit Char/4-Heuristik
     * 
     * Formel: Tokens ≈ Characters / 4
     * Confidence: ~85% Genauigkeit (basierend auf GPT-Tokenizer-Statistiken)
     */
    public estimateTokensFromText(text: string): { tokens: number; confidence: number } {
        if (!text || text.length === 0) {
            return { tokens: 0, confidence: 1.0 }
        }

        // Basis-Schätzung: Chars / 4
        const estimatedTokens = Math.ceil(text.length / this.CHARS_PER_TOKEN)

        // Confidence basierend auf Text-Eigenschaften
        let confidence = 0.85 // Base confidence

        // Reduziere Confidence bei nicht-englischem Text (mehr Bytes pro Token)
        const nonAsciiRatio = (text.length - text.replace(/[^\x00-\x7F]/g, '').length) / text.length
        if (nonAsciiRatio > 0.3) {
            confidence -= 0.1 // Nicht-ASCII-Text ist schwerer zu schätzen
        }

        // Erhöhe Confidence bei normalem Englisch mit Leerzeichen
        const spaceRatio = (text.match(/ /g) || []).length / text.length
        if (spaceRatio > 0.1 && spaceRatio < 0.2) {
            confidence += 0.05 // Normaler Text-Abstand
        }

        return {
            tokens: estimatedTokens,
            confidence: Math.max(0.7, Math.min(0.95, confidence))
        }
    }

    /**
     * Schätzt Input- und Output-Tokens für einen LLM-Call
     * 
     * @param inputText - User-Input oder Prompt
     * @param expectedOutputLength - Erwartete Output-Länge (default: 500 tokens)
     * @param modelId - Model-ID für Pricing
     */
    public estimateCost(
        inputText: string,
        expectedOutputLength: number = 500,
        modelId: string = 'default'
    ): TokenEstimate {
        // Input-Tokens schätzen
        const inputEstimate = this.estimateTokensFromText(inputText)

        // Output-Tokens (konservative Schätzung)
        const outputTokens = expectedOutputLength

        // Model-Pricing laden
        const pricing = this.getModelPricing(modelId)

        // Kosten berechnen
        const inputCostCents = inputEstimate.tokens * pricing.inputCentsPerToken
        const outputCostCents = outputTokens * pricing.outputCentsPerToken
        const totalCostCents = inputCostCents + outputCostCents

        return {
            inputTokens: inputEstimate.tokens,
            outputTokens,
            totalTokens: inputEstimate.tokens + outputTokens,
            estimatedCostCents: Math.ceil(totalCostCents * 100) / 100, // Runde auf 2 Dezimalstellen
            estimatedCostEur: totalCostCents / 100,
            confidence: inputEstimate.confidence
        }
    }

    /**
     * Pre-Flight Balance-Check
     * 
     * Prüft ob User genug Guthaben hat für den geschätzten LLM-Call
     * 
     * @param userBalanceCents - Aktuelles User-Guthaben in Cents
     * @param inputText - User-Input
     * @param modelId - Model-ID
     * @param expectedOutputLength - Erwartete Output-Länge
     * @param usingByok - Nutzt User eigenen API-Key? (kostenfrei)
     */
    public performPreFlightCheck(
        userBalanceCents: number,
        inputText: string,
        modelId: string = 'default',
        expectedOutputLength: number = 500,
        usingByok: boolean = false
    ): PreFlightCheck {
        // BYOK ist kostenfrei - immer erlauben
        if (usingByok) {
            return {
                allowed: true,
                userBalanceCents,
                estimatedCostCents: 0,
                safetyMarginCents: 0,
                requiredBalanceCents: 0,
                hasSufficientBalance: true,
                usingByok: true
            }
        }

        // Kosten schätzen
        const costEstimate = this.estimateCost(inputText, expectedOutputLength, modelId)

        // Safety-Margin hinzufügen (20% Reserve)
        const safetyMarginCents = Math.ceil(costEstimate.estimatedCostCents * (this.SAFETY_MARGIN_MULTIPLIER - 1))
        const requiredBalanceCents = Math.ceil(costEstimate.estimatedCostCents + safetyMarginCents)

        // Guthaben-Check
        const hasSufficientBalance = userBalanceCents >= requiredBalanceCents

        if (!hasSufficientBalance) {
            const shortfallCents = requiredBalanceCents - userBalanceCents
            const shortfallEur = shortfallCents / 100

            return {
                allowed: false,
                reason: `Insufficient balance. Required: €${(requiredBalanceCents / 100).toFixed(2)}, ` +
                       `Available: €${(userBalanceCents / 100).toFixed(2)}, ` +
                       `Shortfall: €${shortfallEur.toFixed(2)}`,
                userBalanceCents,
                estimatedCostCents: costEstimate.estimatedCostCents,
                safetyMarginCents,
                requiredBalanceCents,
                hasSufficientBalance: false,
                usingByok: false
            }
        }

        return {
            allowed: true,
            userBalanceCents,
            estimatedCostCents: costEstimate.estimatedCostCents,
            safetyMarginCents,
            requiredBalanceCents,
            hasSufficientBalance: true,
            usingByok: false
        }
    }

    /**
     * Berechnet exakte Kosten nach LLM-Response (Post-Flight)
     * NOW WITH VOLUME DISCOUNTS!
     * 
     * @param actualInputTokens - Tatsächliche Input-Tokens aus LLM-Response
     * @param actualOutputTokens - Tatsächliche Output-Tokens aus LLM-Response
     * @param modelId - Model-ID
     * @param monthlyTokens - User's total tokens used this month (for discount tier)
     */
    public calculateExactCost(
        actualInputTokens: number,
        actualOutputTokens: number,
        modelId: string = 'default',
        monthlyTokens: number = 0
    ): {
        costCents: number
        costEur: number
        originalCostCents?: number
        savingsCents?: number
        discountPercent?: number
        discountTier?: string
        inputTokens: number
        outputTokens: number
    } {
        const pricing = this.getModelPricing(modelId)

        const inputCostCents = actualInputTokens * pricing.inputCentsPerToken
        const outputCostCents = actualOutputTokens * pricing.outputCentsPerToken
        const totalCostCents = inputCostCents + outputCostCents

        // Determine discount tier
        const tierInfo = this.getDiscountTier(monthlyTokens)

        // Apply discount if applicable
        if (tierInfo.discountPercent > 0) {
            const discountResult = this.applyDiscount(
                Math.ceil(totalCostCents * 100) / 100,
                tierInfo.discountPercent
            )

            return {
                originalCostCents: discountResult.originalCostCents,
                costCents: discountResult.discountedCostCents,
                costEur: discountResult.discountedCostCents / 100,
                savingsCents: discountResult.savingsCents,
                discountPercent: discountResult.discountPercent,
                discountTier: tierInfo.label,
                inputTokens: actualInputTokens,
                outputTokens: actualOutputTokens
            }
        }

        // No discount - return base cost
        const finalCost = Math.ceil(totalCostCents * 100) / 100
        return {
            costCents: finalCost,
            costEur: finalCost / 100,
            discountPercent: 0,
            discountTier: tierInfo.label,
            inputTokens: actualInputTokens,
            outputTokens: actualOutputTokens
        }
    }

    /**
     * Lädt Pricing für ein Model
     */
    private getModelPricing(modelId: string): ModelPricing {
        // Normalisiere Model-ID (case-insensitive)
        const normalizedId = modelId.toLowerCase()

        // Suche exakte Übereinstimmung
        if (MODEL_PRICING[normalizedId]) {
            return MODEL_PRICING[normalizedId]
        }

        // Suche Teilübereinstimmung (z.B. "gpt-4o" matcht "openai/gpt-4o")
        const matchingKey = Object.keys(MODEL_PRICING).find(key => 
            key.includes(normalizedId) || normalizedId.includes(key)
        )

        if (matchingKey) {
            return MODEL_PRICING[matchingKey]
        }

        // Fallback zu Default-Pricing
        logger.warn(`[CostEstimator] Unknown model ID: ${modelId}, using default pricing`)
        return MODEL_PRICING['default']
    }

    /**
     * Schätzt Gesamt-Session-Kosten für Chat-Konversation
     * 
     * @param conversationHistory - Array von Messages
     * @param modelId - Model-ID
     */
    public estimateConversationCost(
        conversationHistory: Array<{ role: string; content: string }>,
        modelId: string = 'default'
    ): TokenEstimate {
        // Gesamte Konversation zusammenfassen
        const fullText = conversationHistory.map(msg => msg.content).join('\n')
        
        // Durchschnittliche Response-Länge schätzen
        const avgResponseLength = conversationHistory
            .filter(msg => msg.role === 'assistant')
            .reduce((sum, msg) => sum + msg.content.length, 0) / 
            Math.max(1, conversationHistory.filter(msg => msg.role === 'assistant').length)

        const expectedOutputTokens = Math.ceil(avgResponseLength / this.CHARS_PER_TOKEN)

        return this.estimateCost(fullText, expectedOutputTokens, modelId)
    }

    /**
     * Calculate potential savings with discount tiers
     * Used for marketing/upsell messaging
     * 
     * @param currentMonthlyTokens - User's current monthly tokens
     * @param projectedMonthlyTokens - Projected usage
     * @param avgCostPerToken - Average cost per token in cents
     */
    public calculatePotentialSavings(
        currentMonthlyTokens: number,
        projectedMonthlyTokens: number,
        avgCostPerToken: number = 0.0003
    ): {
        currentTier: string
        projectedTier: string
        currentMonthlyCost: number
        projectedMonthlyCost: number
        monthlySavings: number
        annualSavings: number
    } {
        const currentTier = this.getDiscountTier(currentMonthlyTokens)
        const projectedTier = this.getDiscountTier(projectedMonthlyTokens)

        const baseMonthlyCost = projectedMonthlyTokens * avgCostPerToken
        const currentDiscountMultiplier = 1 - (currentTier.discountPercent / 100)
        const projectedDiscountMultiplier = 1 - (projectedTier.discountPercent / 100)

        const currentMonthlyCost = baseMonthlyCost * currentDiscountMultiplier
        const projectedMonthlyCost = baseMonthlyCost * projectedDiscountMultiplier
        const monthlySavings = currentMonthlyCost - projectedMonthlyCost

        return {
            currentTier: currentTier.label,
            projectedTier: projectedTier.label,
            currentMonthlyCost: Math.ceil(currentMonthlyCost),
            projectedMonthlyCost: Math.ceil(projectedMonthlyCost),
            monthlySavings: Math.ceil(monthlySavings),
            annualSavings: Math.ceil(monthlySavings * 12)
        }
    }

    /**
     * Gibt Model-Pricing-Tabelle zurück (für Admin-Dashboard)
     */
    public getModelPricingTable(): Record<string, ModelPricing> {
        return MODEL_PRICING
    }

    // ==================== VOLUME DISCOUNT METHODS ====================

    /**
     * Determine discount tier based on monthly token usage
     * 
     * @param monthlyTokens - Total tokens consumed in current month
     * @returns Discount tier information
     */
    public getDiscountTier(monthlyTokens: number): {
        tier: DiscountTier
        discountPercent: number
        label: string
        color: string
        description: string
        nextTier?: {
            tier: DiscountTier
            tokensNeeded: number
            label: string
        }
    } {
        // Find current tier
        for (const [tier, config] of Object.entries(DISCOUNT_TIER_CONFIG)) {
            if (monthlyTokens >= config.minMonthlyTokens && monthlyTokens < config.maxMonthlyTokens) {
                // Calculate next tier info
                let nextTier = undefined
                if (tier !== DiscountTier.PLATINUM) {
                    const tierKeys = Object.keys(DiscountTier) as DiscountTier[]
                    const currentIndex = tierKeys.indexOf(tier as DiscountTier)
                    if (currentIndex < tierKeys.length - 1) {
                        const nextTierKey = tierKeys[currentIndex + 1]
                        const nextTierConfig = DISCOUNT_TIER_CONFIG[nextTierKey]
                        nextTier = {
                            tier: nextTierKey,
                            tokensNeeded: nextTierConfig.minMonthlyTokens - monthlyTokens,
                            label: nextTierConfig.label
                        }
                    }
                }

                return {
                    tier: tier as DiscountTier,
                    discountPercent: config.discountPercent,
                    label: config.label,
                    color: config.color,
                    description: config.description,
                    nextTier
                }
            }
        }

        // Default to Bronze if no match
        return {
            tier: DiscountTier.BRONZE,
            discountPercent: 0,
            label: 'Bronze',
            color: '#cd7f32',
            description: 'Standard tier - no discount',
            nextTier: {
                tier: DiscountTier.SILVER,
                tokensNeeded: 100000 - monthlyTokens,
                label: 'Silver'
            }
        }
    }

    /**
     * Apply discount to cost based on tier percentage
     * 
     * @param costCents - Original cost in cents
     * @param discountPercent - Discount percentage (0-100)
     * @returns Cost breakdown with discount applied
     */
    private applyDiscount(costCents: number, discountPercent: number): {
        originalCostCents: number
        discountedCostCents: number
        savingsCents: number
        discountPercent: number
    } {
        if (discountPercent <= 0) {
            return {
                originalCostCents: costCents,
                discountedCostCents: costCents,
                savingsCents: 0,
                discountPercent: 0
            }
        }

        const discountMultiplier = 1 - (discountPercent / 100)
        const discountedCostCents = Math.ceil(costCents * discountMultiplier)
        const savingsCents = costCents - discountedCostCents

        return {
            originalCostCents: costCents,
            discountedCostCents,
            savingsCents,
            discountPercent
        }
    }

    /**
     * Get all discount tiers (for user dashboard)
     */
    public getDiscountTiers(): Record<DiscountTier, DiscountTierConfig> {
        return DISCOUNT_TIER_CONFIG
    }
}

// Export Singleton-Instanz
export const costEstimatorService = CostEstimatorService.getInstance()
