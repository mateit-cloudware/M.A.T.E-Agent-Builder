/**
 * M.A.T.E. Multi-Factor Authentication (MFA) Service
 * 
 * Implementiert S3.2a: MFA Enforcement für Admins
 * 
 * Features:
 * - TOTP-basierte MFA (Google Authenticator, Authy, etc.)
 * - Backup-Codes für Notfall-Zugang
 * - Erzwungene MFA für Administratoren
 * - QR-Code-Generierung für Setup
 */

import * as crypto from 'crypto'
import { DataSource, Repository } from 'typeorm'
import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

// ==================== MFA Entity ====================

@Entity('mate_mfa_settings')
export class MFASetting {
    @PrimaryColumn('uuid')
    id: string = uuidv4()

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string = ''

    @Column({ type: 'boolean', default: false })
    enabled: boolean = false

    @Column({ name: 'secret_key', type: 'varchar', length: 64, nullable: true })
    secretKey?: string  // Verschlüsselt gespeichert

    @Column({ name: 'backup_codes', type: 'simple-json', nullable: true })
    backupCodes?: string[]  // Gehashte Backup-Codes

    @Column({ name: 'used_backup_codes', type: 'simple-json', nullable: true })
    usedBackupCodes?: string[]

    @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
    verifiedAt?: Date

    @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
    lastUsedAt?: Date

    @Column({ name: 'setup_completed', type: 'boolean', default: false })
    setupCompleted: boolean = false

    @Column({ name: 'enforcement_level', type: 'varchar', length: 20, default: 'optional' })
    enforcementLevel: 'required' | 'optional' | 'disabled' = 'optional'

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date = new Date()

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date = new Date()
}

// ==================== MFA Interfaces ====================

export interface MFASetupResult {
    secret: string
    qrCodeUrl: string
    manualEntryKey: string
    backupCodes: string[]
}

export interface MFAVerifyResult {
    success: boolean
    remainingBackupCodes?: number
    usedBackupCode?: boolean
}

// ==================== TOTP Implementation ====================

/**
 * TOTP (Time-based One-Time Password) Generator
 * RFC 6238 compliant
 */
class TOTPGenerator {
    private readonly period: number = 30  // 30 Sekunden
    private readonly digits: number = 6
    private readonly algorithm: string = 'sha1'

    /**
     * Generiert ein sicheres Secret für TOTP
     */
    generateSecret(length: number = 20): string {
        const buffer = crypto.randomBytes(length)
        return this.base32Encode(buffer)
    }

    /**
     * Generiert den aktuellen TOTP-Code
     */
    generate(secret: string, timestamp?: number): string {
        const time = timestamp || Math.floor(Date.now() / 1000)
        const counter = Math.floor(time / this.period)
        
        const secretBuffer = this.base32Decode(secret)
        const counterBuffer = Buffer.alloc(8)
        counterBuffer.writeBigInt64BE(BigInt(counter))
        
        const hmac = crypto.createHmac(this.algorithm, secretBuffer)
        hmac.update(counterBuffer)
        const hash = hmac.digest()
        
        // Dynamic truncation
        const offset = hash[hash.length - 1] & 0x0f
        const binary = 
            ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff)
        
        const otp = binary % Math.pow(10, this.digits)
        return otp.toString().padStart(this.digits, '0')
    }

    /**
     * Verifiziert einen TOTP-Code (mit Zeitfenster für Drift)
     */
    verify(secret: string, token: string, window: number = 1): boolean {
        const time = Math.floor(Date.now() / 1000)
        
        for (let i = -window; i <= window; i++) {
            const timestamp = time + (i * this.period)
            const expectedToken = this.generate(secret, timestamp)
            
            if (this.secureCompare(token, expectedToken)) {
                return true
            }
        }
        
        return false
    }

    /**
     * Timing-sicherer String-Vergleich
     */
    private secureCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false
        }
        
        let result = 0
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i)
        }
        
        return result === 0
    }

    /**
     * Base32-Encoding (RFC 4648)
     */
    private base32Encode(buffer: Buffer): string {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let result = ''
        let bits = 0
        let value = 0
        
        for (const byte of buffer) {
            value = (value << 8) | byte
            bits += 8
            
            while (bits >= 5) {
                result += alphabet[(value >>> (bits - 5)) & 0x1f]
                bits -= 5
            }
        }
        
        if (bits > 0) {
            result += alphabet[(value << (5 - bits)) & 0x1f]
        }
        
        return result
    }

    /**
     * Base32-Decoding
     */
    private base32Decode(encoded: string): Buffer {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        const lookup: Record<string, number> = {}
        for (let i = 0; i < alphabet.length; i++) {
            lookup[alphabet[i]] = i
        }
        
        const cleanedInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '')
        const bytes: number[] = []
        let bits = 0
        let value = 0
        
        for (const char of cleanedInput) {
            value = (value << 5) | lookup[char]
            bits += 5
            
            if (bits >= 8) {
                bytes.push((value >>> (bits - 8)) & 0xff)
                bits -= 8
            }
        }
        
        return Buffer.from(bytes)
    }
}

