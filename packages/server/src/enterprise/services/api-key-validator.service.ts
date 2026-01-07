/**
 * M.A.T.E. API-Key Validator Service
 * 
 * Validiert API-Keys für BYOK (Bring Your Own Key) Szenario.
 * Führt mehrstufige Validierung durch:
 * 1. Format-Check
 * 2. Test-Call zum Provider
 * 3. Balance-Check (optional)
 * 
 * Unterstützte Provider:
 * - OpenRouter
 * - OpenAI (TODO)
 * - Anthropic (TODO)
 * - Google (TODO)
 */

import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'
import { ApiKeyProvider } from '../database/entities/user-api-key.entity'

// OpenRouter Test-Model (kostengünstig für Validierung)
const TEST_MODEL = 'openai/gpt-4o-mini'
const TEST_PROMPT = 'test'
const TEST_MAX_TOKENS = 5

/**
 * Validierungs-Ergebnis
 */
export interface ValidationResult {
    valid: boolean
    provider: ApiKeyProvider
    hasBalance: boolean
    estimatedBalance?: number
    currency?: string
    error?: string
    errorCode?: string
}

/**
 * API-Key Format-Patterns
 */
const KEY_PATTERNS: Record<ApiKeyProvider, RegExp> = {
    [ApiKeyProvider.OPENROUTER]: /^sk-or-v1-[a-zA-Z0-9-_]{32,}$/,
    [ApiKeyProvider.OPENAI]: /^sk-[a-zA-Z0-9]{32,}$/,
    [ApiKeyProvider.ANTHROPIC]: /^sk-ant-[a-zA-Z0-9-_]{32,}$/,
    [ApiKeyProvider.GOOGLE]: /^AIza[a-zA-Z0-9-_]{35,}$/,
    [ApiKeyProvider.CUSTOM]: /.+/ // Jedes Format erlaubt
}

/**
 * API-Key Validator Service
 */
export class APIKeyValidatorService {
    private static instance: APIKeyValidatorService

    private constructor() {}

    public static getInstance(): APIKeyValidatorService {
        if (!APIKeyValidatorService.instance) {
            APIKeyValidatorService.instance = new APIKeyValidatorService()
        }
        return APIKeyValidatorService.instance
    }

    // ==================== PUBLIC API ====================

    /**
     * Validiert einen API-Key vollständig
     * 
     * @param apiKey - Zu validierender API-Key
     * @param provider - Provider-Typ
     * @param skipTestCall - Überspringt Test-Call (nur Format-Check)
     * @returns Validierungs-Ergebnis
     */
    public async validate(
        apiKey: string,
        provider: ApiKeyProvider = ApiKeyProvider.OPENROUTER,
        skipTestCall: boolean = false
    ): Promise<ValidationResult> {
        try {
            // Phase 1: Format-Validierung
            const formatCheck = this.validateFormat(apiKey, provider)
            if (!formatCheck.valid) {
                return formatCheck
            }

            // Phase 2: Test-Call (optional)
            if (!skipTestCall) {
                return await this.performTestCall(apiKey, provider)
            }

            return {
                valid: true,
                provider,
                hasBalance: false // Unbekannt ohne Test-Call
            }
        } catch (error: any) {
            logger.error('[APIKeyValidator] Validierungsfehler', { error: error.message, provider })
            return {
                valid: false,
                provider,
                hasBalance: false,
                error: error.message,
                errorCode: 'VALIDATION_ERROR'
            }
        }
    }

    /**
     * Nur Format-Validierung (schnell, ohne API-Call)
     */
    public validateFormat(apiKey: string, provider: ApiKeyProvider): ValidationResult {
        // Sanitize Input
        const trimmedKey = apiKey?.trim()

        if (!trimmedKey) {
            return {
                valid: false,
                provider,
                hasBalance: false,
                error: 'API-Key darf nicht leer sein',
                errorCode: 'EMPTY_KEY'
            }
        }

        // Längen-Check
        if (trimmedKey.length < 32) {
            return {
                valid: false,
                provider,
                hasBalance: false,
                error: 'API-Key zu kurz (mindestens 32 Zeichen)',
                errorCode: 'KEY_TOO_SHORT'
            }
        }

        // Pattern-Check
        const pattern = KEY_PATTERNS[provider]
        if (!pattern.test(trimmedKey)) {
            return {
                valid: false,
                provider,
                hasBalance: false,
                error: `Ungültiges Format für ${provider}`,
                errorCode: 'INVALID_FORMAT'
            }
        }

        // Keine Spaces erlaubt
        if (trimmedKey.includes(' ')) {
            return {
                valid: false,
                provider,
                hasBalance: false,
                error: 'API-Key darf keine Leerzeichen enthalten',
                errorCode: 'INVALID_CHARACTERS'
            }
        }

        return {
            valid: true,
            provider,
            hasBalance: false // Unbekannt ohne Test-Call
        }
    }

    // ==================== PROVIDER-SPECIFIC TEST CALLS ====================

    /**
     * Führt einen Test-Call zum Provider durch
     */
    private async performTestCall(
        apiKey: string,
        provider: ApiKeyProvider
    ): Promise<ValidationResult> {
        switch (provider) {
            case ApiKeyProvider.OPENROUTER:
                return await this.testOpenRouter(apiKey)
            
            case ApiKeyProvider.OPENAI:
                return await this.testOpenAI(apiKey)
            
            case ApiKeyProvider.ANTHROPIC:
                return await this.testAnthropic(apiKey)
            
            case ApiKeyProvider.GOOGLE:
                return await this.testGoogle(apiKey)
            
            case ApiKeyProvider.CUSTOM:
                // Custom-Provider: Nur Format-Check
                return {
                    valid: true,
                    provider,
                    hasBalance: false
                }
            
            default:
                throw new Error(`Unbekannter Provider: ${provider}`)
        }
    }

