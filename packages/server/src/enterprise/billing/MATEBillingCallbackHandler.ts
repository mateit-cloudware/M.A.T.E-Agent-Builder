/**
 * M.A.T.E. Billing Callback Handler
 * 
 * This callback handler tracks LLM token usage and reports it to the
 * WalletService for billing. It integrates with Flowise's analytics system.
 * 
 * USAGE:
 * Add this handler to the callbacks array when executing LLM chains/models.
 * The handler will automatically track token usage and deduct from wallet.
 * 
 * PRICING:
 * - LLM: €0.03 per 1,000 tokens (3 cents per 1K tokens)
 * - Voice: €1.50 per minute (handled separately via VAPI integration)
 */

import { BaseCallbackHandler } from '@langchain/core/callbacks/base'
import { ChainValues } from '@langchain/core/utils/types'
import { LLMResult, Generation } from '@langchain/core/outputs'
import { Serialized } from '@langchain/core/load/serializable'
import logger from '../../utils/logger'
import { WalletService, PricingConfig } from '../../enterprise/services/wallet.service'
import { UsageType } from '../../enterprise/database/entities/wallet-transaction.entity'

// Enable/disable billing tracking
const BILLING_ENABLED = process.env.MATE_BILLING_ENABLED !== 'false'

/**
 * Options for the MATEBillingCallbackHandler
 */
export interface MATEBillingCallbackHandlerOptions {
    userId: string
    chatflowId?: string
    chatId?: string
    skipBilling?: boolean // Set to true for free tier or internal operations
}

/**
 * Token usage accumulator for a single run
 */
interface TokenUsage {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    modelName?: string
}

/**
 * M.A.T.E. Billing Callback Handler
 * 
 * Tracks LLM token usage and reports to the billing system.
 * Implements the LangChain callback handler interface.
 */
export class MATEBillingCallbackHandler extends BaseCallbackHandler {
    name = 'MATEBillingCallbackHandler'
    
    private userId: string
    private chatflowId?: string
    private chatId?: string
    private skipBilling: boolean
    private tokenUsage: TokenUsage
    private walletService: WalletService

