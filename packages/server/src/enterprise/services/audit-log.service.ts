/**
 * M.A.T.E. Audit Log Service
 * 
 * S1.4a - Umfassender AuditLogService mit Tamper-Proof Hashing
 * S1.4c - SHA-256 Hash-Kette für Integritätsprüfung
 * S1.4d - Log Retention Policy (90/365 Tage)
 * S1.4f - Export (CSV, JSON)
 * 
 * Features:
 * - Unveränderliche Hash-Kette (Blockchain-ähnlich)
 * - Automatische Retention-Policy-Durchsetzung
 * - Export-Funktionen für Compliance
 * - Integritätsprüfung der Log-Kette
 */

import * as crypto from 'crypto'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import {
    AuditLog,
    AuditCategory,
    AuditAction,
    AuditStatus,
    AuditRiskLevel,
    AuditRetentionSettings,
    AuditExportHistory
} from '../database/entities/audit-log.entity'

// ==================== INTERFACES ====================

export interface AuditLogEntry {
    category: AuditCategory
    action: AuditAction
    status?: AuditStatus
    riskLevel?: AuditRiskLevel
    userId?: string
    username?: string
    targetUserId?: string
    ipAddress?: string
    userAgent?: string
    requestPath?: string
    requestMethod?: string
    requestId?: string
    sessionId?: string
    resourceType?: string
    resourceId?: string
    description?: string
    details?: Record<string, any>
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    responseStatus?: number
    errorCode?: string
    errorMessage?: string
    durationMs?: number
    retentionCategory?: 'standard' | 'extended' | 'permanent'
}

export interface AuditLogFilter {
    category?: AuditCategory
    action?: AuditAction
    status?: AuditStatus
    riskLevel?: AuditRiskLevel
    userId?: string
    resourceType?: string
    resourceId?: string
    fromDate?: Date
    toDate?: Date
    search?: string
    limit?: number
    offset?: number
}

export interface AuditLogStats {
    totalLogs: number
    byCategory: Record<string, number>
    byAction: Record<string, number>
    byStatus: Record<string, number>
    byRiskLevel: Record<string, number>
    recentHighRisk: number
    chainIntegrity: {
        verified: boolean
        lastVerified: Date
        brokenAt?: number
    }
}

export interface IntegrityCheckResult {
    valid: boolean
    totalChecked: number
    firstBrokenSequence?: number
    brokenEntries: number[]
    message: string
}

// ==================== CONSTANTS ====================

const GENESIS_HASH = '0'.repeat(64) // Genesis-Block Hash
const HASH_ALGORITHM = 'sha256'

// ==================== AUDIT LOG SERVICE ====================

class AuditLogService {
    private static instance: AuditLogService
    private enabled: boolean
    private initialized: boolean = false
    private lastSequenceNumber: number = 0
    private lastHash: string = GENESIS_HASH
    private retentionSettings: AuditRetentionSettings | null = null

    private constructor() {
        this.enabled = process.env.AUDIT_LOG_ENABLED !== 'false'
    }

    public static getInstance(): AuditLogService {
        if (!AuditLogService.instance) {
            AuditLogService.instance = new AuditLogService()
        }
        return AuditLogService.instance
    }

