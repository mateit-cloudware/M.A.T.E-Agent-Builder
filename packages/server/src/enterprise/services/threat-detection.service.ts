/**
 * M.A.T.E. Threat Detection System
 * 
 * Umfassendes System zur Erkennung und Abwehr von Sicherheitsbedrohungen.
 * 
 * Features:
 * - Rate Limiting (User, IP, Endpoint)
 * - Brute-Force Protection
 * - Suspicious Activity Detection
 * - IP Blocklisting
 * - Security Event Logging
 * - Security Alerts (E-Mail)
 * 
 * @module services/threat-detection
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import crypto from 'crypto'
import logger from '../../utils/logger'

// ==================== CONFIGURATION ====================

/**
 * Rate-Limit Konfiguration
 */
export interface RateLimitConfig {
    // Global
    globalRequestsPerMinute: number
    globalRequestsPerHour: number
    
    // Per User
    userRequestsPerMinute: number
    userRequestsPerHour: number
    
    // Per IP
    ipRequestsPerMinute: number
    ipRequestsPerHour: number
    
    // Per Endpoint
    endpointLimits: Record<string, { perMinute: number; perHour: number }>
    
    // Auth Endpoints (strikter)
    authRequestsPerMinute: number
    authRequestsPerHour: number
}

/**
 * Brute-Force Protection Konfiguration
 */
export interface BruteForceConfig {
    maxLoginAttempts: number
    lockoutDurationMinutes: number
    attemptWindowMinutes: number
    progressiveLockout: boolean
    alertOnLockout: boolean
}

/**
 * Standard-Konfiguration
 */
export const DEFAULT_CONFIG: RateLimitConfig = {
    globalRequestsPerMinute: parseInt(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE || '1000'),
    globalRequestsPerHour: parseInt(process.env.RATE_LIMIT_GLOBAL_PER_HOUR || '30000'),
    userRequestsPerMinute: parseInt(process.env.RATE_LIMIT_USER_PER_MINUTE || '100'),
    userRequestsPerHour: parseInt(process.env.RATE_LIMIT_USER_PER_HOUR || '3000'),
    ipRequestsPerMinute: parseInt(process.env.RATE_LIMIT_IP_PER_MINUTE || '60'),
    ipRequestsPerHour: parseInt(process.env.RATE_LIMIT_IP_PER_HOUR || '1000'),
    authRequestsPerMinute: parseInt(process.env.RATE_LIMIT_AUTH_PER_MINUTE || '10'),
    authRequestsPerHour: parseInt(process.env.RATE_LIMIT_AUTH_PER_HOUR || '50'),
    endpointLimits: {
        '/api/v1/prediction': { perMinute: 30, perHour: 500 },
        '/api/v1/openai': { perMinute: 20, perHour: 300 },
        '/api/v1/auth': { perMinute: 10, perHour: 50 }
    }
}

export const DEFAULT_BRUTE_FORCE_CONFIG: BruteForceConfig = {
    maxLoginAttempts: parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '5'),
    lockoutDurationMinutes: parseInt(process.env.BRUTE_FORCE_LOCKOUT_MINUTES || '15'),
    attemptWindowMinutes: parseInt(process.env.BRUTE_FORCE_WINDOW_MINUTES || '5'),
    progressiveLockout: process.env.BRUTE_FORCE_PROGRESSIVE !== 'false',
    alertOnLockout: process.env.BRUTE_FORCE_ALERT !== 'false'
}

// ==================== DATA STRUCTURES ====================

/**
 * Rate-Limit Entry
 */
interface RateLimitEntry {
    count: number
    resetAt: number
}

/**
 * Login Attempt Entry
 */
interface LoginAttemptEntry {
    attempts: number
    lockedUntil: number | null
    lockCount: number
    lastAttempt: number
}

/**
 * Security Event Types
 */