    /**
     * Test-Call zu OpenRouter
     */
    private async testOpenRouter(apiKey: string): Promise<ValidationResult> {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://mate-ai.platform',
                    'X-Title': 'M.A.T.E. Platform'
                },
                body: JSON.stringify({
                    model: TEST_MODEL,
                    messages: [{ role: 'user', content: TEST_PROMPT }],
                    max_tokens: TEST_MAX_TOKENS
                })
            })

            // HTTP 200: Key gültig
            if (response.ok) {
                const data = await response.json()
                logger.info('[APIKeyValidator] OpenRouter Key gültig', { 
                    model: TEST_MODEL,
                    tokens: data.usage?.total_tokens
                })
                
                return {
                    valid: true,
                    provider: ApiKeyProvider.OPENROUTER,
                    hasBalance: true,
                    currency: 'USD'
                }
            }

            // HTTP 401: Key ungültig
            if (response.status === 401) {
                return {
                    valid: false,
                    provider: ApiKeyProvider.OPENROUTER,
                    hasBalance: false,
                    error: 'API-Key ungültig oder abgelaufen',
                    errorCode: 'UNAUTHORIZED'
                }
            }

            // HTTP 402: Kein Guthaben
            if (response.status === 402) {
                logger.warn('[APIKeyValidator] OpenRouter Key ohne Guthaben', { apiKey: apiKey.substring(0, 12) + '...' })
                return {
                    valid: true, // Key ist gültig, nur kein Guthaben
                    provider: ApiKeyProvider.OPENROUTER,
                    hasBalance: false,
                    estimatedBalance: 0,
                    currency: 'USD',
                    error: 'Kein Guthaben beim Provider',
                    errorCode: 'INSUFFICIENT_FUNDS'
                }
            }

            // HTTP 429: Rate Limit
            if (response.status === 429) {
                logger.warn('[APIKeyValidator] OpenRouter Rate Limit erreicht')
                // Retry nach 5 Sekunden
                await new Promise(resolve => setTimeout(resolve, 5000))
                return await this.testOpenRouter(apiKey) // Recursive retry
            }

            // Sonstige Fehler
            const errorText = await response.text()
            return {
                valid: false,
                provider: ApiKeyProvider.OPENROUTER,
                hasBalance: false,
                error: `HTTP ${response.status}: ${errorText}`,
                errorCode: 'API_ERROR'
            }
        } catch (error: any) {
            logger.error('[APIKeyValidator] OpenRouter Test-Call fehlgeschlagen', { error: error.message })
            return {
                valid: false,
                provider: ApiKeyProvider.OPENROUTER,
                hasBalance: false,
                error: `Netzwerkfehler: ${error.message}`,
                errorCode: 'NETWORK_ERROR'
            }
        }
    }

    /**
     * Test-Call zu OpenAI (TODO)
     */
    private async testOpenAI(apiKey: string): Promise<ValidationResult> {
        // TODO: Implementieren
        return {
            valid: true,
            provider: ApiKeyProvider.OPENAI,
            hasBalance: false,
            error: 'OpenAI-Validierung noch nicht implementiert',
            errorCode: 'NOT_IMPLEMENTED'
        }
    }

    /**
     * Test-Call zu Anthropic (TODO)
     */
    private async testAnthropic(apiKey: string): Promise<ValidationResult> {
        // TODO: Implementieren
        return {
            valid: true,
            provider: ApiKeyProvider.ANTHROPIC,
            hasBalance: false,
            error: 'Anthropic-Validierung noch nicht implementiert',
            errorCode: 'NOT_IMPLEMENTED'
        }
    }

    /**
     * Test-Call zu Google (TODO)
     */
    private async testGoogle(apiKey: string): Promise<ValidationResult> {
        // TODO: Implementieren
        return {
            valid: true,
            provider: ApiKeyProvider.GOOGLE,
            hasBalance: false,
            error: 'Google-Validierung noch nicht implementiert',
            errorCode: 'NOT_IMPLEMENTED'
        }
    }

    // ==================== UTILITIES ====================

    /**
     * Extrahiert den Provider aus dem Key-Format (Heuristik)
     */
    public detectProvider(apiKey: string): ApiKeyProvider {
        const trimmedKey = apiKey?.trim()

        if (!trimmedKey) return ApiKeyProvider.CUSTOM

        if (trimmedKey.startsWith('sk-or-')) return ApiKeyProvider.OPENROUTER
        if (trimmedKey.startsWith('sk-ant-')) return ApiKeyProvider.ANTHROPIC
        if (trimmedKey.startsWith('sk-') && !trimmedKey.includes('-or-')) return ApiKeyProvider.OPENAI
        if (trimmedKey.startsWith('AIza')) return ApiKeyProvider.GOOGLE

        return ApiKeyProvider.CUSTOM
    }

    /**
     * Maskiert einen API-Key für Logging
     */
    public maskKey(apiKey: string): string {
        if (!apiKey || apiKey.length < 12) return '••••••••'
        return apiKey.substring(0, 8) + '••••••••' + apiKey.slice(-4)
    }
}

// Singleton-Export
export const apiKeyValidatorService = APIKeyValidatorService.getInstance()