// ==================== MFA Service ====================

class MFAService {
    private dataSource: DataSource | null = null
    private totp: TOTPGenerator = new TOTPGenerator()
    private issuer: string = 'M.A.T.E.'
    private encryptionKey: Buffer

    constructor() {
        const key = process.env.ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY
        if (key && key.length >= 64) {
            this.encryptionKey = Buffer.from(key.substring(0, 64), 'hex')
        } else {
            this.encryptionKey = crypto.randomBytes(32)
            console.warn('[MFA] WARNUNG: Temporärer Verschlüsselungsschlüssel generiert!')
        }
    }

    public initialize(dataSource: DataSource): void {
        this.dataSource = dataSource
        console.log('[MFA] Service initialisiert')
    }

    // ==================== SETUP ====================

    /**
     * MFA-Setup initiieren
     */
    public async initiateSetup(userId: string, userEmail: string): Promise<MFASetupResult> {
        // Secret generieren
        const secret = this.totp.generateSecret()
        
        // Backup-Codes generieren
        const backupCodes = this.generateBackupCodes(10)
        
        // In DB speichern (unbestätigt)
        await this.saveUnverifiedSetup(userId, secret, backupCodes)
        
        // QR-Code URL generieren
        const qrCodeUrl = this.generateQRCodeUrl(secret, userEmail)
        
        // Manuellen Schlüssel formatieren
        const manualEntryKey = this.formatManualKey(secret)
        
        return {
            secret,
            qrCodeUrl,
            manualEntryKey,
            backupCodes
        }
    }

    /**
     * MFA-Setup abschließen (nach Verifizierung)
     */
    public async completeSetup(userId: string, token: string): Promise<boolean> {
        const setting = await this.getMFASetting(userId)
        if (!setting || !setting.secretKey) {
            return false
        }

        const decryptedSecret = this.decrypt(setting.secretKey)
        if (!this.totp.verify(decryptedSecret, token)) {
            return false
        }

        // Setup als abgeschlossen markieren
        setting.setupCompleted = true
        setting.enabled = true
        setting.verifiedAt = new Date()
        await this.saveMFASetting(setting)

        console.log(`[MFA] Setup für User ${userId} abgeschlossen`)
        return true
    }

    // ==================== VERIFICATION ====================

    /**
     * MFA-Code verifizieren
     */
    public async verify(userId: string, token: string): Promise<MFAVerifyResult> {
        const setting = await this.getMFASetting(userId)
        if (!setting || !setting.enabled || !setting.secretKey) {
            return { success: false }
        }

        // Zuerst TOTP prüfen
        const decryptedSecret = this.decrypt(setting.secretKey)
        if (this.totp.verify(decryptedSecret, token)) {
            setting.lastUsedAt = new Date()
            await this.saveMFASetting(setting)
            
            return { success: true }
        }

        // Dann Backup-Code prüfen
        if (setting.backupCodes && setting.backupCodes.length > 0) {
            const backupResult = await this.verifyBackupCode(setting, token)
            if (backupResult.success) {
                return {
                    success: true,
                    usedBackupCode: true,
                    remainingBackupCodes: setting.backupCodes.length
                }
            }
        }

        return { success: false }
    }

    /**
     * Backup-Code verifizieren
     */
    private async verifyBackupCode(setting: MFASetting, code: string): Promise<{ success: boolean }> {
        if (!setting.backupCodes) {
            return { success: false }
        }

        const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
        const hashedInput = this.hashBackupCode(normalizedCode)

        const codeIndex = setting.backupCodes.findIndex(bc => bc === hashedInput)
        if (codeIndex === -1) {
            return { success: false }
        }

        // Code entfernen (einmalige Nutzung)
        setting.backupCodes.splice(codeIndex, 1)
        setting.usedBackupCodes = setting.usedBackupCodes || []
        setting.usedBackupCodes.push(hashedInput)
        setting.lastUsedAt = new Date()
        
        await this.saveMFASetting(setting)

        console.log(`[MFA] Backup-Code für User ${setting.userId} verwendet`)
        return { success: true }
    }

    // ==================== MANAGEMENT ====================

    /**
     * MFA deaktivieren
     */
    public async disable(userId: string): Promise<boolean> {
        const setting = await this.getMFASetting(userId)
        if (!setting) {
            return false
        }

        setting.enabled = false
        setting.secretKey = undefined
        setting.backupCodes = undefined
        setting.usedBackupCodes = undefined
        setting.setupCompleted = false
        
        await this.saveMFASetting(setting)

        console.log(`[MFA] Deaktiviert für User ${userId}`)
        return true
    }

