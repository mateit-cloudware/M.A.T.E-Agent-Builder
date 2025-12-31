/**
 * M.A.T.E. Guardrails Controller
 * 
 * API-Controller für Guardrails-Verwaltung und Statistiken
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import logger from '../../../utils/logger'
import { guardrailsService } from './guardrails.service'
import { guardrailAuditService } from './guardrail-audit.service'
import { GuardrailConfig, GuardrailConfigType, GuardrailCategory } from '../../database/entities/guardrail.entity'
import { Direction, ActionType, SeverityLevel, DetectionCategory } from './types'
import { v4 as uuidv4 } from 'uuid'

export class GuardrailsController {
    
    // ==================== KONFIGURATION ====================
    
    /**
     * GET /admin/guardrails/config
     * Gibt alle Konfigurationen zurück
     */
    public async getAllConfigs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource
            
            const repository = dataSource.getRepository(GuardrailConfig)
            const configs = await repository.find({
                order: { priority: 'DESC', category: 'ASC', key: 'ASC' }
            })

            res.status(StatusCodes.OK).json({
                success: true,
                configs
            })
        } catch (error) {
            logger.error('[Guardrails Controller] getAllConfigs error', { error })
            next(error)
        }
    }

    /**
     * GET /admin/guardrails/config/:category
     * Gibt Konfigurationen für eine Kategorie zurück
     */
    public async getConfigsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { category } = req.params
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource
            
            const repository = dataSource.getRepository(GuardrailConfig)
            const configs = await repository.find({
                where: { category: category as GuardrailCategory },
                order: { priority: 'DESC', key: 'ASC' }
            })

            res.status(StatusCodes.OK).json({
                success: true,
                configs
            })
        } catch (error) {
            logger.error('[Guardrails Controller] getConfigsByCategory error', { error })
            next(error)
        }
    }

    /**
     * PUT /admin/guardrails/config/:id
     * Aktualisiert eine Konfiguration
     */
    public async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const { value, isEnabled, description, metadata } = req.body
            const userId = (req as any).user?.id

            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource
            
            const repository = dataSource.getRepository(GuardrailConfig)
            const config = await repository.findOneBy({ id })

            if (!config) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Konfiguration nicht gefunden'
                })
                return
            }

            // Felder aktualisieren
            if (value !== undefined) config.value = value
            if (isEnabled !== undefined) config.isEnabled = isEnabled
            if (description !== undefined) config.description = description
            if (metadata !== undefined) config.metadata = JSON.stringify(metadata)
            config.updatedBy = userId

            await repository.save(config)

            // Guardrails-Service aktualisieren
            this.applyConfigToService(config)

            logger.info('[Guardrails] Config updated', {
                configId: id,
                key: config.key,
                updatedBy: userId
            })

            res.status(StatusCodes.OK).json({
                success: true,
                config
            })
        } catch (error) {
            logger.error('[Guardrails Controller] updateConfig error', { error })
            next(error)
        }
    }

    /**
     * POST /admin/guardrails/config
     * Erstellt eine neue Konfiguration
     */
    public async createConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { configType, category, key, value, description, isEnabled, priority, appliesTo, metadata } = req.body
            const userId = (req as any).user?.id

            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource
            
            const repository = dataSource.getRepository(GuardrailConfig)

            // Prüfe ob Key bereits existiert
            const existing = await repository.findOneBy({ key, category })
            if (existing) {
                res.status(StatusCodes.CONFLICT).json({
                    success: false,
                    error: 'Konfiguration mit diesem Schlüssel existiert bereits'
                })
                return
            }

            const config = new GuardrailConfig()
            config.id = uuidv4()
            config.configType = configType || GuardrailConfigType.POLICY
            config.category = category || GuardrailCategory.GLOBAL
            config.key = key
            config.value = value
            config.description = description
            config.isEnabled = isEnabled !== undefined ? isEnabled : true
            config.priority = priority || 0
            config.appliesTo = appliesTo
            config.metadata = metadata ? JSON.stringify(metadata) : undefined
            config.createdBy = userId

            await repository.save(config)

            // Guardrails-Service aktualisieren
            this.applyConfigToService(config)

            logger.info('[Guardrails] Config created', {
                configId: config.id,
                key: config.key,
                createdBy: userId
            })

            res.status(StatusCodes.CREATED).json({
                success: true,
                config
            })
        } catch (error) {
            logger.error('[Guardrails Controller] createConfig error', { error })
            next(error)
        }
    }

    /**
     * DELETE /admin/guardrails/config/:id
     * Löscht eine Konfiguration
     */
    public async deleteConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const userId = (req as any).user?.id

            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource
            
            const repository = dataSource.getRepository(GuardrailConfig)
            const config = await repository.findOneBy({ id })

            if (!config) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Konfiguration nicht gefunden'
                })
                return
            }

            await repository.delete({ id })

            logger.info('[Guardrails] Config deleted', {
                configId: id,
                key: config.key,
                deletedBy: userId
            })

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Konfiguration gelöscht'
            })
        } catch (error) {
            logger.error('[Guardrails Controller] deleteConfig error', { error })
            next(error)
        }
    }

    // ==================== STATISTIKEN ====================

    /**
     * GET /admin/guardrails/stats
     * Gibt Statistiken zurück
     */
    public async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { start, end } = req.query
            
            const startDate = start ? new Date(start as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            const endDate = end ? new Date(end as string) : new Date()

            const stats = await guardrailAuditService.getStatistics(startDate, endDate)

            res.status(StatusCodes.OK).json({
                success: true,
                stats
            })
        } catch (error) {
            logger.error('[Guardrails Controller] getStatistics error', { error })
            next(error)
        }
    }

    /**
     * GET /admin/guardrails/audit
     * Gibt Audit-Logs zurück
     */
    public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { start, end, userId, category, severity, limit, offset } = req.query

            const startDate = start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000)
            const endDate = end ? new Date(end as string) : new Date()

            const result = await guardrailAuditService.getLogs({
                startDate,
                endDate,
                userId: userId as string,
                category: category as DetectionCategory,
                severity: severity as SeverityLevel,
                limit: limit ? parseInt(limit as string) : 100,
                offset: offset ? parseInt(offset as string) : 0
            })

            res.status(StatusCodes.OK).json({
                success: true,
                logs: result.logs,
                total: result.total,
                pagination: {
                    limit: limit ? parseInt(limit as string) : 100,
                    offset: offset ? parseInt(offset as string) : 0,
                    hasMore: result.total > (parseInt(offset as string) || 0) + result.logs.length
                }
            })
        } catch (error) {
            logger.error('[Guardrails Controller] getAuditLogs error', { error })
            next(error)
        }
    }

    // ==================== HEALTH & STATUS ====================

    /**
     * GET /admin/guardrails/health
     * Health-Check für Guardrails-System
     */
    public async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const health = guardrailsService.healthCheck()

            res.status(StatusCodes.OK).json({
                success: true,
                health
            })
        } catch (error) {
            logger.error('[Guardrails Controller] getHealth error', { error })
            next(error)
        }
    }

    /**
     * GET /admin/guardrails/status
     * Gibt den aktuellen Status des Guardrails-Systems zurück
     */
    public async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const config = guardrailsService.getConfig()
            const health = guardrailsService.healthCheck()

            res.status(StatusCodes.OK).json({
                success: true,
                status: {
                    enabled: config.enabled,
                    mode: config.mode,
                    scanners: health.scanners,
                    masking: config.masking.enabled,
                    audit: config.audit.enabled
                }
            })
        } catch (error) {
            logger.error('[Guardrails Controller] getStatus error', { error })
            next(error)
        }
    }

    // ==================== TEST ====================

    /**
     * POST /admin/guardrails/test
     * Testet Text gegen Guardrails
     */
    public async testText(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { text, direction } = req.body
            const userId = (req as any).user?.id

            if (!text) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    error: 'Text ist erforderlich'
                })
                return
            }

            const result = await guardrailsService.processText(
                text,
                direction === 'output' ? Direction.OUTPUT : Direction.INPUT,
                { userId, requestId: 'test_' + Date.now() }
            )

            res.status(StatusCodes.OK).json({
                success: true,
                result: {
                    isBlocked: result.isBlocked,
                    action: result.action,
                    processedText: result.processedText,
                    aggregatedSeverity: result.aggregatedSeverity,
                    warnings: result.warnings,
                    detections: result.scanResults.map(sr => ({
                        category: sr.category,
                        matches: sr.matches.map(m => ({
                            type: m.type,
                            masked: m.masked,
                            severity: m.severity,
                            confidence: m.confidence
                        }))
                    }))
                }
            })
        } catch (error) {
            logger.error('[Guardrails Controller] testText error', { error })
            next(error)
        }
    }

    // ==================== HELPER ====================

    /**
     * Wendet Konfiguration auf GuardrailsService an
     */
    private applyConfigToService(config: GuardrailConfig): void {
        try {
            const updates: any = {}

            switch (config.key) {
                case 'pii_scanner_enabled':
                    updates.scanners = { pii: { enabled: config.value === 'true' } }
                    break
                case 'credentials_scanner_enabled':
                    updates.scanners = { credentials: { enabled: config.value === 'true' } }
                    break
                case 'financial_scanner_enabled':
                    updates.scanners = { financial: { enabled: config.value === 'true' } }
                    break
                case 'health_scanner_enabled':
                    updates.scanners = { health: { enabled: config.value === 'true' } }
                    break
                case 'default_action':
                    updates.defaultAction = config.value as ActionType
                    break
                case 'block_on_critical':
                    updates.blockOnCritical = config.value === 'true'
                    break
                case 'mask_on_high':
                    updates.maskOnHigh = config.value === 'true'
                    break
                case 'audit_enabled':
                    updates.audit = { enabled: config.value === 'true' }
                    break
            }

            if (Object.keys(updates).length > 0) {
                guardrailsService.updateConfig(updates)
            }
        } catch (error) {
            logger.error('[Guardrails Controller] applyConfigToService error', { error })
        }
    }
}

export const guardrailsController = new GuardrailsController()
