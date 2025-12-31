import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import logger from '../../utils/logger'

/**
 * M.A.T.E. Security Audit Service
 * 
 * Spezialisierter Audit-Service für Sicherheitsereignisse:
 * - PII Detection Events
 * - Prompt Injection Attempts
 * - Rate Limit Violations
 * - Admin Actions
 * - Security Threats
 */

export enum SecurityEventType {
    // PII Events
    PII_DETECTED = 'PII_DETECTED',
    PII_BLOCKED = 'PII_BLOCKED',
    
    // Injection Events
    INJECTION_DETECTED = 'INJECTION_DETECTED',
    INJECTION_BLOCKED = 'INJECTION_BLOCKED',
    
    // Rate Limiting
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
    
    // Authentication
    AUTH_FAILED = 'AUTH_FAILED',
    AUTH_SUSPICIOUS = 'AUTH_SUSPICIOUS',
    
    // Admin Actions
    ADMIN_WALLET_ADJUST = 'ADMIN_WALLET_ADJUST',
    ADMIN_USER_MODIFY = 'ADMIN_USER_MODIFY',
    ADMIN_CONFIG_CHANGE = 'ADMIN_CONFIG_CHANGE',
    
    // General Security
    SECURITY_THREAT = 'SECURITY_THREAT',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

export enum SecuritySeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface SecurityAuditEvent {
    type: SecurityEventType
    severity: SecuritySeverity
    userId?: string
    ip?: string
    userAgent?: string
    path?: string
    method?: string
    details: Record<string, any>
    timestamp?: Date
}

// In-Memory Storage für Security Events (für Production: DB-Tabelle)
const securityEvents: Array<SecurityAuditEvent & { id: string; timestamp: Date }> = []
const MAX_EVENTS = 10000 // Maximum im Memory halten

class SecurityAuditService {
    private static instance: SecurityAuditService
    private enabled: boolean

    private constructor() {
        this.enabled = process.env.SECURITY_AUDIT_ENABLED !== 'false'
    }

    public static getInstance(): SecurityAuditService {
        if (!SecurityAuditService.instance) {
            SecurityAuditService.instance = new SecurityAuditService()
        }
        return SecurityAuditService.instance
    }

    /**
     * Zeichnet ein Security-Event auf
     */
    public async recordEvent(event: SecurityAuditEvent): Promise<void> {
        if (!this.enabled) return

        const timestamp = event.timestamp || new Date()
        const id = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const fullEvent = {
            ...event,
            id,
            timestamp
        }

        // In Memory speichern
        securityEvents.unshift(fullEvent)

        // Alte Events entfernen
        if (securityEvents.length > MAX_EVENTS) {
            securityEvents.length = MAX_EVENTS
        }

        // Logging basierend auf Severity
        const logData = {
            eventId: id,
            type: event.type,
            severity: event.severity,
            userId: event.userId,
            ip: event.ip,
            path: event.path,
            details: this.sanitizeDetails(event.details)
        }

        switch (event.severity) {
            case SecuritySeverity.CRITICAL:
                logger.error('[SecurityAudit] CRITICAL', logData)
                // TODO: Alert an Admin senden (Email, Slack, etc.)
                break
            case SecuritySeverity.HIGH:
                logger.warn('[SecurityAudit] HIGH', logData)
                break
            case SecuritySeverity.MEDIUM:
                logger.info('[SecurityAudit] MEDIUM', logData)
                break
            case SecuritySeverity.LOW:
                logger.debug('[SecurityAudit] LOW', logData)
                break
        }
    }

    /**
     * Zeichnet PII-Detection auf
     */
    public async recordPIIDetection(params: {
        userId?: string
        ip?: string
        path?: string
        piiTypes: string[]
        blocked: boolean
    }): Promise<void> {
        await this.recordEvent({
            type: params.blocked ? SecurityEventType.PII_BLOCKED : SecurityEventType.PII_DETECTED,
            severity: params.blocked ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
            userId: params.userId,
            ip: params.ip,
            path: params.path,
            details: {
                piiTypes: params.piiTypes,
                blocked: params.blocked
            }
        })
    }