export enum SecurityEventType {
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    BRUTE_FORCE_DETECTED = 'brute_force_detected',
    SUSPICIOUS_IP = 'suspicious_ip',
    ACCOUNT_LOCKED = 'account_locked',
    INVALID_API_KEY = 'invalid_api_key',
    SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
    XSS_ATTEMPT = 'xss_attempt',
    CSRF_ATTEMPT = 'csrf_attempt',
    UNAUTHORIZED_ACCESS = 'unauthorized_access',
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

/**
 * Security Event
 */
export interface SecurityEvent {
    id: string
    type: SecurityEventType
    severity: 'low' | 'medium' | 'high' | 'critical'
    ip: string
    userId?: string
    endpoint: string
    details: Record<string, any>
    timestamp: Date
    handled: boolean
}

// ==================== THREAT DETECTION SERVICE ====================

/**
 * Threat Detection Service
 */
export class ThreatDetectionService {
    private static instance: ThreatDetectionService
    
    // In-Memory Stores (für Production: Redis verwenden)
    private ipRateLimits = new Map<string, RateLimitEntry>()
    private userRateLimits = new Map<string, RateLimitEntry>()
    private endpointRateLimits = new Map<string, RateLimitEntry>()
    private loginAttempts = new Map<string, LoginAttemptEntry>()
    private blockedIPs = new Set<string>()
    private suspiciousIPs = new Map<string, { score: number; reasons: string[] }>()
    private securityEvents: SecurityEvent[] = []
    
    // Konfiguration
    private config: RateLimitConfig = DEFAULT_CONFIG
    private bruteForceConfig: BruteForceConfig = DEFAULT_BRUTE_FORCE_CONFIG

    private constructor() {
        // Cleanup-Job alle 5 Minuten
        setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }

    public static getInstance(): ThreatDetectionService {
        if (!ThreatDetectionService.instance) {
            ThreatDetectionService.instance = new ThreatDetectionService()
        }
        return ThreatDetectionService.instance
    }

    // ==================== RATE LIMITING ====================

    /**
     * Prüft Rate-Limit für eine Anfrage
     */
    public checkRateLimit(
        ip: string,
        userId: string | null,
        endpoint: string
    ): { allowed: boolean; retryAfter?: number; reason?: string } {
        const now = Date.now()

        // Blocked IP Check
        if (this.blockedIPs.has(ip)) {
            return { allowed: false, reason: 'IP blockiert' }
        }

        // IP Rate-Limit
        const ipKey = `ip:${ip}`
        const ipResult = this.checkLimit(
            this.ipRateLimits, 
            ipKey, 
            this.config.ipRequestsPerMinute, 
            60 * 1000
        )
        if (!ipResult.allowed) {
            this.recordSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, ip, userId, endpoint, {
                limitType: 'ip',
                limit: this.config.ipRequestsPerMinute
            })
            return { allowed: false, retryAfter: ipResult.retryAfter, reason: 'IP Rate-Limit überschritten' }
        }

        // User Rate-Limit (wenn authentifiziert)
        if (userId) {
            const userKey = `user:${userId}`
            const userResult = this.checkLimit(
                this.userRateLimits,
                userKey,
                this.config.userRequestsPerMinute,
                60 * 1000
            )
            if (!userResult.allowed) {
                this.recordSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, ip, userId, endpoint, {
                    limitType: 'user',
                    limit: this.config.userRequestsPerMinute
                })
                return { allowed: false, retryAfter: userResult.retryAfter, reason: 'User Rate-Limit überschritten' }
            }
        }

