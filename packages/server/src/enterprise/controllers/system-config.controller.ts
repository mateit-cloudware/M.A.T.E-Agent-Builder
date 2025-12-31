/**
 * M.A.T.E. System Configuration Controller
 * 
 * API-Controller für die zentrale Plattform-Konfiguration.
 * Ermöglicht SuperAdmins die Verwaltung von:
 * - LLM-Provider (OpenRouter API-Key, Modelle)
 * - VAPI-Integration (API-Key, Webhook-Secret)
 * - Preiskonfiguration (Margen, Voice-Preise)
 * - Limits und Volumen-Rabatte
 */
import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { systemConfigService, ConfigUpdateRequest } from '../services/system-config.service'
import { ConfigCategory } from '../database/entities/system-config.entity'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'

export class SystemConfigController {
    /**
     * GET /admin/config
     * Holt alle Konfigurationen gruppiert nach Kategorie
     */
    async getAllConfigs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const configs = await systemConfigService.getAllGrouped()
            
            res.json({
                success: true,
                data: configs
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Laden der Konfigurationen:', error)
            next(error)
        }
    }

    /**
     * GET /admin/config/:category
     * Holt alle Konfigurationen einer Kategorie
     */
    async getConfigsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { category } = req.params

            // Validiere Kategorie
            if (!Object.values(ConfigCategory).includes(category as ConfigCategory)) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    `Ungültige Kategorie: ${category}`
                )
            }

            const configs = await systemConfigService.getByCategory(category as ConfigCategory)
            
            res.json({
                success: true,
                data: configs
            })
        } catch (error) {
            logger.error(`[SystemConfigController] Fehler beim Laden der Kategorie ${req.params.category}:`, error)
            next(error)
        }
    }

    /**
     * PUT /admin/config/:key
     * Aktualisiert einen einzelnen Konfigurationswert
     */
    async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { key } = req.params
            const { value } = req.body

            if (value === undefined) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    'Wert (value) ist erforderlich'
                )
            }

            // User-ID aus Auth extrahieren
            const userId = (req as any).user?.id

            const config = await systemConfigService.setValue(key, String(value), userId)
            
            logger.info(`[SystemConfigController] Konfiguration aktualisiert: ${key}`, { userId })

            res.json({
                success: true,
                data: config
            })
        } catch (error) {
            logger.error(`[SystemConfigController] Fehler beim Aktualisieren von ${req.params.key}:`, error)
            next(error)
        }
    }

    /**
     * PUT /admin/config
     * Aktualisiert mehrere Konfigurationswerte gleichzeitig (Batch)
     */
    async updateConfigs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { configs } = req.body

            if (!Array.isArray(configs) || configs.length === 0) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    'configs muss ein nicht-leeres Array sein'
                )
            }

            // Validiere alle Einträge
            const updates: ConfigUpdateRequest[] = configs.map((c: any) => {
                if (!c.key || c.value === undefined) {
                    throw new InternalFlowiseError(
                        StatusCodes.BAD_REQUEST,
                        'Jeder Eintrag benötigt key und value'
                    )
                }
                return { key: c.key, value: String(c.value) }
            })

            const userId = (req as any).user?.id
            const results = await systemConfigService.setValues(updates, userId)

            logger.info(`[SystemConfigController] ${updates.length} Konfigurationen aktualisiert`, { userId })

            res.json({
                success: true,
                data: results,
                updated: results.length
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Batch-Update:', error)
            next(error)
        }
    }

    /**
     * GET /admin/config/status
     * Prüft Status der erforderlichen Konfigurationen
     */
    async getConfigStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const status = await systemConfigService.checkRequiredConfigs()
            
            res.json({
                success: true,
                data: status
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Prüfen des Konfigurationsstatus:', error)
            next(error)
        }
    }

    /**
     * GET /admin/config/llm
     * Holt aktuelle LLM-Konfiguration (ohne sensible Daten)
     */
    async getLLMConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const config = await systemConfigService.getLLMConfig()
            
            res.json({
                success: true,
                data: {
                    isConfigured: !!config.apiKey,
                    baseUrl: config.baseUrl,
                    defaultModel: config.defaultModel,
                    fallbackModel: config.fallbackModel,
                    maxRetries: config.maxRetries,
                    timeoutMs: config.timeoutMs
                }
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Laden der LLM-Konfiguration:', error)
            next(error)
        }
    }

    /**
     * GET /admin/config/vapi
     * Holt aktuelle VAPI-Konfiguration (ohne sensible Daten)
     */
    async getVAPIConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const config = await systemConfigService.getVAPIConfig()
            
            res.json({
                success: true,
                data: {
                    isConfigured: !!config.apiKey,
                    hasWebhookSecret: !!config.webhookSecret,
                    defaultVoice: config.defaultVoice
                }
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Laden der VAPI-Konfiguration:', error)
            next(error)
        }
    }

    /**
     * GET /admin/config/pricing
     * Holt aktuelle Pricing-Konfiguration
     */
    async getPricingConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const config = await systemConfigService.getPricingConfig()
            
            res.json({
                success: true,
                data: config
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Laden der Pricing-Konfiguration:', error)
            next(error)
        }
    }

    /**
     * GET /admin/config/limits
     * Holt aktuelle Limits-Konfiguration inkl. Volumen-Rabatte
     */
    async getLimitsConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const config = await systemConfigService.getLimitsConfig()
            
            res.json({
                success: true,
                data: config
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Laden der Limits-Konfiguration:', error)
            next(error)
        }
    }

    /**
     * POST /admin/config/initialize
     * Initialisiert Standard-Konfigurationen (nur wenn nötig)
     */
    async initializeDefaults(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await systemConfigService.initializeDefaults()
            
            res.json({
                success: true,
                message: 'Standard-Konfigurationen initialisiert'
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler bei der Initialisierung:', error)
            next(error)
        }
    }

    /**
     * POST /admin/config/cache/invalidate
     * Leert den Konfigurations-Cache
     */
    async invalidateCache(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            systemConfigService.invalidateCache()
            
            res.json({
                success: true,
                message: 'Cache wurde geleert'
            })
        } catch (error) {
            logger.error('[SystemConfigController] Fehler beim Cache-Invalidieren:', error)
            next(error)
        }
    }
}
