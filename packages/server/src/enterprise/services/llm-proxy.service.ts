import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'

/**
 * M.A.T.E. LLM Proxy Service
 * 
 * Zentraler Service für alle LLM-Anfragen über OpenRouter.
 * Unterstützt Token-Tracking, Billing-Integration und Rate-Limiting.
 * 
 * Konfiguration:
 * - OPENROUTER_API_KEY: API-Key für OpenRouter
 * - OPENROUTER_BASE_URL: API-Endpunkt (default: https://openrouter.ai/api/v1)
 * - LLM_DEFAULT_MODEL: Standard-Modell (default: moonshotai/kimi-k2)
 * - LLM_FALLBACK_MODEL: Fallback-Modell (default: qwen/qwen3-max)
 */

export interface LLMRequestOptions {
    model?: string
    messages: Array<{
        role: 'system' | 'user' | 'assistant'
        content: string
    }>
    temperature?: number
    max_tokens?: number
    stream?: boolean
    userId?: string
    workspaceId?: string
}

export interface LLMResponse {
    id: string
    model: string
    choices: Array<{
        index: number
        message: {
            role: string
            content: string
        }
        finish_reason: string
    }>
    usage: TokenUsage
    created: number
}

export interface TokenUsage {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
}

export interface LLMProxyConfig {
    apiKey: string
    baseUrl: string
    defaultModel: string
    fallbackModel: string
    maxRetries: number
    timeoutMs: number
}

// Preiskonfiguration pro 1M Tokens (in EUR)
export const TOKEN_PRICING = {
    // Kimi K2 (Moonshot) - Hauptmodell für M.A.T.E.
    'moonshotai/kimi-k2': {
        input: 0.60,    // €0.60 pro 1M Input-Tokens
        output: 2.50    // €2.50 pro 1M Output-Tokens
    },
    // Kimi K2 mit Extended Thinking (Deep Reasoning)
    'moonshotai/kimi-k2-instruct': {
        input: 0.60,
        output: 2.50
    },
    // OpenAI Modelle
    'openai/gpt-4o': {
        input: 2.50,
        output: 10.00
    },
    'openai/gpt-4o-mini': {
        input: 0.15,
        output: 0.60
    },
    'openai/gpt-4-turbo': {
        input: 10.00,
        output: 30.00
    },
    'openai/o1': {
        input: 15.00,
        output: 60.00
    },
    'openai/o1-mini': {
        input: 3.00,
        output: 12.00
    },
    // Anthropic Modelle
    'anthropic/claude-3-5-sonnet': {
        input: 3.00,
        output: 15.00
    },
    'anthropic/claude-3-opus': {
        input: 15.00,
        output: 75.00
    },
    'anthropic/claude-3-haiku': {
        input: 0.25,
        output: 1.25
    },
    // Google Modelle
    'google/gemini-pro-1.5': {
        input: 1.25,
        output: 5.00
    },
    'google/gemini-flash-1.5': {
        input: 0.075,
        output: 0.30
    },
    // DeepSeek
    'deepseek/deepseek-r1': {
        input: 0.55,
        output: 2.19
    },
    'deepseek/deepseek-chat': {
        input: 0.14,
        output: 0.28
    },
    // Qwen (Alibaba) - Fallback-Modell für M.A.T.E.
    'qwen/qwen3-max': {
        input: 1.10,    // ~$1.20 = €1.10 pro 1M Input-Tokens
        output: 5.50    // ~$6.00 = €5.50 pro 1M Output-Tokens
    },
    'qwen/qwen3-235b-a22b': {
        input: 0.20,
        output: 0.40
    },
    'qwen/qwen-turbo': {
        input: 0.05,
        output: 0.10
    },
    // Default Fallback (basierend auf Kimi K2 Pricing)
    'default': {
        input: 0.60,
        output: 2.50
    }
} as const

// Kimi K2 Extended Thinking Konfiguration
export const KIMI_K2_CONFIG = {
    // Standard Kimi K2
    standard: {
        model: 'moonshotai/kimi-k2',
        temperature: 0.7,
        maxTokens: 8192,
        description: 'Standard Kimi K2 - schnell und effizient'
    },
    // Extended Thinking für komplexe Aufgaben
    thinking: {
        model: 'moonshotai/kimi-k2-instruct',
        temperature: 0.7,
        maxTokens: 16384,
        // Aktiviert Chain-of-Thought Reasoning
        systemPrefix: `Du bist ein intelligenter Assistent mit erweiterten Denkfähigkeiten.
Wenn du komplexe Probleme löst:
1. Analysiere das Problem schrittweise
2. Denke laut nach und erkläre deinen Gedankengang
3. Ziehe verschiedene Ansätze in Betracht
4. Komme zu einer begründeten Schlussfolgerung`,
        description: 'Kimi K2 mit Extended Thinking - für komplexe Aufgaben'
    }
} as const

