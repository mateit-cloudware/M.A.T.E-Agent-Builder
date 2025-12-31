/**
 * M.A.T.E. Session Management Service (S3.2b)
 * 
 * Sichere Sitzungsverwaltung gemäß SOC 2 Anforderungen:
 * - Session-Timeout nach Inaktivität
 * - Concurrent Session Limits
 * - Sichere Token-Rotation
 * - Session-Revocation
 * - Session-Audit-Trail
 */

import * as crypto from 'crypto'
import { DataSource } from 'typeorm'
import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

// ==================== Session Entity ====================

@Entity('mate_user_sessions')
export class UserSession {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId: string = ''

    @Column({ name: 'token_hash', type: 'varchar', length: 64 })
    @Index()
    tokenHash: string = ''

    @Column({ name: 'refresh_token_hash', type: 'varchar', length: 64, nullable: true })
    refreshTokenHash?: string

    @Column({ name: 'device_id', type: 'varchar', length: 64, nullable: true })
    deviceId?: string

    @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
    deviceName?: string

    @Column({ name: 'device_type', type: 'varchar', length: 50, nullable: true })
    deviceType?: string  // 'desktop', 'mobile', 'tablet', 'api'

    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress?: string

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string

    @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
    location?: string  // Geolocation (Stadt, Land)

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean = true

    @Column({ name: 'mfa_verified', type: 'boolean', default: false })
    mfaVerified: boolean = false

    @Column({ name: 'last_activity', type: 'datetime' })
    lastActivity: Date = new Date()

    @Column({ name: 'expires_at', type: 'datetime' })
    expiresAt: Date = new Date()

    @Column({ name: 'absolute_expiry', type: 'datetime' })
    absoluteExpiry: Date = new Date()  // Max Lebensdauer unabhängig von Aktivität

    @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
    revokedAt?: Date

    @Column({ name: 'revoked_reason', type: 'varchar', length: 255, nullable: true })
    revokedReason?: string

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()
}

// ==================== Interfaces ====================

export interface SessionConfig {
    idleTimeoutMinutes: number          // Timeout nach Inaktivität (Standard: 30)
    absoluteTimeoutHours: number         // Max. Session-Dauer (Standard: 24)
    maxConcurrentSessions: number        // Max. gleichzeitige Sessions (Standard: 5)
    refreshTokenExpiryDays: number       // Refresh-Token-Lebensdauer (Standard: 7)
    requireMFAForSensitive: boolean      // MFA für sensible Aktionen
    enforceDeviceBinding: boolean        // Session an Gerät binden
    detectSuspiciousActivity: boolean    // Erkennung verdächtiger Aktivitäten
}

export interface SessionInfo {
    id: string
    deviceName?: string
    deviceType?: string
    ipAddress?: string
    location?: string
    lastActivity: Date
    createdAt: Date
    isCurrent: boolean
    mfaVerified: boolean
}

export interface CreateSessionResult {
    sessionId: string
    accessToken: string
    refreshToken: string
    expiresAt: Date
}

export interface SessionValidationResult {
    valid: boolean
    session?: UserSession
    reason?: 'expired' | 'revoked' | 'inactive' | 'device_mismatch' | 'not_found'
}

// ==================== Session Service ====================

class SessionService {
    private dataSource: DataSource | null = null
    
    private config: SessionConfig = {
        idleTimeoutMinutes: 30,
        absoluteTimeoutHours: 24,
        maxConcurrentSessions: 5,
        refreshTokenExpiryDays: 7,
        requireMFAForSensitive: true,
        enforceDeviceBinding: false,
        detectSuspiciousActivity: true
    }

    // In-Memory Storage (für Development)
    private sessions: Map<string, UserSession> = new Map()
    private tokenToSession: Map<string, string> = new Map() // tokenHash → sessionId

    // ==================== INITIALIZATION ====================

    public initialize(dataSource: DataSource): void {
        this.dataSource = dataSource
        
        // Cleanup-Job starten
        this.startCleanupJob()
        
        console.log('[Session] Service initialisiert')
    }

    public updateConfig(config: Partial<SessionConfig>): void {
        this.config = { ...this.config, ...config }
        console.log('[Session] Konfiguration aktualisiert:', this.config)
    }

    // ==================== SESSION CREATION ====================

