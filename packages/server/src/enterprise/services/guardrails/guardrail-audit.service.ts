/**
 * M.A.T.E. Guardrail Audit Service
 * 
 * Service für die Protokollierung aller Guardrails-Aktivitäten
 */

import { v4 as uuidv4 } from 'uuid'
import logger from '../../../utils/logger'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import {
    DetectionCategory,
    Direction,
    ActionType,
    SeverityLevel,
    GuardrailStats
} from './types'

export interface AuditLogEntry {
    userId?: string
    sessionId?: string
    requestId?: string
    direction: Direction
    action: ActionType
    category: DetectionCategory
    detectionType: string
    severity: SeverityLevel
    originalValue?: string  // Nur bei erhöhter Berechtigung
    maskedValue: string
    metadata?: Record<string, any>
}

/**
 * Singleton GuardrailAuditService
 */
class GuardrailAuditService {
    private static instance: GuardrailAuditService
    private initialized: boolean = false

    private constructor() {}

    public static getInstance(): GuardrailAuditService {
        if (!GuardrailAuditService.instance) {
            GuardrailAuditService.instance = new GuardrailAuditService()
        }
        return GuardrailAuditService.instance
    }

    /**
     * Protokolliert eine Guardrails-Detektion
     */
    public async log(entry: AuditLogEntry): Promise<void> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            // Prüfe ob GuardrailAuditLog Entity existiert
            if (!dataSource.hasMetadata('GuardrailAuditLog')) {
                // Fallback: Nur in Logger schreiben
                logger.info('[Guardrails Audit]', {
                    id: uuidv4(),
                    timestamp: new Date().toISOString(),
                    ...entry,
                    originalValue: undefined // Nie in Logs
                })
                return
            }

            const repository = dataSource.getRepository('GuardrailAuditLog')
            