        // Endpoint-spezifisches Limit
        const endpointConfig = this.getEndpointConfig(endpoint)
        if (endpointConfig) {
            const endpointKey = `endpoint:${ip}:${endpoint}`
            const endpointResult = this.checkLimit(
                this.endpointRateLimits,
                endpointKey,
                endpointConfig.perMinute,
                60 * 1000
            )
            if (!endpointResult.allowed) {
                this.recordSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, ip, userId, endpoint, {
                    limitType: 'endpoint',
                    limit: endpointConfig.perMinute
                })
                return { allowed: false, retryAfter: endpointResult.retryAfter, reason: 'Endpoint Rate-Limit überschritten' }
            }
        }

        return { allowed: true }
    }

    /**
     * Prüft einzelnes Limit
     */
    private checkLimit(
        store: Map<string, RateLimitEntry>,
        key: string,
        limit: number,
        windowMs: number
    ): { allowed: boolean; retryAfter?: number } {
        const now = Date.now()
        const entry = store.get(key)

        if (!entry || now > entry.resetAt) {
            store.set(key, { count: 1, resetAt: now + windowMs })
            return { allowed: true }
        }

        if (entry.count >= limit) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
            return { allowed: false, retryAfter }
        }

        entry.count++
        return { allowed: true }
    }

    /**
     * Gibt Endpoint-Konfiguration zurück
     */
    private getEndpointConfig(endpoint: string): { perMinute: number; perHour: number } | null {
        for (const [pattern, config] of Object.entries(this.config.endpointLimits)) {
            if (endpoint.startsWith(pattern)) {
                return config
            }
        }
        return null
    }

    // ==================== BRUTE-FORCE PROTECTION ====================

    /**
     * Prüft ob ein Login erlaubt ist
     */
    public checkLoginAllowed(identifier: string, ip: string): { 
        allowed: boolean
        attemptsRemaining?: number
        lockedUntil?: Date
        reason?: string 
    } {
        const now = Date.now()
        const key = `login:${identifier}`
        const entry = this.loginAttempts.get(key)

        // IP-basierte Sperrung prüfen
        if (this.blockedIPs.has(ip)) {
            return { allowed: false, reason: 'IP blockiert' }
        }

        if (!entry) {
            return { allowed: true, attemptsRemaining: this.bruteForceConfig.maxLoginAttempts }
        }

        // Lockout prüfen
        if (entry.lockedUntil && now < entry.lockedUntil) {
            return { 
                allowed: false, 
                lockedUntil: new Date(entry.lockedUntil),
                reason: 'Account temporär gesperrt' 
            }
        }

        // Lockout abgelaufen - zurücksetzen
        if (entry.lockedUntil && now >= entry.lockedUntil) {
            entry.attempts = 0
            entry.lockedUntil = null
        }

        const attemptsRemaining = this.bruteForceConfig.maxLoginAttempts - entry.attempts
        return { allowed: true, attemptsRemaining }
    }

    /**
     * Registriert einen Login-Versuch
     */
    public recordLoginAttempt(identifier: string, ip: string, success: boolean): void {
        const now = Date.now()
        const key = `login:${identifier}`
        let entry = this.loginAttempts.get(key)

        if (!entry) {
            entry = { attempts: 0, lockedUntil: null, lockCount: 0, lastAttempt: now }
            this.loginAttempts.set(key, entry)
        }

        if (success) {
            // Erfolgreicher Login - Zähler zurücksetzen
            entry.attempts = 0
            entry.lockedUntil = null
            return
        }

        // Fehlgeschlagener Login
        entry.attempts++
        entry.lastAttempt = now

        // Lockout prüfen
        if (entry.attempts >= this.bruteForceConfig.maxLoginAttempts) {
            entry.lockCount++
            
            // Progressive Lockout-Dauer
            let lockoutMinutes = this.bruteForceConfig.lockoutDurationMinutes
            if (this.bruteForceConfig.progressiveLockout) {
                lockoutMinutes = lockoutMinutes * Math.pow(2, entry.lockCount - 1)
                lockoutMinutes = Math.min(lockoutMinutes, 24 * 60) // Max 24 Stunden
            }

            entry.lockedUntil = now + (lockoutMinutes * 60 * 1000)

            // Security Event aufzeichnen
            this.recordSecurityEvent(SecurityEventType.BRUTE_FORCE_DETECTED, ip, identifier, '/auth/login', {
                attempts: entry.attempts,
                lockoutMinutes,
                lockCount: entry.lockCount
            })

            // IP als verdächtig markieren
            this.markSuspiciousIP(ip, 'Brute-Force Attempt')

            logger.warn(`[ThreatDetection] Brute-Force erkannt: ${identifier} von ${ip}, Lockout: ${lockoutMinutes}min`)
        }
    }

    // ==================== SUSPICIOUS ACTIVITY DETECTION ====================

    /**
     * Markiert eine IP als verdächtig
     */
    public markSuspiciousIP(ip: string, reason: string): void {
        const existing = this.suspiciousIPs.get(ip) || { score: 0, reasons: [] }
        existing.score += 10
        if (!existing.reasons.includes(reason)) {
            existing.reasons.push(reason)
        }
        this.suspiciousIPs.set(ip, existing)

        // Bei hohem Score IP blockieren
        if (existing.score >= 100) {
            this.blockedIPs.add(ip)
            logger.warn(`[ThreatDetection] IP blockiert: ${ip}, Score: ${existing.score}`)
        }
    }

    /**
     * Prüft ob eine IP verdächtig ist
     */
    public isSuspiciousIP(ip: string): { suspicious: boolean; score: number; reasons: string[] } {
        const entry = this.suspiciousIPs.get(ip)
        if (!entry) {
            return { suspicious: false, score: 0, reasons: [] }
        }
        return { suspicious: entry.score >= 30, score: entry.score, reasons: entry.reasons }
    }

    /**
     * Analysiert Request auf verdächtige Muster
     */
    public analyzeRequest(req: Request): { suspicious: boolean; threats: string[] } {
        const threats: string[] = []

        // SQL Injection Patterns
        const sqlInjectionPatterns = [
            /('|"|;|--|\|\||&&|\/\*|\*\/)/i,
            /(union|select|insert|update|delete|drop|truncate|exec)/i,
            /(xp_|sp_|0x[0-9a-f]+)/i
        ]

        // XSS Patterns
        const xssPatterns = [
            /<script[^>]*>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i
        ]

        // Path Traversal
        const pathTraversalPatterns = [
            /\.\.\//,
            /\.\.\\/,
            /%2e%2e%2f/i,
            /%2e%2e\\/i
        ]

        const checkValue = (value: string): void => {
            for (const pattern of sqlInjectionPatterns) {
                if (pattern.test(value)) {
                    threats.push('SQL Injection')
                    break
                }
            }
            for (const pattern of xssPatterns) {
                if (pattern.test(value)) {
                    threats.push('XSS')
                    break
                }
            }
            for (const pattern of pathTraversalPatterns) {
                if (pattern.test(value)) {
                    threats.push('Path Traversal')
                    break
                }
            }
        }

        // Check Query Parameters
        for (const value of Object.values(req.query)) {
            if (typeof value === 'string') {
                checkValue(value)
            }
        }

        // Check Body
        if (req.body && typeof req.body === 'object') {
            const checkObject = (obj: any, depth = 0) => {
                if (depth > 5) return
                for (const value of Object.values(obj)) {
                    if (typeof value === 'string') {
                        checkValue(value)
                    } else if (typeof value === 'object' && value !== null) {
                        checkObject(value, depth + 1)
                    }
                }
            }
            checkObject(req.body)
        }

        // Check URL
        checkValue(req.originalUrl)

        // Record events for threats
        const ip = this.getClientIP(req)
        const userId = (req as any).user?.id
        for (const threat of [...new Set(threats)]) {
            let eventType = SecurityEventType.SUSPICIOUS_ACTIVITY
            if (threat === 'SQL Injection') eventType = SecurityEventType.SQL_INJECTION_ATTEMPT
            if (threat === 'XSS') eventType = SecurityEventType.XSS_ATTEMPT
            
            this.recordSecurityEvent(eventType, ip, userId, req.originalUrl, { threat })
            this.markSuspiciousIP(ip, threat)
        }

        return { suspicious: threats.length > 0, threats: [...new Set(threats)] }
    }

    // ==================== SECURITY EVENTS ====================

    /**
     * Zeichnet ein Security Event auf
     */
    public recordSecurityEvent(
        type: SecurityEventType,
        ip: string,
        userId: string | null | undefined,
        endpoint: string,
        details: Record<string, any>
    ): SecurityEvent {
        const severity = this.getSeverity(type)
        const event: SecurityEvent = {
            id: crypto.randomUUID(),
            type,
            severity,
            ip,
            userId: userId || undefined,
            endpoint,
            details,
            timestamp: new Date(),
            handled: false
        }

        this.securityEvents.push(event)

        // Limit Events im Memory
        if (this.securityEvents.length > 10000) {
            this.securityEvents = this.securityEvents.slice(-5000)
        }

        // Logging
        const logMethod = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info'
        logger[logMethod](`[ThreatDetection] ${type}: ${ip} - ${endpoint}`, details)

        // Bei kritischen Events Alert senden
        if (severity === 'critical' || severity === 'high') {
            this.sendSecurityAlert(event)
        }

        return event
    }

    /**
     * Gibt Severity für Event-Type zurück
     */
    private getSeverity(type: SecurityEventType): 'low' | 'medium' | 'high' | 'critical' {
        switch (type) {
            case SecurityEventType.SQL_INJECTION_ATTEMPT:
            case SecurityEventType.BRUTE_FORCE_DETECTED:
                return 'critical'
            case SecurityEventType.XSS_ATTEMPT:
            case SecurityEventType.CSRF_ATTEMPT:
            case SecurityEventType.ACCOUNT_LOCKED:
                return 'high'
            case SecurityEventType.RATE_LIMIT_EXCEEDED:
            case SecurityEventType.INVALID_API_KEY:
            case SecurityEventType.UNAUTHORIZED_ACCESS:
                return 'medium'
            case SecurityEventType.SUSPICIOUS_IP:
            case SecurityEventType.SUSPICIOUS_ACTIVITY:
            default:
                return 'low'
        }
    }

    /**
     * Sendet Security Alert (E-Mail)
     */
    private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
        // TODO: E-Mail-Integration
        // Für jetzt nur Logging
        logger.warn(`[ThreatDetection] SECURITY ALERT: ${event.type}`, {
            ip: event.ip,
            userId: event.userId,
            endpoint: event.endpoint,
            severity: event.severity,
            details: event.details
        })
    }

    // ==================== IP MANAGEMENT ====================

    /**
     * Blockiert eine IP
     */
    public blockIP(ip: string, reason: string): void {
        this.blockedIPs.add(ip)
        this.recordSecurityEvent(SecurityEventType.SUSPICIOUS_IP, ip, null, 'system', {
            action: 'blocked',
            reason
        })
    }

    /**
     * Entsperrt eine IP
     */
    public unblockIP(ip: string): void {
        this.blockedIPs.delete(ip)
        this.suspiciousIPs.delete(ip)
    }

    /**
     * Gibt blockierte IPs zurück
     */
    public getBlockedIPs(): string[] {
        return [...this.blockedIPs]
    }

    /**
     * Ermittelt Client-IP
     */
    public getClientIP(req: Request): string {
        const forwardedFor = req.headers['x-forwarded-for']
        if (forwardedFor) {
            const ips = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]).split(',')
            return ips[0].trim()
        }
        return req.ip || req.socket.remoteAddress || 'unknown'
    }

    // ==================== STATISTICS & REPORTING ====================

    /**
     * Gibt Security-Statistiken zurück
     */
    public getStatistics(): {
        blockedIPs: number
        suspiciousIPs: number
        activeRateLimits: number
        lockedAccounts: number
        recentEvents: SecurityEvent[]
        eventCounts: Record<SecurityEventType, number>
    } {
        const now = Date.now()
        const recentEvents = this.securityEvents
            .filter(e => e.timestamp.getTime() > now - 24 * 60 * 60 * 1000)
            .slice(-100)

        const eventCounts: Record<string, number> = {}
        for (const event of recentEvents) {
            eventCounts[event.type] = (eventCounts[event.type] || 0) + 1
        }

        const lockedAccounts = [...this.loginAttempts.values()]
            .filter(entry => entry.lockedUntil && entry.lockedUntil > now)
            .length

        return {
            blockedIPs: this.blockedIPs.size,
            suspiciousIPs: this.suspiciousIPs.size,
            activeRateLimits: this.ipRateLimits.size + this.userRateLimits.size,
            lockedAccounts,
            recentEvents,
            eventCounts: eventCounts as Record<SecurityEventType, number>
        }
    }

    /**
     * Gibt alle Security Events zurück (für Admin)
     */
    public getSecurityEvents(options: {
        limit?: number
        type?: SecurityEventType
        severity?: 'low' | 'medium' | 'high' | 'critical'
        since?: Date
    } = {}): SecurityEvent[] {
        let events = this.securityEvents

        if (options.type) {
            events = events.filter(e => e.type === options.type)
        }
        if (options.severity) {
            events = events.filter(e => e.severity === options.severity)
        }
        if (options.since) {
            events = events.filter(e => e.timestamp >= options.since!)
        }

        return events.slice(-(options.limit || 100))
    }

    // ==================== CLEANUP ====================

    /**
     * Cleanup alter Einträge
     */
    private cleanup(): void {
        const now = Date.now()

        // Rate-Limits bereinigen
        for (const [key, entry] of this.ipRateLimits) {
            if (now > entry.resetAt) this.ipRateLimits.delete(key)
        }
        for (const [key, entry] of this.userRateLimits) {
            if (now > entry.resetAt) this.userRateLimits.delete(key)
        }
        for (const [key, entry] of this.endpointRateLimits) {
            if (now > entry.resetAt) this.endpointRateLimits.delete(key)
        }

        // Login-Attempts bereinigen (älter als 24h)
        const dayAgo = now - 24 * 60 * 60 * 1000
        for (const [key, entry] of this.loginAttempts) {
            if (entry.lastAttempt < dayAgo && (!entry.lockedUntil || entry.lockedUntil < now)) {
                this.loginAttempts.delete(key)
            }
        }

        // Security Events älter als 7 Tage entfernen
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000
        this.securityEvents = this.securityEvents.filter(e => e.timestamp.getTime() > weekAgo)

        logger.debug('[ThreatDetection] Cleanup durchgeführt')
    }
}