    /**
     * Neue Session erstellen
     */
    public async createSession(
        userId: string,
        options: {
            deviceId?: string
            deviceName?: string
            deviceType?: string
            ipAddress?: string
            userAgent?: string
            mfaVerified?: boolean
        } = {}
    ): Promise<CreateSessionResult> {
        // Concurrent Sessions prüfen und ggf. älteste beenden
        await this.enforceSessionLimit(userId)

        // Tokens generieren
        const accessToken = this.generateToken()
        const refreshToken = this.generateToken()

        // Expiry berechnen
        const now = new Date()
        const idleExpiry = new Date(now.getTime() + this.config.idleTimeoutMinutes * 60 * 1000)
        const absoluteExpiry = new Date(now.getTime() + this.config.absoluteTimeoutHours * 60 * 60 * 1000)

        // Session erstellen
        const session = new UserSession()
        session.id = uuidv4()
        session.userId = userId
        session.tokenHash = this.hashToken(accessToken)
        session.refreshTokenHash = this.hashToken(refreshToken)
        session.deviceId = options.deviceId || this.generateDeviceId(options.userAgent)
        session.deviceName = options.deviceName || this.parseDeviceName(options.userAgent)
        session.deviceType = options.deviceType || this.parseDeviceType(options.userAgent)
        session.ipAddress = options.ipAddress
        session.userAgent = options.userAgent
        session.mfaVerified = options.mfaVerified || false
        session.lastActivity = now
        session.expiresAt = idleExpiry
        session.absoluteExpiry = absoluteExpiry

        // Speichern
        await this.saveSession(session)
        this.tokenToSession.set(session.tokenHash, session.id)

        console.log(`[Session] Neue Session für User ${userId}: ${session.id}`)

        return {
            sessionId: session.id,
            accessToken,
            refreshToken,
            expiresAt: idleExpiry
        }
    }

    // ==================== SESSION VALIDATION ====================

    /**
     * Session validieren
     */
    public async validateSession(
        accessToken: string,
        options: {
            ipAddress?: string
            userAgent?: string
            updateActivity?: boolean
        } = {}
    ): Promise<SessionValidationResult> {
        const tokenHash = this.hashToken(accessToken)
        const sessionId = this.tokenToSession.get(tokenHash)
        
        if (!sessionId) {
            return { valid: false, reason: 'not_found' }
        }

        const session = await this.getSession(sessionId)
        if (!session) {
            return { valid: false, reason: 'not_found' }
        }

        const now = new Date()

        // Revoked?
        if (session.revokedAt) {
            return { valid: false, reason: 'revoked', session }
        }

        // Inactive?
        if (!session.isActive) {
            return { valid: false, reason: 'inactive', session }
        }

        // Idle Timeout?
        if (session.expiresAt < now) {
            return { valid: false, reason: 'expired', session }
        }

        // Absolute Timeout?
        if (session.absoluteExpiry < now) {
            session.isActive = false
            session.revokedReason = 'absolute_timeout'
            await this.saveSession(session)
            return { valid: false, reason: 'expired', session }
        }

        // Device Binding prüfen
        if (this.config.enforceDeviceBinding && options.userAgent) {
            const currentDeviceId = this.generateDeviceId(options.userAgent)
            if (session.deviceId !== currentDeviceId) {
                console.warn(`[Session] Device mismatch für ${session.id}`)
                return { valid: false, reason: 'device_mismatch', session }
            }
        }

        // Suspicious Activity Detection
        if (this.config.detectSuspiciousActivity) {
            await this.checkSuspiciousActivity(session, options.ipAddress)
        }

        // Aktivität aktualisieren
        if (options.updateActivity !== false) {
            session.lastActivity = now
            session.expiresAt = new Date(now.getTime() + this.config.idleTimeoutMinutes * 60 * 1000)
            if (options.ipAddress) session.ipAddress = options.ipAddress
            await this.saveSession(session)
        }

        return { valid: true, session }
    }

    // ==================== TOKEN REFRESH ====================