            await repository.save({
                id: uuidv4(),
                userId: entry.userId,
                sessionId: entry.sessionId,
                requestId: entry.requestId,
                direction: entry.direction,
                action: entry.action,
                category: entry.category,
                detectionType: entry.detectionType,
                severity: entry.severity,
                maskedValue: entry.maskedValue,
                metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
                createdAt: new Date()
            })

        } catch (error) {
            logger.error('[Guardrails Audit] Failed to log', { error })
        }
    }

    /**
     * Gibt Audit-Logs für einen Zeitraum zurück
     */
    public async getLogs(params: {
        startDate: Date
        endDate: Date
        userId?: string
        category?: DetectionCategory
        severity?: SeverityLevel
        limit?: number
        offset?: number
    }): Promise<{ logs: any[]; total: number }> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata('GuardrailAuditLog')) {
                return { logs: [], total: 0 }
            }

            const repository = dataSource.getRepository('GuardrailAuditLog')
            const queryBuilder = repository.createQueryBuilder('log')
                .where('log.createdAt >= :startDate', { startDate: params.startDate })
                .andWhere('log.createdAt <= :endDate', { endDate: params.endDate })

            if (params.userId) {
                queryBuilder.andWhere('log.userId = :userId', { userId: params.userId })
            }
            if (params.category) {
                queryBuilder.andWhere('log.category = :category', { category: params.category })
            }
            if (params.severity) {
                queryBuilder.andWhere('log.severity = :severity', { severity: params.severity })
            }

            const total = await queryBuilder.getCount()

            queryBuilder
                .orderBy('log.createdAt', 'DESC')
                .limit(params.limit || 100)
                .offset(params.offset || 0)

            const logs = await queryBuilder.getMany()

            return { logs, total }

        } catch (error) {
            logger.error('[Guardrails Audit] Failed to get logs', { error })
            return { logs: [], total: 0 }
        }
    }

    /**
     * Generiert Statistiken für einen Zeitraum
     */
    public async getStatistics(startDate: Date, endDate: Date): Promise<GuardrailStats> {
        const defaultStats: GuardrailStats = {
            period: { start: startDate, end: endDate },
            totalScans: 0,
            totalDetections: 0,
            blockedRequests: 0,
            maskedValues: 0,
            byCategory: {
                [DetectionCategory.PII]: { scans: 0, detections: 0, blocked: 0 },
                [DetectionCategory.CREDENTIALS]: { scans: 0, detections: 0, blocked: 0 },
                [DetectionCategory.FINANCIAL]: { scans: 0, detections: 0, blocked: 0 },
                [DetectionCategory.HEALTH]: { scans: 0, detections: 0, blocked: 0 },
                [DetectionCategory.CONTENT]: { scans: 0, detections: 0, blocked: 0 },
                [DetectionCategory.INJECTION]: { scans: 0, detections: 0, blocked: 0 }
            },
            bySeverity: {
                [SeverityLevel.CRITICAL]: 0,
                [SeverityLevel.HIGH]: 0,
                [SeverityLevel.MEDIUM]: 0,
                [SeverityLevel.LOW]: 0,
                [SeverityLevel.INFO]: 0
            },
            topDetectionTypes: [],
            averageProcessingTimeMs: 0
        }

        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata('GuardrailAuditLog')) {
                return defaultStats
            }

            const repository = dataSource.getRepository('GuardrailAuditLog')

            // Gesamt-Zählung
            const totalDetections = await repository
                .createQueryBuilder('log')
                .where('log.createdAt >= :startDate', { startDate })
                .andWhere('log.createdAt <= :endDate', { endDate })
                .getCount()

            // Blocked Requests
            const blockedRequests = await repository
                .createQueryBuilder('log')
                .where('log.createdAt >= :startDate', { startDate })
                .andWhere('log.createdAt <= :endDate', { endDate })
                .andWhere('log.action = :action', { action: ActionType.BLOCK })
                .getCount()

            // Masked Values
            const maskedValues = await repository
                .createQueryBuilder('log')
                .where('log.createdAt >= :startDate', { startDate })
                .andWhere('log.createdAt <= :endDate', { endDate })
                .andWhere('log.action = :action', { action: ActionType.MASK })
                .getCount()

            // By Category
            const byCategory = await repository
                .createQueryBuilder('log')
                .select('log.category', 'category')
                .addSelect('COUNT(*)', 'count')
                .addSelect('SUM(CASE WHEN log.action = :blockAction THEN 1 ELSE 0 END)', 'blocked')
                .where('log.createdAt >= :startDate', { startDate })
                .andWhere('log.createdAt <= :endDate', { endDate })
                .setParameter('blockAction', ActionType.BLOCK)
                .groupBy('log.category')
                .getRawMany()

            for (const row of byCategory) {
                const cat = row.category as DetectionCategory
                if (defaultStats.byCategory[cat]) {
                    defaultStats.byCategory[cat].detections = parseInt(row.count) || 0
                    defaultStats.byCategory[cat].blocked = parseInt(row.blocked) || 0
                }
            }

            // By Severity
            const bySeverity = await repository
                .createQueryBuilder('log')
                .select('log.severity', 'severity')
                .addSelect('COUNT(*)', 'count')
                .where('log.createdAt >= :startDate', { startDate })
                .andWhere('log.createdAt <= :endDate', { endDate })
                .groupBy('log.severity')
                .getRawMany()

            for (const row of bySeverity) {
                const sev = row.severity as SeverityLevel
                if (sev in defaultStats.bySeverity) {
                    defaultStats.bySeverity[sev] = parseInt(row.count) || 0
                }
            }

            // Top Detection Types
            const topTypes = await repository
                .createQueryBuilder('log')
                .select('log.detectionType', 'type')
                .addSelect('COUNT(*)', 'count')
                .where('log.createdAt >= :startDate', { startDate })
                .andWhere('log.createdAt <= :endDate', { endDate })
                .groupBy('log.detectionType')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany()

            defaultStats.topDetectionTypes = topTypes.map(row => ({
                type: row.type,
                count: parseInt(row.count) || 0,
                percentage: totalDetections > 0 
                    ? Math.round((parseInt(row.count) / totalDetections) * 100) 
                    : 0
            }))

            defaultStats.totalDetections = totalDetections
            defaultStats.blockedRequests = blockedRequests
            defaultStats.maskedValues = maskedValues

            return defaultStats

        } catch (error) {
            logger.error('[Guardrails Audit] Failed to get statistics', { error })
            return defaultStats
        }
    }

    /**
     * Löscht alte Audit-Logs (Retention)
     */
    public async cleanup(retentionDays: number): Promise<number> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata('GuardrailAuditLog')) {
                return 0
            }

            const repository = dataSource.getRepository('GuardrailAuditLog')
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

            const result = await repository
                .createQueryBuilder()
                .delete()
                .where('createdAt < :cutoffDate', { cutoffDate })
                .execute()

            const deleted = result.affected || 0
            
            if (deleted > 0) {
                logger.info('[Guardrails Audit] Cleaned up old logs', {
                    deleted,
                    retentionDays
                })
            }

            return deleted

        } catch (error) {
            logger.error('[Guardrails Audit] Failed to cleanup', { error })
            return 0
        }
    }
}

export const guardrailAuditService = GuardrailAuditService.getInstance()
