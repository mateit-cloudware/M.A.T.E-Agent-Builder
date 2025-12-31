/**
 * M.A.T.E. Billing Service
 * 
 * Zentrale Schnittstelle für alle Abrechnungsfunktionen:
 * - Token-basierte LLM-Abrechnung (getrennt nach Input/Output)
 * - Minuten-basierte Voice-Abrechnung
 * - Volumen-Rabatte basierend auf Nutzung
 * - Erweiterte Preiskalkulation mit Margen
 * 
 * WICHTIG: Voice und LLM werden strikt getrennt abgerechnet!
 */

import { StatusCodes } from 'http-status-codes'
import { DataSource, Between } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { WalletService, PricingConfig } from './wallet.service'
import { WalletTransaction, UsageType } from '../database/entities/wallet-transaction.entity'
import { TOKEN_PRICING } from './llm-proxy.service'

// ==================== PRICING CONFIGURATION ====================

/**
 * Erweiterte Preiskonfiguration mit Margen
 * Alle Preise in EUR pro Einheit
 */
export const ExtendedPricingConfig = {
    // === TOKEN PRICING ===
    token: {
        // Basiskosten (was wir bezahlen)
        baseCosts: {
            // Kimi K2 (Hauptmodell)
            'moonshotai/kimi-k2': { input: 0.60, output: 2.50 },
            // Qwen3-Max (Fallback)
            'qwen/qwen3-max': { input: 1.10, output: 5.50 },
            // OpenAI
            'openai/gpt-4o': { input: 2.50, output: 10.00 },
            'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
            // Default
            'default': { input: 0.60, output: 2.50 }
        } as Record<string, { input: number; output: number }>,
        // Marge auf Token-Kosten
        marginPercent: 40
    },

    // === VOICE PRICING ===
    voice: {
        // Basiskosten pro Minute (in EUR)
        baseCostPerMinute: {
            inbound: 0.08,   // Eingehende Anrufe
            outbound: 0.12   // Ausgehende Anrufe
        },
        // Monatliche Kosten pro Telefonnummer
        phoneNumberMonthly: 5.00,
        // Marge auf Voice-Kosten
        marginPercent: 30
    },

    // === VOLUMEN-RABATTE ===
    volumeDiscounts: {
        token: [
            { minTokens: 0, discount: 0 },           // Bis 100k: 0% Rabatt
            { minTokens: 100_000, discount: 5 },     // 100k-500k: 5% Rabatt
            { minTokens: 500_000, discount: 10 },    // 500k-1M: 10% Rabatt
            { minTokens: 1_000_000, discount: 15 },  // 1M-5M: 15% Rabatt
            { minTokens: 5_000_000, discount: 20 },  // 5M+: 20% Rabatt
        ],
        voice: [
            { minMinutes: 0, discount: 0 },          // Bis 60min: 0% Rabatt
            { minMinutes: 60, discount: 5 },         // 60-300min: 5% Rabatt
            { minMinutes: 300, discount: 10 },       // 300-1000min: 10% Rabatt
            { minMinutes: 1000, discount: 15 },      // 1000-5000min: 15% Rabatt
            { minMinutes: 5000, discount: 20 },      // 5000+min: 20% Rabatt
        ]
    }
} as const

// ==================== TYPES ====================

export interface TokenBillingDetails {
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    baseCostEur: number
    marginEur: number
    discountPercent: number
    discountEur: number
    finalCostEur: number
    finalCostCents: number
}

export interface VoiceBillingDetails {
    durationSeconds: number
    durationMinutes: number
    callType: 'inbound' | 'outbound'
    baseCostEur: number
    marginEur: number
    discountPercent: number
    discountEur: number
    finalCostEur: number
    finalCostCents: number
}

export interface MonthlyUsageSummary {
    period: {
        year: number
        month: number
        startDate: Date
        endDate: Date
    }
    tokens: {
        total: number
        inputTokens: number
        outputTokens: number
        costCents: number
        costEur: number
    }
    voice: {
        totalSeconds: number
        totalMinutes: number
        costCents: number
        costEur: number
    }
    total: {
        costCents: number
        costEur: number
        discountAppliedCents: number
    }
    topModels: Array<{ model: string; tokens: number; costCents: number }>
}

export interface InvoiceData {
    invoiceNumber: string
    userId: string
    userEmail: string
    period: { start: Date; end: Date }
    items: Array<{
        description: string
        quantity: number
        unit: string
        unitPrice: number
        total: number
    }>
    subtotal: number
    discount: number
    tax: number
    total: number
    currency: string
    createdAt: Date
    dueDate: Date
}