    /**
     * Access Token erneuern
     */
    public async refreshSession(
        refreshToken: string,
        options: {
            ipAddress?: string
            userAgent?: string
        } = {}
    ): Promise<{ accessToken: string; expiresAt: Date } | null> {
        const refreshHash = this.hashToken(refreshToken)

        // Session mit Refresh-Token finden
        const session = await this.findSessionByRefreshToken(refreshHash)
        if (!session) {
            return null
        }

        // Session validieren (ohne Aktivitätsupdate)
        const validation = await this.validateSession(
            '', // Kein Access-Token
            { ...options, updateActivity: false }
        )

        // Wir müssen die Session direkt prüfen da wir kein accessToken haben
        const now = new Date()
        if (session.revokedAt || !session.isActive || session.absoluteExpiry < now) {
            return null
        }

        // Neuen Access-Token generieren
        const newAccessToken = this.generateToken()
        const newExpiry = new Date(now.getTime() + this.config.idleTimeoutMinutes * 60 * 1000)

        // Token-Hash aktualisieren
        const oldTokenHash = session.tokenHash
        session.tokenHash = this.hashToken(newAccessToken)
        session.lastActivity = now
        session.expiresAt = newExpiry
        
        await this.saveSession(session)

        // Mapping aktualisieren
        this.tokenToSession.delete(oldTokenHash)
        this.tokenToSession.set(session.tokenHash, session.id)

        console.log(`[Session] Token refreshed für Session ${session.id}`)

        return {
            accessToken: newAccessToken,
            expiresAt: newExpiry
        }
    }

    // ==================== SESSION REVOCATION ====================

    /**
     * Session beenden
     */
    public async revokeSession(
        sessionId: string,
        reason: string = 'user_logout'
    ): Promise<boolean> {
        const session = await this.getSession(sessionId)
        if (!session) return false

        session.isActive = false
        session.revokedAt = new Date()
        session.revokedReason = reason
        
        await this.saveSession(session)
        this.tokenToSession.delete(session.tokenHash)

        console.log(`[Session] Session ${sessionId} beendet: ${reason}`)
        return true
    }

    /**
     * Alle Sessions eines Users beenden
     */
    public async revokeAllUserSessions(
        userId: string,
        reason: string = 'logout_all',
        exceptSessionId?: string
    ): Promise<number> {
        const sessions = await this.getUserSessions(userId)
        let count = 0

        for (const session of sessions) {
            if (session.isActive && session.id !== exceptSessionId) {
                await this.revokeSession(session.id, reason)
                count++
            }
        }

        console.log(`[Session] ${count} Sessions für User ${userId} beendet`)
        return count
    }

    /**
     * Session nach IP beenden (Sicherheit)
     */
    public async revokeSessionsByIP(
        ipAddress: string,
        reason: string = 'security_ip_block'
    ): Promise<number> {
        let count = 0

        for (const session of this.sessions.values()) {
            if (session.isActive && session.ipAddress === ipAddress) {
                await this.revokeSession(session.id, reason)
                count++
            }
        }

        return count
    }

    // ==================== SESSION QUERIES ====================

    /**
     * Aktive Sessions eines Users
     */
    public async getActiveUserSessions(
        userId: string,
        currentSessionId?: string
    ): Promise<SessionInfo[]> {
        const sessions = await this.getUserSessions(userId)
        const now = new Date()

        return sessions
            .filter(s => s.isActive && s.expiresAt > now)
            .map(s => ({
                id: s.id,
                deviceName: s.deviceName,
                deviceType: s.deviceType,
                ipAddress: s.ipAddress,
                location: s.location,
                lastActivity: s.lastActivity,
                createdAt: s.createdAt,
                isCurrent: s.id === currentSessionId,
                mfaVerified: s.mfaVerified
            }))
    }

    /**
     * Session-Statistiken
     */
    public async getSessionStats(): Promise<{
        totalActive: number
        byDeviceType: Record<string, number>
        averageSessionDuration: number
    }> {
        let totalActive = 0
        const byDeviceType: Record<string, number> = {}
        let totalDuration = 0
        let sessionCount = 0

        for (const session of this.sessions.values()) {
            if (session.isActive) {
                totalActive++
                const type = session.deviceType || 'unknown'
                byDeviceType[type] = (byDeviceType[type] || 0) + 1
            }

            // Duration berechnen
            const duration = (session.lastActivity.getTime() - session.createdAt.getTime()) / 1000 / 60
            totalDuration += duration
            sessionCount++
        }

        return {
            totalActive,
            byDeviceType,
            averageSessionDuration: sessionCount > 0 ? totalDuration / sessionCount : 0
        }
    }

    // ==================== MFA VERIFICATION ====================

    /**
     * MFA-Verifizierung für Session markieren
     */
    public async markMFAVerified(sessionId: string): Promise<boolean> {
        const session = await this.getSession(sessionId)
        if (!session) return false

        session.mfaVerified = true
        await this.saveSession(session)

        console.log(`[Session] MFA verifiziert für Session ${sessionId}`)
        return true
    }

    /**
     * Prüfen ob MFA für Aktion erforderlich
     */
    public async requiresMFA(sessionId: string): Promise<boolean> {
        if (!this.config.requireMFAForSensitive) return false

        const session = await this.getSession(sessionId)
        return session ? !session.mfaVerified : true
    }

