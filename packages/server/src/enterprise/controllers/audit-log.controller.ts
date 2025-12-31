/**
 * M.A.T.E. Audit Log Controller
 * 
 * S1.4e - Admin UI: Audit Log Viewer API
 * S1.4f - Export (CSV, JSON)
 * 
 * API-Endpoints für Audit-Log-Management
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { auditLogService, AuditLogFilter } from '../services/audit-log.service'
import {
    AuditCategory,
    AuditAction,
    AuditStatus,
    AuditRiskLevel
} from '../database/entities/audit-log.entity'
import logger from '../../utils/logger'

// ==================== LIST AUDIT LOGS ====================

/**
 * GET /api/v1/admin/audit-logs
 * Listet Audit-Logs mit Filtern
 */
export const listAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            category,
            action,
            status,
            riskLevel,
            userId,
            resourceType,
            resourceId,
            fromDate,
            toDate,
            search,
            page = '1',
            pageSize = '50'
        } = req.query

        const limit = Math.min(parseInt(pageSize as string) || 50, 100)
        const offset = (parseInt(page as string) - 1) * limit

        const filter: AuditLogFilter = {
            category: category as AuditCategory,
            action: action as AuditAction,
            status: status as AuditStatus,
            riskLevel: riskLevel as AuditRiskLevel,
            userId: userId as string,
            resourceType: resourceType as string,
            resourceId: resourceId as string,
            fromDate: fromDate ? new Date(fromDate as string) : undefined,
            toDate: toDate ? new Date(toDate as string) : undefined,
            search: search as string,
            limit,
            offset
        }

        const { logs, total } = await auditLogService.getLogs(filter)

        // Audit-Log für diesen Zugriff erstellen
        await auditLogService.log({
            category: AuditCategory.ADMIN,
            action: AuditAction.ADMIN_ACCESS,
            userId: (req as any).user?.id,
            username: (req as any).user?.username,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            requestPath: req.path,
            requestMethod: req.method,
            description: 'Admin accessed audit logs',
            details: { filter, resultCount: logs.length }
        })

        res.json({
            success: true,
            data: logs.map(log => ({
                id: log.id,
                sequenceNumber: log.sequenceNumber,
                createdAt: log.createdAt,
                category: log.category,
                action: log.action,
                status: log.status,
                riskLevel: log.riskLevel,
                userId: log.userId,
                username: log.username,
                targetUserId: log.targetUserId,
                ipAddress: log.ipAddress,
                requestPath: log.requestPath,
                requestMethod: log.requestMethod,
                resourceType: log.resourceType,
                resourceId: log.resourceId,
                description: log.description,
                details: log.getDetails(),
                errorCode: log.errorCode,
                errorMessage: log.errorMessage,
                durationMs: log.durationMs,
                retentionCategory: log.retentionCategory,
                expiresAt: log.expiresAt,
                entryHash: log.entryHash
            })),
            pagination: {
                total,
                page: parseInt(page as string),
                pageSize: limit,
                totalPages: Math.ceil(total / limit)
            }
        })

    } catch (error: any) {
        logger.error('[AuditLogController] List failed', { error })
        next(new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to list audit logs: ${error.message}`
        ))
    }
}

// ==================== GET SINGLE AUDIT LOG ====================

/**
 * GET /api/v1/admin/audit-logs/:id
 * Holt einen einzelnen Audit-Log-Eintrag
 */
export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params

        const { logs } = await auditLogService.getLogs({
            limit: 1,
            resourceId: id
        })

        if (logs.length === 0) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Audit log not found')
        }

        const log = logs[0]

        res.json({
            success: true,
            data: {
                id: log.id,
                sequenceNumber: log.sequenceNumber,
                createdAt: log.createdAt,
                category: log.category,
                action: log.action,
                status: log.status,
                riskLevel: log.riskLevel,
                userId: log.userId,
                username: log.username,
                targetUserId: log.targetUserId,
                ipAddress: log.ipAddress,
                userAgent: log.userAgent,
                requestPath: log.requestPath,
                requestMethod: log.requestMethod,
                requestId: log.requestId,
                sessionId: log.sessionId,
                resourceType: log.resourceType,
                resourceId: log.resourceId,
                description: log.description,
                details: log.getDetails(),
                oldValues: log.getOldValues(),
                newValues: log.getNewValues(),
                responseStatus: log.responseStatus,
                errorCode: log.errorCode,
                errorMessage: log.errorMessage,
                durationMs: log.durationMs,
                retentionCategory: log.retentionCategory,
                expiresAt: log.expiresAt,
                previousHash: log.previousHash,
                entryHash: log.entryHash,
                hashTimestamp: log.hashTimestamp,
                exported: log.exported,
                exportedAt: log.exportedAt
            }
        })

    } catch (error: any) {
        logger.error('[AuditLogController] Get failed', { error })
        next(error instanceof InternalFlowiseError ? error : new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to get audit log: ${error.message}`
        ))
    }
}

// ==================== GET AUDIT LOG STATS ====================

/**
 * GET /api/v1/admin/audit-logs/stats
 * Holt Statistiken über Audit-Logs
 */