class LLMProxyService {
    private config: LLMProxyConfig
    private static instance: LLMProxyService

    private constructor() {
        this.config = {
            apiKey: process.env.OPENROUTER_API_KEY || '',
            baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
            defaultModel: process.env.LLM_DEFAULT_MODEL || 'moonshotai/kimi-k2',
            fallbackModel: process.env.LLM_FALLBACK_MODEL || 'qwen/qwen3-max',
            maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3'),
            timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '30000')
        }
    }

    public static getInstance(): LLMProxyService {
        if (!LLMProxyService.instance) {
            LLMProxyService.instance = new LLMProxyService()
        }
        return LLMProxyService.instance
    }

    /**
     * Sendet eine Chat-Completion-Anfrage an OpenRouter
     */
    public async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
        if (!this.config.apiKey) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'OPENROUTER_API_KEY nicht konfiguriert'
            )
        }

        const model = options.model || this.config.defaultModel
        const startTime = Date.now()
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await this.makeRequest(model, options)
                
                const duration = Date.now() - startTime
                logger.info(`[LLMProxy] Erfolgreiche Anfrage an ${model} in ${duration}ms`, {
                    model,
                    usage: response.usage,
                    attempt,
                    duration
                })

                return response
            } catch (error: any) {
                lastError = error
                logger.warn(`[LLMProxy] Versuch ${attempt}/${this.config.maxRetries} fehlgeschlagen`, {
                    model,
                    error: error.message,
                    attempt
                })

                if (attempt < this.config.maxRetries) {
                    // Exponential Backoff
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
                    await this.sleep(delay)
                }
            }
        }

        // Fallback auf alternatives Modell versuchen
        if (model !== this.config.fallbackModel) {
            logger.info(`[LLMProxy] Versuche Fallback-Modell: ${this.config.fallbackModel}`)
            try {
                return await this.makeRequest(this.config.fallbackModel, options)
            } catch (fallbackError: any) {
                logger.error(`[LLMProxy] Fallback-Modell ebenfalls fehlgeschlagen`, {
                    error: fallbackError.message
                })
            }
        }

        throw new InternalFlowiseError(
            StatusCodes.SERVICE_UNAVAILABLE,
            `LLM-Anfrage fehlgeschlagen nach ${this.config.maxRetries} Versuchen: ${lastError?.message}`
        )
    }

    /**
     * Führt die HTTP-Anfrage an OpenRouter durch
     */
    private async makeRequest(model: string, options: LLMRequestOptions): Promise<LLMResponse> {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs)

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'HTTP-Referer': process.env.APP_URL || 'https://builder.getmate.ai',
                    'X-Title': 'M.A.T.E. Agent Builder'
                },
                body: JSON.stringify({
                    model,
                    messages: options.messages,
                    temperature: options.temperature ?? 0.7,
                    max_tokens: options.max_tokens ?? 4096,
                    stream: false
                }),
                signal: controller.signal
            })

            if (!response.ok) {
                const errorBody = await response.text()
                throw new Error(`OpenRouter API Fehler ${response.status}: ${errorBody}`)
            }

            const data = await response.json() as LLMResponse
            return data
        } finally {
            clearTimeout(timeoutId)
        }
    }

    /**
     * Berechnet die Kosten für Token-Nutzung
     */
    public calculateTokenCost(usage: TokenUsage, model: string): { 
        costCents: number
        inputCostCents: number
        outputCostCents: number 
    } {
        const pricing = TOKEN_PRICING[model as keyof typeof TOKEN_PRICING] || TOKEN_PRICING.default
        
        // Umrechnung: Preis pro 1M Tokens → Preis pro Token → in Cents
        const inputCostEur = (usage.prompt_tokens / 1_000_000) * pricing.input
        const outputCostEur = (usage.completion_tokens / 1_000_000) * pricing.output
        
        const inputCostCents = Math.ceil(inputCostEur * 100)
        const outputCostCents = Math.ceil(outputCostEur * 100)
        const costCents = inputCostCents + outputCostCents

        return {
            costCents,
            inputCostCents,
            outputCostCents
        }
    }

    /**
     * Prüft ob der API-Key konfiguriert ist
     */
    public isConfigured(): boolean {
        return !!this.config.apiKey
    }

    /**
     * Gibt das Standard-Modell zurück
     */
    public getDefaultModel(): string {
        return this.config.defaultModel
    }

    /**
     * Gibt verfügbare Modelle zurück
     */
    public getAvailableModels(): string[] {
        return Object.keys(TOKEN_PRICING).filter(k => k !== 'default')
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

export const llmProxyService = LLMProxyService.getInstance()