    constructor(options: MATEBillingCallbackHandlerOptions) {
        super()
        this.userId = options.userId
        this.chatflowId = options.chatflowId
        this.chatId = options.chatId
        this.skipBilling = options.skipBilling || false
        this.tokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        }
        this.walletService = new WalletService()
    }

    /**
     * Called when an LLM starts processing
     */
    async handleLLMStart(
        llm: Serialized,
        prompts: string[],
        runId: string,
        parentRunId?: string,
        extraParams?: Record<string, unknown>,
        tags?: string[],
        metadata?: Record<string, unknown>
    ): Promise<void> {
        // Extract model name if available
        const modelName = (llm as any)?.kwargs?.model || 
                         (llm as any)?.kwargs?.modelName ||
                         llm.id?.[llm.id.length - 1]
        
        if (modelName) {
            this.tokenUsage.modelName = modelName
        }

        logger.debug(`[M.A.T.E. Billing] LLM started: model=${modelName}, runId=${runId}`)
    }

    /**
     * Called when an LLM finishes processing
     * This is where we extract token usage and bill the user
     */
    async handleLLMEnd(
        output: LLMResult,
        runId: string,
        parentRunId?: string
    ): Promise<void> {
        if (!BILLING_ENABLED || this.skipBilling) {
            logger.debug('[M.A.T.E. Billing] Billing skipped')
            return
        }

        try {
            // Extract token usage from the output
            const tokenUsage = this.extractTokenUsage(output)
            
            if (tokenUsage.totalTokens > 0) {
                this.tokenUsage.promptTokens += tokenUsage.promptTokens
                this.tokenUsage.completionTokens += tokenUsage.completionTokens
                this.tokenUsage.totalTokens += tokenUsage.totalTokens

                // Calculate cost and charge user
                await this.chargeLLMUsage(tokenUsage)
            }
        } catch (error) {
            logger.error('[M.A.T.E. Billing] Error processing LLM end:', error)
            // Don't throw - billing errors shouldn't break the user's flow
        }
    }

    /**
     * Called when an LLM encounters an error
     */
    async handleLLMError(
        error: Error,
        runId: string,
        parentRunId?: string
    ): Promise<void> {
        logger.debug(`[M.A.T.E. Billing] LLM error: ${error.message}`)
        // We don't charge for errors
    }

    /**
     * Extract token usage from LLM output
     * Handles different output formats from various LLM providers
     */
    private extractTokenUsage(output: LLMResult): TokenUsage {
        const usage: TokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        }

        // Method 1: Standard LangChain tokenUsage format
        if (output.llmOutput?.tokenUsage) {
            const tokenUsage = output.llmOutput.tokenUsage
            usage.promptTokens = tokenUsage.promptTokens || 0
            usage.completionTokens = tokenUsage.completionTokens || 0
            usage.totalTokens = tokenUsage.totalTokens || (usage.promptTokens + usage.completionTokens)
            return usage
        }

        // Method 2: estimatedTokenUsage from OpenAI non-streaming
        if (output.llmOutput?.estimatedTokenUsage) {
            const estimated = output.llmOutput.estimatedTokenUsage
            usage.promptTokens = estimated.promptTokens || 0
            usage.completionTokens = estimated.completionTokens || 0
            usage.totalTokens = estimated.totalTokens || (usage.promptTokens + usage.completionTokens)
            return usage
        }

        // Method 3: usage_metadata format (Google, Anthropic)
        const generations = output.generations
        if (generations && generations.length > 0 && generations[0].length > 0) {
            const gen = generations[0][0] as any
            if (gen.message?.usage_metadata) {
                const metadata = gen.message.usage_metadata
                usage.promptTokens = metadata.input_tokens || 0
                usage.completionTokens = metadata.output_tokens || 0
                usage.totalTokens = metadata.total_tokens || (usage.promptTokens + usage.completionTokens)
                return usage
            }

            // Method 4: Anthropic format
            if (gen.message?.response_metadata?.usage) {
                const meta = gen.message.response_metadata.usage
                usage.promptTokens = meta.input_tokens || 0
                usage.completionTokens = meta.output_tokens || 0
                usage.totalTokens = usage.promptTokens + usage.completionTokens
                return usage
            }
        }

        // Method 5: If no token usage found, estimate based on content length
        // This is a fallback and should be rare
        if (generations && generations.length > 0) {
            const text = generations[0].map((g: Generation) => g.text || '').join('')
            // Rough estimate: 1 token ≈ 4 characters
            usage.totalTokens = Math.ceil(text.length / 4)
            usage.completionTokens = usage.totalTokens
            logger.warn(`[M.A.T.E. Billing] Estimated tokens from content length: ${usage.totalTokens}`)
        }

        return usage
    }

    /**
     * Charge the user for LLM usage
     */
    private async chargeLLMUsage(tokenUsage: TokenUsage): Promise<void> {
        if (tokenUsage.totalTokens <= 0) {
            return
        }

        try {
            const result = await this.walletService.chargeLLMUsage(
                this.userId,
                tokenUsage.totalTokens,
                this.tokenUsage.modelName,
                this.chatflowId
            )

            logger.info(
                `[M.A.T.E. Billing] Charged: user=${this.userId}, ` +
                `tokens=${tokenUsage.totalTokens}, ` +
                `cost=€${(result.costCents / 100).toFixed(4)}, ` +
                `newBalance=€${(result.newBalance / 100).toFixed(2)}`
            )
        } catch (error: any) {
            if (error.message === 'Insufficient Balance') {
                logger.warn(`[M.A.T.E. Billing] Insufficient balance for user ${this.userId}`)
                // TODO: Consider blocking further LLM calls for this session
            } else {
                logger.error('[M.A.T.E. Billing] Failed to charge LLM usage:', error)
            }
            // Don't throw - we don't want billing issues to break the user's flow
        }
    }

    /**
     * Get accumulated token usage for this handler
     */
    public getTokenUsage(): TokenUsage {
        return { ...this.tokenUsage }
    }

    /**
     * Reset token usage counter
     */
    public resetTokenUsage(): void {
        this.tokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            modelName: this.tokenUsage.modelName
        }
    }
}

/**
 * Create a billing callback handler for a user
 * 
 * @param userId - The user ID to bill
 * @param options - Additional options
 * @returns MATEBillingCallbackHandler instance
 */
export const createBillingHandler = (
    userId: string,
    options: Partial<MATEBillingCallbackHandlerOptions> = {}
): MATEBillingCallbackHandler => {
    return new MATEBillingCallbackHandler({
        userId,
        ...options
    })
}

/**
 * Check if billing is enabled
 */
export const isBillingEnabled = (): boolean => BILLING_ENABLED

/**
 * Get current pricing configuration
 */
export const getPricingConfig = () => ({
    llmCentsPer1kTokens: PricingConfig.LLM_CENTS_PER_1K_TOKENS,
    voiceCentsPerMinute: PricingConfig.VOICE_CENTS_PER_MINUTE,
    minimumTopupCents: PricingConfig.MINIMUM_TOPUP_CENTS
})