    /**
     * Initialisiert den Service und lädt den letzten Hash
     */
    private async initialize(): Promise<void> {
        if (this.initialized) return

        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            // Prüfen ob Entity registriert ist
            if (!dataSource.hasMetadata(AuditLog.name)) {
                logger.warn('[AuditLog] Entity not registered, skipping initialization')
                return
            }

            const repository = dataSource.getRepository(AuditLog)

            // Letzten Eintrag laden
            const lastEntry = await repository.findOne({
                order: { sequenceNumber: 'DESC' }
            })

            if (lastEntry) {
                this.lastSequenceNumber = Number(lastEntry.sequenceNumber)
                this.lastHash = lastEntry.entryHash
            }

            // Retention Settings laden oder erstellen
            await this.loadRetentionSettings()

            this.initialized = true
            logger.info('[AuditLog] Service initialized', {
                lastSequence: this.lastSequenceNumber,
                enabled: this.enabled
            })

        } catch (error) {
            logger.error('[AuditLog] Initialization failed', { error })
        }
    }

    /**
     * Lädt oder erstellt die Retention Settings
     */
    private async loadRetentionSettings(): Promise<void> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata(AuditRetentionSettings.name)) {
                return
            }

            const repository = dataSource.getRepository(AuditRetentionSettings)
            let settings = await repository.findOne({ where: { id: 'default' } })

            if (!settings) {
                settings = new AuditRetentionSettings()
                settings.standardRetentionDays = parseInt(process.env.AUDIT_STANDARD_RETENTION_DAYS || '90')
                settings.extendedRetentionDays = parseInt(process.env.AUDIT_EXTENDED_RETENTION_DAYS || '365')
                await repository.save(settings)
            }

            this.retentionSettings = settings

        } catch (error) {
            logger.error('[AuditLog] Failed to load retention settings', { error })
        }
    }

    /**
     * Berechnet den SHA-256 Hash eines Eintrags
     */
    private calculateHash(entry: {
        sequenceNumber: number
        previousHash: string
        timestamp: string
        category: string
        action: string
        userId?: string
        details?: string
    }): string {
        const data = JSON.stringify({
            seq: entry.sequenceNumber,
            prev: entry.previousHash,
            ts: entry.timestamp,
            cat: entry.category,
            act: entry.action,
            uid: entry.userId || '',
            det: entry.details || ''
        })

        return crypto
            .createHash(HASH_ALGORITHM)
            .update(data)
            .digest('hex')
    }

    /**
     * Protokolliert ein Audit-Event (Hauptmethode)
     */
    public async log(entry: AuditLogEntry): Promise<AuditLog | null> {
        if (!this.enabled) return null

        try {
            await this.initialize()

            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata(AuditLog.name)) {
                // Fallback: Nur loggen
                logger.info('[AuditLog]', {
                    category: entry.category,
                    action: entry.action,
                    userId: entry.userId,
                    description: entry.description
                })
                return null
            }

            const repository = dataSource.getRepository(AuditLog)

            // Neue Sequenznummer
            this.lastSequenceNumber++
            const sequenceNumber = this.lastSequenceNumber

            // Zeitstempel
            const now = new Date()
            const hashTimestamp = now.toISOString()

            // Neuen Audit-Log erstellen
            const auditLog = new AuditLog()
            auditLog.sequenceNumber = sequenceNumber
            auditLog.category = entry.category
            auditLog.action = entry.action
            auditLog.status = entry.status || AuditStatus.SUCCESS
            auditLog.riskLevel = entry.riskLevel || this.determineRiskLevel(entry)
            auditLog.userId = entry.userId
            auditLog.username = entry.username
            auditLog.targetUserId = entry.targetUserId
            auditLog.ipAddress = entry.ipAddress
            auditLog.userAgent = entry.userAgent?.substring(0, 500)
            auditLog.requestPath = entry.requestPath
            auditLog.requestMethod = entry.requestMethod
            auditLog.requestId = entry.requestId
            auditLog.sessionId = entry.sessionId
            auditLog.resourceType = entry.resourceType
            auditLog.resourceId = entry.resourceId
            auditLog.description = entry.description
            auditLog.responseStatus = entry.responseStatus
            auditLog.errorCode = entry.errorCode
            auditLog.errorMessage = entry.errorMessage
            auditLog.durationMs = entry.durationMs

            // Details als JSON
            if (entry.details) {
                auditLog.setDetails(this.sanitizeDetails(entry.details))
            }
            if (entry.oldValues) {
                auditLog.setOldValues(this.sanitizeDetails(entry.oldValues))
            }
            if (entry.newValues) {
                auditLog.setNewValues(this.sanitizeDetails(entry.newValues))
            }

            // Hash-Kette
            auditLog.previousHash = this.lastHash
            auditLog.hashTimestamp = hashTimestamp
            auditLog.entryHash = this.calculateHash({
                sequenceNumber,
                previousHash: this.lastHash,
                timestamp: hashTimestamp,
                category: entry.category,
                action: entry.action,
                userId: entry.userId,
                details: auditLog.details
            })

            // Retention Category und Ablaufdatum
            auditLog.retentionCategory = entry.retentionCategory || this.determineRetentionCategory(entry)
            auditLog.expiresAt = this.calculateExpiryDate(auditLog.retentionCategory)

            // Speichern
            const saved = await repository.save(auditLog)

            // Letzten Hash aktualisieren
            this.lastHash = saved.entryHash

            // Logging basierend auf Risikostufe
            this.logToConsole(saved)

            return saved

        } catch (error) {
            logger.error('[AuditLog] Failed to log entry', {
                error,
                category: entry.category,
                action: entry.action
            })
            return null
        }
    }

    /**
     * Bestimmt das Risikolevel basierend auf der Aktion
     */
    private determineRiskLevel(entry: AuditLogEntry): AuditRiskLevel {
        // Critical
        if ([
            AuditAction.USER_DELETE,
            AuditAction.DATA_DELETE,
            AuditAction.BACKUP_RESTORE,
            AuditAction.INJECTION_ATTEMPT,
            AuditAction.THREAT_BLOCKED
        ].includes(entry.action)) {
            return AuditRiskLevel.CRITICAL
        }

        // High
        if ([
            AuditAction.PASSWORD_CHANGE,
            AuditAction.PASSWORD_RESET,
            AuditAction.USER_SUSPEND,
            AuditAction.CONFIG_CHANGE,
            AuditAction.API_KEY_CREATE,
            AuditAction.API_KEY_REVOKE,
            AuditAction.WALLET_ADJUST,
            AuditAction.ADMIN_ACCESS,
            AuditAction.THREAT_DETECTED
        ].includes(entry.action)) {
            return AuditRiskLevel.HIGH
        }

        // Medium
        if ([
            AuditAction.LOGIN,
            AuditAction.LOGIN_FAILED,
            AuditAction.USER_CREATE,
            AuditAction.USER_UPDATE,
            AuditAction.DATA_EXPORT,
            AuditAction.RATE_LIMIT_EXCEEDED
        ].includes(entry.action)) {
            return AuditRiskLevel.MEDIUM
        }

        // Default: Low
        return AuditRiskLevel.LOW
    }

    /**
     * Bestimmt die Retention-Kategorie
     */
    private determineRetentionCategory(entry: AuditLogEntry): 'standard' | 'extended' | 'permanent' {
        // Permanent für kritische Security-Events
        if ([AuditCategory.SECURITY].includes(entry.category) &&
            [AuditRiskLevel.CRITICAL, AuditRiskLevel.HIGH].includes(
                entry.riskLevel || AuditRiskLevel.LOW
            )) {
            return 'permanent'
        }

        // Extended für Admin und Security
        if ([AuditCategory.ADMIN, AuditCategory.SECURITY, AuditCategory.AUTH].includes(entry.category)) {
            return 'extended'
        }

        return 'standard'
    }

    /**
     * Berechnet das Ablaufdatum
     */
    private calculateExpiryDate(retentionCategory: 'standard' | 'extended' | 'permanent'): Date | undefined {
        if (retentionCategory === 'permanent') {
            return undefined // Nie löschen
        }

        const days = retentionCategory === 'extended'
            ? (this.retentionSettings?.extendedRetentionDays || 365)
            : (this.retentionSettings?.standardRetentionDays || 90)

        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + days)
        return expiryDate
    }

    /**
     * Entfernt sensible Daten
     */
    private sanitizeDetails(details: Record<string, any>): Record<string, any> {
        const sanitized = { ...details }
        const sensitiveFields = [
            'password', 'token', 'secret', 'apiKey', 'api_key',
            'creditCard', 'credit_card', 'cvv', 'ssn', 'accessToken',
            'refreshToken', 'privateKey', 'encryptionKey'
        ]

        const sanitize = (obj: any): any => {
            if (typeof obj !== 'object' || obj === null) return obj
            if (Array.isArray(obj)) return obj.map(sanitize)

            const result: Record<string, any> = {}
            for (const [key, value] of Object.entries(obj)) {
                const lowerKey = key.toLowerCase()
                if (sensitiveFields.some(f => lowerKey.includes(f.toLowerCase()))) {
                    result[key] = '[REDACTED]'
                } else if (typeof value === 'object') {
                    result[key] = sanitize(value)
                } else {
                    result[key] = value
                }
            }
            return result
        }

        return sanitize(sanitized)
    }

    /**
     * Logging zur Konsole
     */
    private logToConsole(entry: AuditLog): void {
        const logData = {
            seq: entry.sequenceNumber,
            category: entry.category,
            action: entry.action,
            status: entry.status,
            risk: entry.riskLevel,
            userId: entry.userId,
            resource: entry.resourceType ? `${entry.resourceType}:${entry.resourceId}` : undefined
        }

        switch (entry.riskLevel) {
            case AuditRiskLevel.CRITICAL:
                logger.error('[AuditLog] CRITICAL', logData)
                break
            case AuditRiskLevel.HIGH:
                logger.warn('[AuditLog] HIGH', logData)
                break
            case AuditRiskLevel.MEDIUM:
                logger.info('[AuditLog] MEDIUM', logData)
                break
            default:
                logger.debug('[AuditLog] LOW', logData)
        }
    }

    // ==================== QUERY METHODS ====================

    /**
     * Holt Audit-Logs mit Filter
     */
    public async getLogs(filter: AuditLogFilter): Promise<{ logs: AuditLog[]; total: number }> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata(AuditLog.name)) {
                return { logs: [], total: 0 }
            }

            const repository = dataSource.getRepository(AuditLog)
            const qb = repository.createQueryBuilder('log')

            // Filter anwenden
            if (filter.category) {
                qb.andWhere('log.category = :category', { category: filter.category })
            }
            if (filter.action) {
                qb.andWhere('log.action = :action', { action: filter.action })
            }
            if (filter.status) {
                qb.andWhere('log.status = :status', { status: filter.status })
            }
            if (filter.riskLevel) {
                qb.andWhere('log.riskLevel = :riskLevel', { riskLevel: filter.riskLevel })
            }
            if (filter.userId) {
                qb.andWhere('log.userId = :userId', { userId: filter.userId })
            }
            if (filter.resourceType) {
                qb.andWhere('log.resourceType = :resourceType', { resourceType: filter.resourceType })
            }
            if (filter.resourceId) {
                qb.andWhere('log.resourceId = :resourceId', { resourceId: filter.resourceId })
            }
            if (filter.fromDate) {
                qb.andWhere('log.createdAt >= :fromDate', { fromDate: filter.fromDate })
            }
            if (filter.toDate) {
                qb.andWhere('log.createdAt <= :toDate', { toDate: filter.toDate })
            }
            if (filter.search) {
                qb.andWhere(
                    '(log.description LIKE :search OR log.username LIKE :search OR log.requestPath LIKE :search)',
                    { search: `%${filter.search}%` }
                )
            }

            // Count
            const total = await qb.getCount()

            // Pagination und Sortierung
            qb.orderBy('log.sequenceNumber', 'DESC')
            if (filter.limit) {
                qb.take(filter.limit)
            }
            if (filter.offset) {
                qb.skip(filter.offset)
            }

            const logs = await qb.getMany()

            return { logs, total }

        } catch (error) {
            logger.error('[AuditLog] Failed to get logs', { error })
            return { logs: [], total: 0 }
        }
    }

    /**
     * Holt Statistiken
     */
    public async getStats(hours: number = 24): Promise<AuditLogStats> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            const defaultStats: AuditLogStats = {
                totalLogs: 0,
                byCategory: {},
                byAction: {},
                byStatus: {},
                byRiskLevel: {},
                recentHighRisk: 0,
                chainIntegrity: {
                    verified: true,
                    lastVerified: new Date()
                }
            }

            if (!dataSource.hasMetadata(AuditLog.name)) {
                return defaultStats
            }

            const repository = dataSource.getRepository(AuditLog)
            const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

            // Total
            defaultStats.totalLogs = await repository.count({
                where: { createdAt: { $gte: cutoff } as any }
            })

            // By Category
            const byCategory = await repository
                .createQueryBuilder('log')
                .select('log.category', 'category')
                .addSelect('COUNT(*)', 'count')
                .where('log.createdAt >= :cutoff', { cutoff })
                .groupBy('log.category')
                .getRawMany()

            for (const row of byCategory) {
                defaultStats.byCategory[row.category] = parseInt(row.count)
            }

            // By Risk Level
            const byRisk = await repository
                .createQueryBuilder('log')
                .select('log.riskLevel', 'riskLevel')
                .addSelect('COUNT(*)', 'count')
                .where('log.createdAt >= :cutoff', { cutoff })
                .groupBy('log.riskLevel')
                .getRawMany()

            for (const row of byRisk) {
                defaultStats.byRiskLevel[row.riskLevel] = parseInt(row.count)
            }

            // High Risk Count
            defaultStats.recentHighRisk = (defaultStats.byRiskLevel[AuditRiskLevel.HIGH] || 0) +
                (defaultStats.byRiskLevel[AuditRiskLevel.CRITICAL] || 0)

            return defaultStats

        } catch (error) {
            logger.error('[AuditLog] Failed to get stats', { error })
            return {
                totalLogs: 0,
                byCategory: {},
                byAction: {},
                byStatus: {},
                byRiskLevel: {},
                recentHighRisk: 0,
                chainIntegrity: { verified: false, lastVerified: new Date() }
            }
        }
    }

    // ==================== INTEGRITY CHECK ====================

    /**
     * Prüft die Integrität der Hash-Kette
     */
    public async verifyIntegrity(options?: {
        fromSequence?: number
        toSequence?: number
        batchSize?: number
    }): Promise<IntegrityCheckResult> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata(AuditLog.name)) {
                return {
                    valid: true,
                    totalChecked: 0,
                    brokenEntries: [],
                    message: 'Entity not registered'
                }
            }

            const repository = dataSource.getRepository(AuditLog)
            const batchSize = options?.batchSize || 1000
            let offset = 0
            let previousHash = GENESIS_HASH
            let totalChecked = 0
            const brokenEntries: number[] = []
            let firstBrokenSequence: number | undefined

            // Startpunkt laden
            if (options?.fromSequence && options.fromSequence > 1) {
                const prevEntry = await repository.findOne({
                    where: { sequenceNumber: options.fromSequence - 1 }
                })
                if (prevEntry) {
                    previousHash = prevEntry.entryHash
                }
            }

            // Batch-weise verarbeiten
            while (true) {
                const qb = repository.createQueryBuilder('log')
                    .orderBy('log.sequenceNumber', 'ASC')
                    .skip(offset)
                    .take(batchSize)

                if (options?.fromSequence) {
                    qb.andWhere('log.sequenceNumber >= :from', { from: options.fromSequence })
                }
                if (options?.toSequence) {
                    qb.andWhere('log.sequenceNumber <= :to', { to: options.toSequence })
                }

                const batch = await qb.getMany()
                if (batch.length === 0) break

                for (const entry of batch) {
                    totalChecked++

                    // Previous Hash prüfen
                    if (entry.previousHash !== previousHash) {
                        brokenEntries.push(Number(entry.sequenceNumber))
                        if (!firstBrokenSequence) {
                            firstBrokenSequence = Number(entry.sequenceNumber)
                        }
                    }

                    // Entry Hash verifizieren
                    const calculatedHash = this.calculateHash({
                        sequenceNumber: Number(entry.sequenceNumber),
                        previousHash: entry.previousHash,
                        timestamp: entry.hashTimestamp,
                        category: entry.category,
                        action: entry.action,
                        userId: entry.userId,
                        details: entry.details
                    })

                    if (calculatedHash !== entry.entryHash) {
                        brokenEntries.push(Number(entry.sequenceNumber))
                        if (!firstBrokenSequence) {
                            firstBrokenSequence = Number(entry.sequenceNumber)
                        }
                    }

                    previousHash = entry.entryHash
                }

                offset += batchSize
            }

            const valid = brokenEntries.length === 0

            return {
                valid,
                totalChecked,
                firstBrokenSequence,
                brokenEntries,
                message: valid
                    ? `Chain integrity verified: ${totalChecked} entries checked`
                    : `Chain integrity broken: ${brokenEntries.length} entries affected`
            }

        } catch (error) {
            logger.error('[AuditLog] Integrity check failed', { error })
            return {
                valid: false,
                totalChecked: 0,
                brokenEntries: [],
                message: `Verification failed: ${error}`
            }
        }
    }

    // ==================== RETENTION POLICY ====================

    /**
     * Führt die Retention-Policy durch (löscht abgelaufene Logs)
     */
    public async runRetentionPolicy(): Promise<{ deleted: number; exported: number }> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata(AuditLog.name)) {
                return { deleted: 0, exported: 0 }
            }

            await this.loadRetentionSettings()

            if (!this.retentionSettings?.autoCleanupEnabled) {
                logger.info('[AuditLog] Auto cleanup disabled')
                return { deleted: 0, exported: 0 }
            }

            const repository = dataSource.getRepository(AuditLog)
            const now = new Date()
            let exported = 0

            // Export vor Löschung (falls aktiviert)
            if (this.retentionSettings.exportBeforeDelete) {
                const toExport = await repository
                    .createQueryBuilder('log')
                    .where('log.expiresAt <= :now', { now })
                    .andWhere('log.exported = :exported', { exported: false })
                    .andWhere('log.retentionCategory != :perm', { perm: 'permanent' })
                    .getMany()

                if (toExport.length > 0) {
                    // Export durchführen
                    await this.exportLogs({
                        format: 'json',
                        logs: toExport,
                        reason: 'Pre-deletion retention export'
                    })
                    exported = toExport.length

                    // Als exportiert markieren
                    await repository
                        .createQueryBuilder()
                        .update()
                        .set({ exported: true, exportedAt: now })
                        .where('id IN (:...ids)', { ids: toExport.map(l => l.id) })
                        .execute()
                }
            }

            // Abgelaufene Logs löschen
            const result = await repository
                .createQueryBuilder()
                .delete()
                .where('expiresAt <= :now', { now })
                .andWhere('retentionCategory != :perm', { perm: 'permanent' })
                .execute()

            const deleted = result.affected || 0

            // Settings aktualisieren
            if (this.retentionSettings) {
                const settingsRepo = dataSource.getRepository(AuditRetentionSettings)
                this.retentionSettings.lastCleanupAt = now
                this.retentionSettings.lastCleanupCount = deleted
                await settingsRepo.save(this.retentionSettings)
            }

            if (deleted > 0 || exported > 0) {
                logger.info('[AuditLog] Retention policy executed', { deleted, exported })
            }

            return { deleted, exported }

        } catch (error) {
            logger.error('[AuditLog] Retention policy failed', { error })
            return { deleted: 0, exported: 0 }
        }
    }

    // ==================== EXPORT METHODS ====================

    /**
     * Exportiert Logs als JSON
     */
    public async exportToJSON(filter: AuditLogFilter): Promise<{
        data: string
        count: number
        hash: string
    }> {
        const { logs } = await this.getLogs({ ...filter, limit: filter.limit || 10000 })

        const exportData = {
            exportDate: new Date().toISOString(),
            filter,
            count: logs.length,
            logs: logs.map(log => ({
                id: log.id,
                sequenceNumber: log.sequenceNumber,
                createdAt: log.createdAt,
                category: log.category,
                action: log.action,
                status: log.status,
                riskLevel: log.riskLevel,
                userId: log.userId,
                username: log.username,
                ipAddress: log.ipAddress,
                requestPath: log.requestPath,
                resourceType: log.resourceType,
                resourceId: log.resourceId,
                description: log.description,
                details: log.getDetails(),
                errorCode: log.errorCode,
                errorMessage: log.errorMessage,
                entryHash: log.entryHash
            }))
        }

        const jsonString = JSON.stringify(exportData, null, 2)
        const hash = crypto.createHash('sha256').update(jsonString).digest('hex')

        return {
            data: jsonString,
            count: logs.length,
            hash
        }
    }

    /**
     * Exportiert Logs als CSV
     */
    public async exportToCSV(filter: AuditLogFilter): Promise<{
        data: string
        count: number
        hash: string
    }> {
        const { logs } = await this.getLogs({ ...filter, limit: filter.limit || 10000 })

        // Header
        const headers = [
            'ID', 'Sequence', 'Created At', 'Category', 'Action', 'Status',
            'Risk Level', 'User ID', 'Username', 'IP Address', 'Request Path',
            'Resource Type', 'Resource ID', 'Description', 'Error Code', 'Hash'
        ]

        const rows = logs.map(log => [
            log.id,
            log.sequenceNumber,
            log.createdAt.toISOString(),
            log.category,
            log.action,
            log.status,
            log.riskLevel,
            log.userId || '',
            log.username || '',
            log.ipAddress || '',
            log.requestPath || '',
            log.resourceType || '',
            log.resourceId || '',
            (log.description || '').replace(/"/g, '""'),
            log.errorCode || '',
            log.entryHash
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const hash = crypto.createHash('sha256').update(csvContent).digest('hex')

        return {
            data: csvContent,
            count: logs.length,
            hash
        }
    }

    /**
     * Speichert Export-Historie
     */
    private async exportLogs(params: {
        format: 'json' | 'csv'
        logs: AuditLog[]
        reason?: string
        exportedBy?: string
    }): Promise<void> {
        try {
            const appServer = getRunningExpressApp()
            const dataSource = appServer.AppDataSource

            if (!dataSource.hasMetadata(AuditExportHistory.name)) {
                return
            }

            const repository = dataSource.getRepository(AuditExportHistory)

            const minDate = params.logs.reduce((min, log) =>
                log.createdAt < min ? log.createdAt : min, params.logs[0]?.createdAt || new Date())
            const maxDate = params.logs.reduce((max, log) =>
                log.createdAt > max ? log.createdAt : max, params.logs[0]?.createdAt || new Date())

            const export_ = new AuditExportHistory()
            export_.format = params.format
            export_.periodStart = minDate
            export_.periodEnd = maxDate
            export_.entryCount = params.logs.length
            export_.exportedBy = params.exportedBy
            export_.exportReason = params.reason

            await repository.save(export_)

        } catch (error) {
            logger.error('[AuditLog] Failed to save export history', { error })
        }
    }

    // ==================== CONVENIENCE METHODS ====================

    /**
     * Protokolliert Login-Ereignis
     */
    public async logLogin(params: {
        userId: string
        username: string
        success: boolean
        ip?: string
        userAgent?: string
        errorMessage?: string
    }): Promise<void> {
        await this.log({
            category: AuditCategory.AUTH,
            action: params.success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
            status: params.success ? AuditStatus.SUCCESS : AuditStatus.FAILURE,
            userId: params.userId,
            username: params.username,
            ipAddress: params.ip,
            userAgent: params.userAgent,
            description: params.success
                ? `User ${params.username} logged in`
                : `Failed login attempt for ${params.username}`,
            errorMessage: params.errorMessage,
            retentionCategory: 'extended'
        })
    }

    /**
     * Protokolliert Admin-Aktion
     */
    public async logAdminAction(params: {
        adminUserId: string
        adminUsername?: string
        action: string
        targetUserId?: string
        details?: Record<string, any>
        ip?: string
    }): Promise<void> {
        await this.log({
            category: AuditCategory.ADMIN,
            action: AuditAction.ADMIN_ACCESS,
            riskLevel: AuditRiskLevel.HIGH,
            userId: params.adminUserId,
            username: params.adminUsername,
            targetUserId: params.targetUserId,
            ipAddress: params.ip,
            description: `Admin action: ${params.action}`,
            details: params.details,
            retentionCategory: 'extended'
        })
    }

    /**
     * Protokolliert Konfigurationsänderung
     */
    public async logConfigChange(params: {
        userId: string
        username?: string
        configKey: string
        oldValue?: any
        newValue?: any
        ip?: string
    }): Promise<void> {
        await this.log({
            category: AuditCategory.CONFIG,
            action: AuditAction.CONFIG_CHANGE,
            riskLevel: AuditRiskLevel.HIGH,
            userId: params.userId,
            username: params.username,
            resourceType: 'config',
            resourceId: params.configKey,
            ipAddress: params.ip,
            description: `Configuration changed: ${params.configKey}`,
            oldValues: params.oldValue !== undefined ? { value: params.oldValue } : undefined,
            newValues: params.newValue !== undefined ? { value: params.newValue } : undefined,
            retentionCategory: 'extended'
        })
    }

    /**
     * Protokolliert Security-Event
     */
    public async logSecurityEvent(params: {
        action: AuditAction
        riskLevel: AuditRiskLevel
        userId?: string
        ip?: string
        description: string
        details?: Record<string, any>
    }): Promise<void> {
        await this.log({
            category: AuditCategory.SECURITY,
            action: params.action,
            riskLevel: params.riskLevel,
            status: params.riskLevel === AuditRiskLevel.CRITICAL ? AuditStatus.BLOCKED : AuditStatus.SUCCESS,
            userId: params.userId,
            ipAddress: params.ip,
            description: params.description,
            details: params.details,
            retentionCategory: params.riskLevel === AuditRiskLevel.CRITICAL ? 'permanent' : 'extended'
        })
    }
}

export const auditLogService = AuditLogService.getInstance()
