/**
 * M.A.T.E. System Config Service
 * 
 * CRUD-Operationen für System-Konfigurationen mit verschlüsselter
 * Speicherung sensibler Werte.
 */
import { getRepository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import {
    SystemConfig,
    ConfigCategory,
    ConfigValueType,
    ConfigEncryption,
    DEFAULT_CONFIGS
} from '../database/entities/system-config.entity'

export interface ConfigItem {
    id: string
    category: ConfigCategory
    key: string
    value: string | number | boolean | object
    displayName: string
    description: string
    valueType: ConfigValueType
    isRequired: boolean
    isConfigured: boolean
    updatedAt: Date
}

export interface ConfigUpdateRequest {
    key: string
    value: string
}

export interface ConfigCategoryResponse {
    category: ConfigCategory
    displayName: string
    description: string
    configs: ConfigItem[]
    completionPercent: number
}

class SystemConfigService {
    private static instance: SystemConfigService
    private cache: Map<string, string> = new Map()
    private cacheExpiry: Date | null = null
    private readonly cacheTTLMs = 60000 // 1 Minute Cache

    private constructor() {}

    public static getInstance(): SystemConfigService {
        if (!SystemConfigService.instance) {
            SystemConfigService.instance = new SystemConfigService()
        }
        return SystemConfigService.instance
    }

    /**
     * Initialisiert Standard-Konfigurationen
     */
    public async initializeDefaults(): Promise<void> {
        const appServer = getRunningExpressApp()
        const repository = appServer.AppDataSource.getRepository(SystemConfig)

        for (const defaultConfig of DEFAULT_CONFIGS) {
            const existing = await repository.findOne({ where: { key: defaultConfig.key } })
            
            if (!existing) {
                const config = new SystemConfig()
                config.id = uuidv4()
                config.category = defaultConfig.category
                config.key = defaultConfig.key
                config.displayName = defaultConfig.displayName
                config.description = defaultConfig.description
                config.valueType = defaultConfig.valueType
                config.isRequired = defaultConfig.isRequired
                config.defaultValue = defaultConfig.defaultValue || ''
                config.value = defaultConfig.defaultValue || ''
                config.isEncrypted = false

                await repository.save(config)
                logger.debug(`[ConfigService] Default-Konfiguration erstellt: ${defaultConfig.key}`)
            }
        }

        logger.info(`[ConfigService] ${DEFAULT_CONFIGS.length} Standard-Konfigurationen initialisiert`)
    }

    /**
     * Holt einen einzelnen Konfigurationswert
     */
    public async getValue(key: string): Promise<string | null> {
        // Zuerst aus Cache prüfen
        if (this.cacheExpiry && this.cacheExpiry > new Date()) {
            if (this.cache.has(key)) {
                return this.cache.get(key) || null
            }
        }

        const appServer = getRunningExpressApp()
        const repository = appServer.AppDataSource.getRepository(SystemConfig)
        
        const config = await repository.findOne({ where: { key } })
        if (!config || !config.value) {
            return config?.defaultValue || null
        }

        let value = config.value
        
        // Entschlüsseln wenn nötig
        if (config.isEncrypted && config.valueType === ConfigValueType.SECRET) {
            try {
                value = ConfigEncryption.decrypt(value)
            } catch (error) {
                logger.error(`[ConfigService] Fehler beim Entschlüsseln von ${key}:`, error)
                return null
            }
        }

        this.cache.set(key, value)
        return value
    }

    /**
     * Holt alle Konfigurationen einer Kategorie
     */
    public async getByCategory(category: ConfigCategory): Promise<ConfigItem[]> {
        const appServer = getRunningExpressApp()
        const repository = appServer.AppDataSource.getRepository(SystemConfig)
        
        const configs = await repository.find({ 
            where: { category },
            order: { key: 'ASC' }
        })

        return configs.map(config => this.toConfigItem(config))
    }

    /**
     * Holt alle Konfigurationen gruppiert nach Kategorie
     */
    public async getAllGrouped(): Promise<ConfigCategoryResponse[]> {
        const appServer = getRunningExpressApp()
        const repository = appServer.AppDataSource.getRepository(SystemConfig)
        
        const allConfigs = await repository.find({ order: { category: 'ASC', key: 'ASC' } })
        
        const categoryMap = new Map<ConfigCategory, SystemConfig[]>()
        for (const config of allConfigs) {
            if (!categoryMap.has(config.category)) {
                categoryMap.set(config.category, [])
            }
            categoryMap.get(config.category)!.push(config)
        }

        const categoryDisplayNames: Record<ConfigCategory, { displayName: string; description: string }> = {
            [ConfigCategory.LLM]: {
                displayName: 'LLM-Provider',
                description: 'OpenRouter API-Konfiguration und Modell-Einstellungen'
            },
            [ConfigCategory.VAPI]: {
                displayName: 'VAPI Voice',
                description: 'VAPI-Integration für Voice-Agenten'
            },
            [ConfigCategory.PRICING]: {
                displayName: 'Preise & Margen',
                description: 'Token- und Voice-Preiskonfiguration'
            },
            [ConfigCategory.LIMITS]: {
                displayName: 'Limits & Rabatte',
                description: 'Nutzungslimits und Volumen-Rabatte'
            },
            [ConfigCategory.SYSTEM]: {
                displayName: 'System',
                description: 'Allgemeine System-Einstellungen'
            }
        }

        const result: ConfigCategoryResponse[] = []
        
        for (const [category, configs] of categoryMap) {
            const configItems = configs.map(c => this.toConfigItem(c))
            const requiredConfigs = configItems.filter(c => c.isRequired)
            const configuredRequired = requiredConfigs.filter(c => c.isConfigured)
            
            const completionPercent = requiredConfigs.length > 0
                ? Math.round((configuredRequired.length / requiredConfigs.length) * 100)
                : 100

            result.push({
                category,
                displayName: categoryDisplayNames[category]?.displayName || category,
                description: categoryDisplayNames[category]?.description || '',
                configs: configItems,
                completionPercent
            })
        }

        return result
    }

    /**
     * Aktualisiert einen Konfigurationswert
     */
    public async setValue(key: string, value: string, updatedBy?: string): Promise<ConfigItem> {
        const appServer = getRunningExpressApp()
        const repository = appServer.AppDataSource.getRepository(SystemConfig)
        
        const config = await repository.findOne({ where: { key } })
        if (!config) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Konfiguration '${key}' nicht gefunden`
            )
        }

        // Verschlüsseln wenn SECRET
        if (config.valueType === ConfigValueType.SECRET && value) {
            config.value = ConfigEncryption.encrypt(value)
            config.isEncrypted = true
        } else {
            config.value = value
            config.isEncrypted = false
        }

        if (updatedBy) {
            config.updatedBy = updatedBy
        }

        await repository.save(config)
        
        // Cache invalidieren
        this.cache.delete(key)
        
        logger.info(`[ConfigService] Konfiguration aktualisiert: ${key}`, { updatedBy })
        
        return this.toConfigItem(config)
    }

    /**
     * Aktualisiert mehrere Konfigurationen gleichzeitig
     */
    public async setValues(updates: ConfigUpdateRequest[], updatedBy?: string): Promise<ConfigItem[]> {
        const results: ConfigItem[] = []
        
        for (const update of updates) {
            const result = await this.setValue(update.key, update.value, updatedBy)
            results.push(result)
        }

        // Cache komplett invalidieren
        this.invalidateCache()

        return results
    }

    /**
     * Holt LLM-Konfiguration für den LLMProxyService
     */
    public async getLLMConfig(): Promise<{
        apiKey: string | null
        baseUrl: string
        defaultModel: string
        fallbackModel: string
        maxRetries: number
        timeoutMs: number
    }> {
        return {
            apiKey: await this.getValue('openrouter_api_key'),
            baseUrl: (await this.getValue('openrouter_base_url')) || 'https://openrouter.ai/api/v1',
            defaultModel: (await this.getValue('default_model')) || 'moonshotai/kimi-k2',
            fallbackModel: (await this.getValue('fallback_model')) || 'qwen/qwen3-max',
            maxRetries: parseInt((await this.getValue('max_retries')) || '3'),
            timeoutMs: parseInt((await this.getValue('timeout_ms')) || '30000')
        }
    }

    /**
     * Holt VAPI-Konfiguration
     */
    public async getVAPIConfig(): Promise<{
        apiKey: string | null
        webhookSecret: string | null
        defaultVoice: string
    }> {
        return {
            apiKey: await this.getValue('vapi_api_key'),
            webhookSecret: await this.getValue('vapi_webhook_secret'),
            defaultVoice: (await this.getValue('vapi_default_voice')) || 'minimax'
        }
    }

    /**
     * Holt Pricing-Konfiguration
     */
    public async getPricingConfig(): Promise<{
        tokenMarginPercent: number
        voiceMarginPercent: number
        voiceInboundPrice: number
        voiceOutboundPrice: number
        phoneNumberMonthly: number
    }> {
        return {
            tokenMarginPercent: parseFloat((await this.getValue('token_margin_percent')) || '40'),
            voiceMarginPercent: parseFloat((await this.getValue('voice_margin_percent')) || '30'),
            voiceInboundPrice: parseFloat((await this.getValue('voice_inbound_price')) || '0.08'),
            voiceOutboundPrice: parseFloat((await this.getValue('voice_outbound_price')) || '0.12'),
            phoneNumberMonthly: parseFloat((await this.getValue('phone_number_monthly')) || '5.00')
        }
    }

    /**
     * Holt Limits-Konfiguration
     */
    public async getLimitsConfig(): Promise<{
        initialCredits: number
        rateLimitRequests: number
        rateLimitWindowMs: number
        volumeDiscounts: {
            token: Array<{ minTokens: number; discount: number }>
            voice: Array<{ minMinutes: number; discount: number }>
        }
    }> {
        const volumeDiscountsStr = await this.getValue('volume_discounts')
        let volumeDiscounts = {
            token: [{ minTokens: 0, discount: 0 }],
            voice: [{ minMinutes: 0, discount: 0 }]
        }
        
        if (volumeDiscountsStr) {
            try {
                volumeDiscounts = JSON.parse(volumeDiscountsStr)
            } catch (e) {
                logger.warn('[ConfigService] Fehler beim Parsen von volume_discounts')
            }
        }

        return {
            initialCredits: parseInt((await this.getValue('initial_credits')) || '1000'),
            rateLimitRequests: parseInt((await this.getValue('rate_limit_requests')) || '100'),
            rateLimitWindowMs: parseInt((await this.getValue('rate_limit_window_ms')) || '60000'),
            volumeDiscounts
        }
    }

    /**
     * Prüft ob alle erforderlichen Konfigurationen gesetzt sind
     */
    public async checkRequiredConfigs(): Promise<{
        isComplete: boolean
        missing: string[]
    }> {
        const appServer = getRunningExpressApp()
        const repository = appServer.AppDataSource.getRepository(SystemConfig)
        
        const requiredConfigs = await repository.find({ where: { isRequired: true } })
        const missing: string[] = []

        for (const config of requiredConfigs) {
            if (!config.value || config.value === '') {
                missing.push(config.key)
            }
        }

        return {
            isComplete: missing.length === 0,
            missing
        }
    }

    /**
     * Konvertiert Entity zu ConfigItem für API-Responses
     */
    private toConfigItem(config: SystemConfig): ConfigItem {
        let displayValue: string | number | boolean | object = config.value

        // Secrets maskieren
        if (config.valueType === ConfigValueType.SECRET && config.value && config.isEncrypted) {
            try {
                const decrypted = ConfigEncryption.decrypt(config.value)
                displayValue = ConfigEncryption.mask(decrypted)
            } catch {
                displayValue = '••••••••'
            }
        }

        // Typen konvertieren
        if (config.valueType === ConfigValueType.NUMBER && displayValue) {
            displayValue = parseFloat(displayValue as string)
        } else if (config.valueType === ConfigValueType.BOOLEAN) {
            displayValue = displayValue === 'true' || displayValue === '1'
        } else if (config.valueType === ConfigValueType.JSON && displayValue) {
            try {
                displayValue = JSON.parse(displayValue as string)
            } catch {
                // Belasse als String
            }
        }

        const isConfigured = !!(config.value && config.value !== '')

        return {
            id: config.id,
            category: config.category,
            key: config.key,
            value: displayValue,
            displayName: config.displayName || config.key,
            description: config.description || '',
            valueType: config.valueType,
            isRequired: config.isRequired,
            isConfigured,
            updatedAt: config.updatedAt
        }
    }

    /**
     * Cache invalidieren
     */
    public invalidateCache(): void {
        this.cache.clear()
        this.cacheExpiry = null
    }
}

export const systemConfigService = SystemConfigService.getInstance()