    /**
     * Neue Backup-Codes generieren
     */
    public async regenerateBackupCodes(userId: string): Promise<string[] | null> {
        const setting = await this.getMFASetting(userId)
        if (!setting || !setting.enabled) {
            return null
        }

        const newCodes = this.generateBackupCodes(10)
        setting.backupCodes = newCodes.map(c => this.hashBackupCode(c))
        setting.usedBackupCodes = []
        
        await this.saveMFASetting(setting)

        console.log(`[MFA] Neue Backup-Codes für User ${userId} generiert`)
        return newCodes
    }

    /**
     * MFA-Status prüfen
     */
    public async getStatus(userId: string): Promise<{
        enabled: boolean
        setupCompleted: boolean
        lastUsed?: Date
        backupCodesRemaining: number
        enforcementLevel: string
    }> {
        const setting = await this.getMFASetting(userId)
        
        if (!setting) {
            return {
                enabled: false,
                setupCompleted: false,
                backupCodesRemaining: 0,
                enforcementLevel: 'optional'
            }
        }

        return {
            enabled: setting.enabled,
            setupCompleted: setting.setupCompleted,
            lastUsed: setting.lastUsedAt,
            backupCodesRemaining: setting.backupCodes?.length || 0,
            enforcementLevel: setting.enforcementLevel
        }
    }

    /**
     * MFA-Enforcement setzen (für Admins)
     */
    public async setEnforcement(
        userId: string, 
        level: 'required' | 'optional' | 'disabled'
    ): Promise<void> {
        let setting = await this.getMFASetting(userId)
        
        if (!setting) {
            setting = new MFASetting()
            setting.userId = userId
        }

        setting.enforcementLevel = level
        await this.saveMFASetting(setting)

        console.log(`[MFA] Enforcement für User ${userId}: ${level}`)
    }

    /**
     * Prüft ob MFA erforderlich ist
     */
    public async isMFARequired(userId: string, isAdmin: boolean): Promise<boolean> {
        const setting = await this.getMFASetting(userId)
        
        // Admins müssen MFA haben
        if (isAdmin) {
            return true
        }
        
        // Benutzer-spezifische Einstellung
        if (setting?.enforcementLevel === 'required') {
            return true
        }
        
        return false
    }

    // ==================== HELPER METHODS ====================

    /**
     * Backup-Codes generieren
     */
    private generateBackupCodes(count: number): string[] {
        const codes: string[] = []
        
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase()
            // Format: XXXX-XXXX
            codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`)
        }
        
        return codes
    }

    /**
     * Backup-Code hashen
     */
    private hashBackupCode(code: string): string {
        return crypto.createHash('sha256').update(code).digest('hex')
    }

    /**
     * QR-Code URL generieren (otpauth://)
     */
    private generateQRCodeUrl(secret: string, userEmail: string): string {
        const encodedIssuer = encodeURIComponent(this.issuer)
        const encodedEmail = encodeURIComponent(userEmail)
        
        return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
    }

    /**
     * Manuellen Schlüssel formatieren (für Copy/Paste)
     */
    private formatManualKey(secret: string): string {
        // In 4er-Gruppen aufteilen
        return secret.match(/.{1,4}/g)?.join(' ') || secret
    }

    /**
     * Secret verschlüsseln
     */
    private encrypt(text: string): string {
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv)
        
        let encrypted = cipher.update(text, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        const authTag = cipher.getAuthTag()
        
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    }

    /**
     * Secret entschlüsseln
     */
    private decrypt(encrypted: string): string {
        const parts = encrypted.split(':')
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format')
        }

        const iv = Buffer.from(parts[0], 'hex')
        const authTag = Buffer.from(parts[1], 'hex')
        const data = parts[2]

        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(data, 'hex', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    }

    // ==================== DATABASE OPERATIONS ====================

    private async getMFASetting(userId: string): Promise<MFASetting | null> {
        if (!this.dataSource) return null
        
        const repo = this.dataSource.getRepository(MFASetting)
        return await repo.findOne({ where: { userId } })
    }

    private async saveMFASetting(setting: MFASetting): Promise<void> {
        if (!this.dataSource) return
        
        const repo = this.dataSource.getRepository(MFASetting)
        await repo.save(setting)
    }

    private async saveUnverifiedSetup(
        userId: string, 
        secret: string, 
        backupCodes: string[]
    ): Promise<void> {
        if (!this.dataSource) {
            console.log('[MFA] Setup gespeichert (in-memory)')
            return
        }

        let setting = await this.getMFASetting(userId)
        
        if (!setting) {
            setting = new MFASetting()
            setting.userId = userId
        }

        setting.secretKey = this.encrypt(secret)
        setting.backupCodes = backupCodes.map(c => this.hashBackupCode(c))
        setting.setupCompleted = false
        setting.enabled = false

        await this.saveMFASetting(setting)
    }
}

// Singleton-Export
export const mfaService = new MFAService()