// ==================== MIDDLEWARE ====================

/**
 * Rate-Limit Middleware
 */
export function rateLimitMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const threatService = ThreatDetectionService.getInstance()
        const ip = threatService.getClientIP(req)
        const userId = (req as any).user?.id || null
        const endpoint = req.path

        const result = threatService.checkRateLimit(ip, userId, endpoint)

        if (!result.allowed) {
            res.setHeader('Retry-After', result.retryAfter || 60)
            return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
                error: result.reason || 'Rate limit exceeded',
                retryAfter: result.retryAfter
            })
        }

        next()
    }
}

/**
 * Threat Analysis Middleware
 */
export function threatAnalysisMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const threatService = ThreatDetectionService.getInstance()
        const analysis = threatService.analyzeRequest(req)

        if (analysis.suspicious) {
            const ip = threatService.getClientIP(req)
            logger.warn(`[ThreatDetection] Suspicious request from ${ip}: ${analysis.threats.join(', ')}`)
            
            // Optional: Request blockieren bei kritischen Threats
            if (analysis.threats.includes('SQL Injection')) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    error: 'Request blocked due to suspicious content'
                })
            }
        }

        next()
    }
}

/**
 * Brute-Force Protection Middleware
 */
export function bruteForceProtectionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const threatService = ThreatDetectionService.getInstance()
        const ip = threatService.getClientIP(req)
        const identifier = req.body?.username || req.body?.email || ip

        const result = threatService.checkLoginAllowed(identifier, ip)

        if (!result.allowed) {
            return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
                error: result.reason,
                lockedUntil: result.lockedUntil
            })
        }

        // Attach für spätere Verwendung
        (req as any).loginIdentifier = identifier
        next()
    }
}

// Singleton-Export
export const threatDetectionService = ThreatDetectionService.getInstance()