    // ==================== HELPER METHODS ====================

    /**
     * Token generieren
     */
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex')
    }

    /**
     * Token hashen
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex')
    }

    /**
     * Device-ID aus User-Agent generieren
     */
    private generateDeviceId(userAgent?: string): string {
        if (!userAgent) return crypto.randomBytes(16).toString('hex')
        return crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 32)
    }

    /**
     * Gerätename aus User-Agent parsen
     */
    private parseDeviceName(userAgent?: string): string {
        if (!userAgent) return 'Unbekanntes Gerät'

        // Einfache Browser-Erkennung
        if (userAgent.includes('Chrome')) return 'Chrome Browser'
        if (userAgent.includes('Firefox')) return 'Firefox Browser'
        if (userAgent.includes('Safari')) return 'Safari Browser'
        if (userAgent.includes('Edge')) return 'Edge Browser'
        
        return 'Web Browser'
    }

    /**
     * Gerätetyp aus User-Agent parsen
     */
    private parseDeviceType(userAgent?: string): string {
        if (!userAgent) return 'unknown'

        const ua = userAgent.toLowerCase()
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return 'mobile'
        }
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return 'tablet'
        }
        return 'desktop'
    }

    /**
     * Session-Limit durchsetzen
     */
    private async enforceSessionLimit(userId: string): Promise<void> {
        const sessions = await this.getUserSessions(userId)
        const activeSessions = sessions.filter(s => s.isActive)

        if (activeSessions.length >= this.config.maxConcurrentSessions) {
            // Älteste Session beenden
            const oldest = activeSessions.sort((a, b) => 
                a.lastActivity.getTime() - b.lastActivity.getTime()
            )[0]
            
            await this.revokeSession(oldest.id, 'session_limit_exceeded')
            console.log(`[Session] Älteste Session ${oldest.id} wegen Limit beendet`)
        }
    }

    /**
     * Verdächtige Aktivität prüfen
     */
    private async checkSuspiciousActivity(
        session: UserSession,
        newIpAddress?: string
    ): Promise<void> {
        if (!newIpAddress || !session.ipAddress) return

        // IP-Wechsel erkennen
        if (session.ipAddress !== newIpAddress) {
            console.warn(`[Session] IP-Wechsel erkannt für Session ${session.id}: ` +
                `${session.ipAddress} → ${newIpAddress}`)
            
            // Optional: Session beenden bei verdächtigem Wechsel
            // await this.revokeSession(session.id, 'suspicious_ip_change')
        }
    }

    /**
     * Cleanup-Job starten
     */
    private startCleanupJob(): void {
        // Alle 5 Minuten abgelaufene Sessions bereinigen
        setInterval(async () => {
            const now = new Date()
            let cleaned = 0

            for (const session of this.sessions.values()) {
                if (session.isActive && session.absoluteExpiry < now) {
                    session.isActive = false
                    session.revokedReason = 'cleanup_expired'
                    await this.saveSession(session)
                    this.tokenToSession.delete(session.tokenHash)
                    cleaned++
                }
            }

            if (cleaned > 0) {
                console.log(`[Session] Cleanup: ${cleaned} abgelaufene Sessions bereinigt`)
            }
        }, 5 * 60 * 1000) // 5 Minuten

        console.log('[Session] Cleanup-Job gestartet')
    }

    // ==================== DATABASE OPERATIONS ====================

    private async getSession(sessionId: string): Promise<UserSession | null> {
        // In-Memory
        return this.sessions.get(sessionId) || null
    }

    private async saveSession(session: UserSession): Promise<void> {
        // In-Memory
        this.sessions.set(session.id, session)

        // DB wenn verfügbar
        if (this.dataSource) {
            try {
                const repo = this.dataSource.getRepository(UserSession)
                await repo.save(session)
            } catch (error) {
                console.error('[Session] DB-Speicherfehler:', error)
            }
        }
    }

    private async getUserSessions(userId: string): Promise<UserSession[]> {
        // In-Memory
        const sessions: UserSession[] = []
        for (const session of this.sessions.values()) {
            if (session.userId === userId) {
                sessions.push(session)
            }
        }
        return sessions
    }

    private async findSessionByRefreshToken(refreshHash: string): Promise<UserSession | null> {
        for (const session of this.sessions.values()) {
            if (session.refreshTokenHash === refreshHash) {
                return session
            }
        }
        return null
    }
}

// Singleton-Export
export const sessionService = new SessionService()