    /**
     * Zeichnet Injection-Versuch auf
     */
    public async recordInjectionAttempt(params: {
        userId?: string
        ip?: string
        path?: string
        confidence: 'high' | 'medium' | 'low'
        patterns: string[]
        blocked: boolean
    }): Promise<void> {
        let severity = SecuritySeverity.LOW
        if (params.confidence === 'high') severity = SecuritySeverity.HIGH
        else if (params.confidence === 'medium') severity = SecuritySeverity.MEDIUM

        await this.recordEvent({
            type: params.blocked ? SecurityEventType.INJECTION_BLOCKED : SecurityEventType.INJECTION_DETECTED,
            severity,
            userId: params.userId,
            ip: params.ip,
            path: params.path,
            details: {
                confidence: params.confidence,
                patternCount: params.patterns.length,
                blocked: params.blocked
            }
        })
    }

    /**
     * Zeichnet Rate-Limit-Überschreitung auf
     */
    public async recordRateLimitExceeded(params: {
        userId?: string
        ip?: string
        path?: string
        limitType: 'request' | 'token'
        limit: number
        current: number
    }): Promise<void> {
        await this.recordEvent({
            type: params.limitType === 'token' 
                ? SecurityEventType.TOKEN_LIMIT_EXCEEDED 
                : SecurityEventType.RATE_LIMIT_EXCEEDED,
            severity: SecuritySeverity.MEDIUM,
            userId: params.userId,
            ip: params.ip,
            path: params.path,
            details: {
                limitType: params.limitType,
                limit: params.limit,
                current: params.current
            }
        })
    }

    /**
     * Zeichnet Admin-Aktion auf
     */
    public async recordAdminAction(params: {
        adminUserId: string
        action: 'wallet_adjust' | 'user_modify' | 'config_change'
        targetUserId?: string
        details: Record<string, any>
        ip?: string
    }): Promise<void> {
        let type = SecurityEventType.ADMIN_CONFIG_CHANGE
        if (params.action === 'wallet_adjust') type = SecurityEventType.ADMIN_WALLET_ADJUST
        else if (params.action === 'user_modify') type = SecurityEventType.ADMIN_USER_MODIFY

        await this.recordEvent({
            type,
            severity: SecuritySeverity.MEDIUM,
            userId: params.adminUserId,
            ip: params.ip,
            details: {
                action: params.action,
                targetUserId: params.targetUserId,
                ...params.details
            }
        })
    }

    /**
     * Holt Security-Events mit Filter
     */
    public async getEvents(params?: {
        type?: SecurityEventType
        severity?: SecuritySeverity
        userId?: string
        fromDate?: Date
        toDate?: Date
        limit?: number
    }): Promise<Array<SecurityAuditEvent & { id: string; timestamp: Date }>> {
        let filtered = [...securityEvents]

        if (params?.type) {
            filtered = filtered.filter(e => e.type === params.type)
        }
        if (params?.severity) {
            filtered = filtered.filter(e => e.severity === params.severity)
        }
        if (params?.userId) {
            filtered = filtered.filter(e => e.userId === params.userId)
        }
        if (params?.fromDate) {
            filtered = filtered.filter(e => e.timestamp >= params.fromDate!)
        }
        if (params?.toDate) {
            filtered = filtered.filter(e => e.timestamp <= params.toDate!)
        }

        const limit = params?.limit || 100
        return filtered.slice(0, limit)
    }

    /**
     * Statistiken über Security-Events
     */
    public async getStats(hours: number = 24): Promise<{
        totalEvents: number
        bySeverity: Record<SecuritySeverity, number>
        byType: Record<string, number>
        recentThreats: number
    }> {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
        const recent = securityEvents.filter(e => e.timestamp >= cutoff)

        const bySeverity = {
            [SecuritySeverity.LOW]: 0,
            [SecuritySeverity.MEDIUM]: 0,
            [SecuritySeverity.HIGH]: 0,
            [SecuritySeverity.CRITICAL]: 0
        }

        const byType: Record<string, number> = {}

        for (const event of recent) {
            bySeverity[event.severity]++
            byType[event.type] = (byType[event.type] || 0) + 1
        }

        const recentThreats = recent.filter(e => 
            e.severity === SecuritySeverity.HIGH || 
            e.severity === SecuritySeverity.CRITICAL
        ).length

        return {
            totalEvents: recent.length,
            bySeverity,
            byType,
            recentThreats
        }
    }

    /**
     * Entfernt sensible Daten aus Details für Logging
     */
    private sanitizeDetails(details: Record<string, any>): Record<string, any> {
        const sanitized = { ...details }
        
        // Sensible Felder entfernen
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard']
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]'
            }
        }

        return sanitized
    }
}

export const securityAuditService = SecurityAuditService.getInstance()