// ==================== BILLING SERVICE ====================

class BillingService {
    private dataSource: DataSource
    private walletService: WalletService
    private static instance: BillingService

    private constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.walletService = new WalletService()
    }

    public static getInstance(): BillingService {
        if (!BillingService.instance) {
            BillingService.instance = new BillingService()
        }
        return BillingService.instance
    }

    // ==================== TOKEN BILLING ====================

    /**
     * Berechnet Token-Kosten mit Margen und Volumen-Rabatten
     */
    public calculateTokenCost(
        inputTokens: number,
        outputTokens: number,
        model: string,
        monthlyTokenUsage: number = 0
    ): TokenBillingDetails {
        const pricing = ExtendedPricingConfig.token.baseCosts[model] 
            || ExtendedPricingConfig.token.baseCosts['default']

        const totalTokens = inputTokens + outputTokens

        // Basiskosten (pro 1M Tokens)
        const inputCostEur = (inputTokens / 1_000_000) * pricing.input
        const outputCostEur = (outputTokens / 1_000_000) * pricing.output
        const baseCostEur = inputCostEur + outputCostEur

        // Marge hinzufügen
        const marginPercent = ExtendedPricingConfig.token.marginPercent
        const marginEur = baseCostEur * (marginPercent / 100)
        const costWithMarginEur = baseCostEur + marginEur

        // Volumen-Rabatt berechnen
        const discountPercent = this.getTokenVolumeDiscount(monthlyTokenUsage + totalTokens)
        const discountEur = costWithMarginEur * (discountPercent / 100)
        const finalCostEur = costWithMarginEur - discountEur

        // In Cents umrechnen (aufgerundet)
        const finalCostCents = Math.ceil(finalCostEur * 100)

        return {
            model,
            inputTokens,
            outputTokens,
            totalTokens,
            baseCostEur,
            marginEur,
            discountPercent,
            discountEur,
            finalCostEur,
            finalCostCents
        }
    }

    /**
     * Berechnet und bucht Token-Nutzung
     */
    public async chargeTokenUsage(
        userId: string,
        inputTokens: number,
        outputTokens: number,
        model: string,
        metadata?: {
            chatflowId?: string
            flowId?: string
            sessionId?: string
        }
    ): Promise<TokenBillingDetails & { transactionId: string; newBalance: number }> {
        // Monatliche Nutzung für Volumen-Rabatt ermitteln
        const monthlyUsage = await this.getMonthlyTokenUsage(userId)
        
        const billing = this.calculateTokenCost(
            inputTokens,
            outputTokens,
            model,
            monthlyUsage
        )

        if (billing.finalCostCents <= 0) {
            return {
                ...billing,
                transactionId: '',
                newBalance: 0
            }
        }

        const result = await this.walletService.deductBalance(
            userId,
            billing.finalCostCents,
            UsageType.LLM,
            {
                tokensUsed: billing.totalTokens,
                modelName: model,
                chatflowId: metadata?.chatflowId,
                flowId: metadata?.flowId,
                description: `LLM: ${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens (${model})`
            }
        )

        logger.info('[Billing] Token-Nutzung abgerechnet', {
            userId,
            model,
            tokens: billing.totalTokens,
            costCents: billing.finalCostCents,
            discountPercent: billing.discountPercent
        })

        return {
            ...billing,
            transactionId: result.transactionId,
            newBalance: result.newBalance
        }
    }

    // ==================== VOICE BILLING ====================

    /**
     * Berechnet Voice-Kosten mit Margen und Volumen-Rabatten
     */
    public calculateVoiceCost(
        durationSeconds: number,
        callType: 'inbound' | 'outbound' = 'inbound',
        monthlyVoiceMinutes: number = 0
    ): VoiceBillingDetails {
        const durationMinutes = durationSeconds / 60
        const pricePerMinute = ExtendedPricingConfig.voice.baseCostPerMinute[callType]

        // Basiskosten
        const baseCostEur = durationMinutes * pricePerMinute

        // Marge hinzufügen
        const marginPercent = ExtendedPricingConfig.voice.marginPercent
        const marginEur = baseCostEur * (marginPercent / 100)
        const costWithMarginEur = baseCostEur + marginEur

        // Volumen-Rabatt berechnen
        const discountPercent = this.getVoiceVolumeDiscount(monthlyVoiceMinutes + durationMinutes)
        const discountEur = costWithMarginEur * (discountPercent / 100)
        const finalCostEur = costWithMarginEur - discountEur

        // In Cents umrechnen (aufgerundet)
        const finalCostCents = Math.ceil(finalCostEur * 100)

        return {
            durationSeconds,
            durationMinutes,
            callType,
            baseCostEur,
            marginEur,
            discountPercent,
            discountEur,
            finalCostEur,
            finalCostCents
        }
    }

    /**
     * Berechnet und bucht Voice-Nutzung
     */
    public async chargeVoiceUsage(
        userId: string,
        durationSeconds: number,
        callType: 'inbound' | 'outbound' = 'inbound',
        metadata?: {
            callId?: string
            phoneNumber?: string
            chatflowId?: string
        }
    ): Promise<VoiceBillingDetails & { transactionId: string; newBalance: number }> {
        // Monatliche Nutzung für Volumen-Rabatt ermitteln
        const monthlyUsage = await this.getMonthlyVoiceUsage(userId)
        
        const billing = this.calculateVoiceCost(
            durationSeconds,
            callType,
            monthlyUsage
        )

        if (billing.finalCostCents <= 0) {
            return {
                ...billing,
                transactionId: '',
                newBalance: 0
            }
        }

        const result = await this.walletService.deductBalance(
            userId,
            billing.finalCostCents,
            UsageType.VOICE,
            {
                voiceSeconds: durationSeconds,
                callId: metadata?.callId,
                chatflowId: metadata?.chatflowId,
                description: `Voice (${callType}): ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
            }
        )

        logger.info('[Billing] Voice-Nutzung abgerechnet', {
            userId,
            callType,
            durationSeconds,
            costCents: billing.finalCostCents,
            discountPercent: billing.discountPercent
        })

        return {
            ...billing,
            transactionId: result.transactionId,
            newBalance: result.newBalance
        }
    }

    // ==================== USAGE ANALYTICS ====================

    /**
     * Holt monatliche Token-Nutzung für Volumen-Rabatt-Berechnung
     */
    public async getMonthlyTokenUsage(userId: string): Promise<number> {
        try {
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            
            const summary = await this.walletService.getUsageSummary(userId, startOfMonth, now)
            return summary.totalTokens
        } catch {
            return 0
        }
    }

    /**
     * Holt monatliche Voice-Nutzung für Volumen-Rabatt-Berechnung
     */
    public async getMonthlyVoiceUsage(userId: string): Promise<number> {
        try {
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            
            const summary = await this.walletService.getUsageSummary(userId, startOfMonth, now)
            return Math.floor(summary.totalVoiceSeconds / 60)
        } catch {
            return 0
        }
    }

    /**
     * Detaillierte monatliche Nutzungsübersicht
     */
    public async getMonthlyUsageSummary(
        userId: string,
        year: number,
        month: number
    ): Promise<MonthlyUsageSummary> {
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0, 23, 59, 59, 999)

        const wallet = await this.walletService.getOrCreateWallet(userId)

        // Transaktionen für den Zeitraum holen
        const txRepo = this.dataSource.getRepository(WalletTransaction)
        const transactions = await txRepo.find({
            where: {
                walletId: wallet.id,
                createdAt: Between(startDate, endDate)
            },
            order: { createdAt: 'DESC' }
        })

        // Aggregation
        let totalTokens = 0
        let totalInputTokens = 0
        let totalOutputTokens = 0
        let tokenCostCents = 0
        let totalVoiceSeconds = 0
        let voiceCostCents = 0
        const modelUsage: Record<string, { tokens: number; costCents: number }> = {}

        for (const tx of transactions) {
            if (tx.usageType === UsageType.LLM && tx.tokensUsed) {
                totalTokens += tx.tokensUsed
                tokenCostCents += Math.abs(tx.amountCents)
                
                const model = tx.modelName || 'unknown'
                if (!modelUsage[model]) {
                    modelUsage[model] = { tokens: 0, costCents: 0 }
                }
                modelUsage[model].tokens += tx.tokensUsed
                modelUsage[model].costCents += Math.abs(tx.amountCents)
            }

            if (tx.usageType === UsageType.VOICE && tx.voiceSeconds) {
                totalVoiceSeconds += tx.voiceSeconds
                voiceCostCents += Math.abs(tx.amountCents)
            }
        }

        // Top-Modelle sortieren
        const topModels = Object.entries(modelUsage)
            .map(([model, usage]) => ({ model, ...usage }))
            .sort((a, b) => b.costCents - a.costCents)
            .slice(0, 5)

        const totalCostCents = tokenCostCents + voiceCostCents

        return {
            period: {
                year,
                month,
                startDate,
                endDate
            },
            tokens: {
                total: totalTokens,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                costCents: tokenCostCents,
                costEur: tokenCostCents / 100
            },
            voice: {
                totalSeconds: totalVoiceSeconds,
                totalMinutes: Math.floor(totalVoiceSeconds / 60),
                costCents: voiceCostCents,
                costEur: voiceCostCents / 100
            },
            total: {
                costCents: totalCostCents,
                costEur: totalCostCents / 100,
                discountAppliedCents: 0 // TODO: Track discounts in transactions
            },
            topModels
        }
    }

    // ==================== INVOICE GENERATION ====================

    /**
     * Generiert Rechnungsdaten für einen Monat
     */
    public async generateInvoiceData(
        userId: string,
        year: number,
        month: number
    ): Promise<InvoiceData> {
        const summary = await this.getMonthlyUsageSummary(userId, year, month)
        
        // Benutzerinformationen holen
        const wallet = await this.walletService.getOrCreateWallet(userId)
        
        const invoiceNumber = `INV-${year}${String(month).padStart(2, '0')}-${userId.substring(0, 8).toUpperCase()}`

        const items: InvoiceData['items'] = []

        // Token-Nutzung
        if (summary.tokens.total > 0) {
            items.push({
                description: 'LLM Token-Nutzung',
                quantity: summary.tokens.total,
                unit: 'Tokens',
                unitPrice: summary.tokens.costCents / summary.tokens.total,
                total: summary.tokens.costCents / 100
            })
        }

        // Voice-Nutzung
        if (summary.voice.totalMinutes > 0) {
            items.push({
                description: 'Voice-Minuten',
                quantity: summary.voice.totalMinutes,
                unit: 'Minuten',
                unitPrice: summary.voice.costCents / summary.voice.totalMinutes,
                total: summary.voice.costCents / 100
            })
        }

        const subtotal = summary.total.costEur
        const discount = summary.total.discountAppliedCents / 100
        const tax = 0 // TODO: USt-Berechnung
        const total = subtotal - discount + tax

        return {
            invoiceNumber,
            userId,
            userEmail: '', // TODO: Aus User-Entity holen
            period: {
                start: summary.period.startDate,
                end: summary.period.endDate
            },
            items,
            subtotal,
            discount,
            tax,
            total,
            currency: 'EUR',
            createdAt: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 Tage
        }
    }

    // ==================== VOLUME DISCOUNTS ====================

    private getTokenVolumeDiscount(totalTokens: number): number {
        const tiers = ExtendedPricingConfig.volumeDiscounts.token
        let discount = 0
        
        for (const tier of tiers) {
            if (totalTokens >= tier.minTokens) {
                discount = tier.discount
            }
        }
        
        return discount
    }

    private getVoiceVolumeDiscount(totalMinutes: number): number {
        const tiers = ExtendedPricingConfig.volumeDiscounts.voice
        let discount = 0
        
        for (const tier of tiers) {
            if (totalMinutes >= tier.minMinutes) {
                discount = tier.discount
            }
        }
        
        return discount
    }

    // ==================== PRICING INFO ====================

    /**
     * Gibt aktuelle Preiskonfiguration zurück (für Admin-Dashboard)
     */
    public getPricingInfo(): typeof ExtendedPricingConfig {
        return ExtendedPricingConfig
    }

    /**
     * Berechnet geschätzte Kosten für einen Nutzungsplan
     */
    public estimateMonthlyCost(
        estimatedTokens: number,
        estimatedVoiceMinutes: number,
        preferredModel: string = 'moonshotai/kimi-k2'
    ): {
        tokenCostEur: number
        voiceCostEur: number
        totalCostEur: number
        appliedDiscounts: { token: number; voice: number }
    } {
        // Token-Kosten mit Rabatt
        const tokenBilling = this.calculateTokenCost(
            Math.floor(estimatedTokens * 0.7), // ~70% Input
            Math.floor(estimatedTokens * 0.3), // ~30% Output
            preferredModel,
            estimatedTokens
        )

        // Voice-Kosten mit Rabatt
        const voiceBilling = this.calculateVoiceCost(
            estimatedVoiceMinutes * 60,
            'inbound',
            estimatedVoiceMinutes
        )

        return {
            tokenCostEur: tokenBilling.finalCostEur,
            voiceCostEur: voiceBilling.finalCostEur,
            totalCostEur: tokenBilling.finalCostEur + voiceBilling.finalCostEur,
            appliedDiscounts: {
                token: tokenBilling.discountPercent,
                voice: voiceBilling.discountPercent
            }
        }
    }
}

export const billingService = BillingService.getInstance()