export const getAuditLogStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hours = parseInt(req.query.hours as string) || 24

        const stats = await auditLogService.getStats(hours)

        res.json({
            success: true,
            data: {
                period: {
                    hours,
                    from: new Date(Date.now() - hours * 60 * 60 * 1000),
                    to: new Date()
                },
                totalLogs: stats.totalLogs,
                byCategory: stats.byCategory,
                byRiskLevel: stats.byRiskLevel,
                recentHighRisk: stats.recentHighRisk,
                chainIntegrity: stats.chainIntegrity
            }
        })

    } catch (error: any) {
        logger.error('[AuditLogController] Stats failed', { error })
        next(new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to get audit log stats: ${error.message}`
        ))
    }
}

// ==================== VERIFY INTEGRITY ====================

/**
 * POST /api/v1/admin/audit-logs/verify-integrity
 * Prüft die Integrität der Hash-Kette
 */
export const verifyIntegrity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { fromSequence, toSequence, batchSize } = req.body

        // Audit-Log für diese Aktion
        await auditLogService.log({
            category: AuditCategory.ADMIN,
            action: AuditAction.ADMIN_ACCESS,
            riskLevel: AuditRiskLevel.HIGH,
            userId: (req as any).user?.id,
            username: (req as any).user?.username,
            ipAddress: req.ip,
            requestPath: req.path,
            description: 'Admin initiated integrity verification',
            details: { fromSequence, toSequence }
        })

        const result = await auditLogService.verifyIntegrity({
            fromSequence,
            toSequence,
            batchSize
        })

        res.json({
            success: true,
            data: result
        })

    } catch (error: any) {
        logger.error('[AuditLogController] Verify integrity failed', { error })
        next(new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to verify integrity: ${error.message}`
        ))
    }
}

// ==================== EXPORT LOGS ====================

/**
 * POST /api/v1/admin/audit-logs/export
 * Exportiert Audit-Logs als JSON oder CSV
 */
export const exportAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            format = 'json',
            category,
            action,
            status,
            riskLevel,
            userId,
            fromDate,
            toDate,
            reason
        } = req.body

        const filter: AuditLogFilter = {
            category,
            action,
            status,
            riskLevel,
            userId,
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
            limit: 50000 // Max für Export
        }

        // Audit-Log für diesen Export
        await auditLogService.log({
            category: AuditCategory.DATA,
            action: AuditAction.DATA_EXPORT,
            riskLevel: AuditRiskLevel.HIGH,
            userId: (req as any).user?.id,
            username: (req as any).user?.username,
            ipAddress: req.ip,
            requestPath: req.path,
            description: `Admin exported audit logs as ${format.toUpperCase()}`,
            details: { filter, reason },
            retentionCategory: 'extended'
        })

        let result: { data: string; count: number; hash: string }

        if (format === 'csv') {
            result = await auditLogService.exportToCSV(filter)
            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`)
        } else {
            result = await auditLogService.exportToJSON(filter)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`)
        }

        res.setHeader('X-Export-Count', result.count.toString())
        res.setHeader('X-Export-Hash', result.hash)

        res.send(result.data)

    } catch (error: any) {
        logger.error('[AuditLogController] Export failed', { error })
        next(new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to export audit logs: ${error.message}`
        ))
    }
}

// ==================== RUN RETENTION POLICY ====================

/**
 * POST /api/v1/admin/audit-logs/run-retention
 * Führt die Retention-Policy manuell aus
 */
export const runRetentionPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Audit-Log für diese Aktion
        await auditLogService.log({
            category: AuditCategory.ADMIN,
            action: AuditAction.ADMIN_ACCESS,
            riskLevel: AuditRiskLevel.HIGH,
            userId: (req as any).user?.id,
            username: (req as any).user?.username,
            ipAddress: req.ip,
            requestPath: req.path,
            description: 'Admin manually triggered retention policy',
            retentionCategory: 'extended'
        })

        const result = await auditLogService.runRetentionPolicy()

        res.json({
            success: true,
            data: {
                deleted: result.deleted,
                exported: result.exported,
                message: `Retention policy executed: ${result.deleted} logs deleted, ${result.exported} logs exported`
            }
        })

    } catch (error: any) {
        logger.error('[AuditLogController] Run retention failed', { error })
        next(new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to run retention policy: ${error.message}`
        ))
    }
}

// ==================== GET FILTER OPTIONS ====================

/**
 * GET /api/v1/admin/audit-logs/filter-options
 * Gibt verfügbare Filter-Optionen zurück
 */
export const getFilterOptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json({
            success: true,
            data: {
                categories: Object.values(AuditCategory),
                actions: Object.values(AuditAction),
                statuses: Object.values(AuditStatus),
                riskLevels: Object.values(AuditRiskLevel),
                retentionCategories: ['standard', 'extended', 'permanent']
            }
        })

    } catch (error: any) {
        next(new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to get filter options: ${error.message}`
        ))
    }
}

// ==================== ROUTES EXPORT ====================

export default {
    listAuditLogs,
    getAuditLog,
    getAuditLogStats,
    verifyIntegrity,
    exportAuditLogs,
    runRetentionPolicy,
    getFilterOptions
}
