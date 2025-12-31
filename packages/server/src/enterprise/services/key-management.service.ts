/**
 * M.A.T.E. Key Management Service
 * 
 * Zentrales Key-Management für Verschlüsselungsschlüssel.
 * 
 * Features:
 * - ENCRYPTION_KEY Validierung und Setup
 * - Sichere Key-Generierung
 * - Key-Rotation Unterstützung
 * - AWS Secrets Manager Integration (optional)
 * - Key-Health-Checks
 * 
 * @module services/key-management
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// Konstanten
const KEY_LENGTH = 32 // 256 bits für AES-256
const MIN_KEY_LENGTH = 32 // Minimum für Sicherheit
const KEY_ROTATION_INTERVAL_DAYS = 90 // Empfohlene Rotation alle 90 Tage

/**
 * Key-Status
 */
export interface KeyStatus {
    configured: boolean
    source: 'env' | 'file' | 'aws' | 'none'
    keyHash: string | null
    keyLength: number
    isSecure: boolean
    lastRotated: Date | null
    rotationDue: boolean
    warnings: string[]
}

/**
 * Key-Generierungs-Optionen
 */
export interface KeyGenerationOptions {
    length?: number
    encoding?: 'hex' | 'base64'
}

/**
 * Key Management Service
 */
export class KeyManagementService {
    private static instance: KeyManagementService
    private keyMetadata: Map<string, { createdAt: Date; rotatedAt: Date | null }> = new Map()

    private constructor() {
        this.initializeKeyMetadata()
    }

    /**
     * Singleton-Instanz
     */
    public static getInstance(): KeyManagementService {
        if (!KeyManagementService.instance) {
            KeyManagementService.instance = new KeyManagementService()
        }
        return KeyManagementService.instance
    }

    /**
     * Initialisiert Key-Metadaten
     */
    private initializeKeyMetadata(): void {
        const key = this.getCurrentKey()
        if (key) {
            const keyHash = this.hashKey(key)
            this.keyMetadata.set(keyHash, {
                createdAt: new Date(),
                rotatedAt: null
            })
        }
    }

    // ==================== KEY RETRIEVAL ====================

    /**
     * Gibt den aktuellen Encryption Key zurück
     * Priorität: ENCRYPTION_KEY > PASSPHRASE > JWT_SECRET > File
     */
    public getCurrentKey(): string | null {
        // 1. Environment Variable
        if (process.env.ENCRYPTION_KEY) {
            return process.env.ENCRYPTION_KEY
        }

        // 2. Fallback: PASSPHRASE
        if (process.env.PASSPHRASE) {
            return process.env.PASSPHRASE
        }

        // 3. Fallback: JWT_SECRET (nicht empfohlen)
        if (process.env.JWT_SECRET) {
            return process.env.JWT_SECRET
        }

        // 4. Fallback: File-basierter Key
        const keyPath = this.getKeyFilePath()
        if (keyPath && fs.existsSync(keyPath)) {
            try {
                return fs.readFileSync(keyPath, 'utf8').trim()
            } catch {
                return null
            }
        }

        return null
    }

    /**
     * Gibt den Key-Source zurück
     */
    public getKeySource(): 'env' | 'file' | 'aws' | 'none' {
        if (process.env.ENCRYPTION_KEY) return 'env'
        if (process.env.PASSPHRASE) return 'env'
        if (process.env.JWT_SECRET) return 'env'
        
        const keyPath = this.getKeyFilePath()
        if (keyPath && fs.existsSync(keyPath)) return 'file'

        return 'none'
    }

    /**
     * Gibt den Pfad zur Key-Datei zurück
     */
    private getKeyFilePath(): string | null {
        if (process.env.SECRETKEY_PATH) {
            return path.join(process.env.SECRETKEY_PATH, 'encryption.key')
        }

        const homeDir = process.env.HOME || process.env.USERPROFILE
        if (homeDir) {
            return path.join(homeDir, '.flowise', 'encryption.key')
        }

        return null
    }

    // ==================== KEY STATUS ====================

    /**
     * Gibt den aktuellen Key-Status zurück
     */
    public getKeyStatus(): KeyStatus {
        const key = this.getCurrentKey()
        const warnings: string[] = []

        if (!key) {
            return {
                configured: false,
                source: 'none',
                keyHash: null,
                keyLength: 0,
                isSecure: false,
                lastRotated: null,
                rotationDue: true,
                warnings: ['Kein Encryption Key konfiguriert!']
            }
        }

        const keyHash = this.hashKey(key)
        const keyLength = key.length
        const source = this.getKeySource()
        const metadata = this.keyMetadata.get(keyHash)

        // Sicherheitschecks
        if (keyLength < MIN_KEY_LENGTH) {
            warnings.push(`Key ist zu kurz (${keyLength} < ${MIN_KEY_LENGTH} Zeichen)`)
        }

        if (source === 'env' && process.env.JWT_SECRET === key && !process.env.ENCRYPTION_KEY) {
            warnings.push('JWT_SECRET als Encryption Key ist nicht empfohlen. Bitte ENCRYPTION_KEY setzen.')
        }

        if (this.isWeakKey(key)) {
            warnings.push('Key enthält schwache Muster (z.B. aufeinanderfolgende Zeichen)')
        }

        // Rotation Check
        const rotationDue = this.isRotationDue(metadata?.rotatedAt || metadata?.createdAt)

        if (rotationDue) {
            warnings.push(`Key-Rotation empfohlen (alle ${KEY_ROTATION_INTERVAL_DAYS} Tage)`)
        }

        return {
            configured: true,
            source,
            keyHash: keyHash.substring(0, 16), // Nur erste 16 Zeichen
            keyLength,
            isSecure: warnings.length === 0,
            lastRotated: metadata?.rotatedAt || null,
            rotationDue,
            warnings
        }
    }

    /**
     * Prüft ob ein Key schwach ist
     */
    private isWeakKey(key: string): boolean {
        // Check für aufeinanderfolgende Zeichen
        if (/(.)\1{4,}/.test(key)) return true

        // Check für einfache Sequenzen
        if (/123456|abcdef|qwerty/i.test(key)) return true

        // Check für nur alphanumerische Zeichen (ohne Sonderzeichen)
        if (/^[a-zA-Z0-9]+$/.test(key) && key.length < 48) return true

        return false
    }

    /**
     * Prüft ob eine Rotation fällig ist
     */
    private isRotationDue(lastDate: Date | null | undefined): boolean {
        if (!lastDate) return false
        
        const daysSinceLastRotation = Math.floor(
            (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        return daysSinceLastRotation >= KEY_ROTATION_INTERVAL_DAYS
    }

    // ==================== KEY GENERATION ====================

    /**
     * Generiert einen neuen sicheren Encryption Key
     */
    public generateKey(options: KeyGenerationOptions = {}): string {
        const length = options.length || KEY_LENGTH
        const encoding = options.encoding || 'hex'
        
        const bytes = crypto.randomBytes(length)
        
        if (encoding === 'base64') {
            return bytes.toString('base64')
        }
        
        return bytes.toString('hex')
    }

    /**
     * Generiert einen Key mit dem OpenSSL-kompatiblen Befehl
     * (openssl rand -hex 32)
     */
    public generateOpenSSLKey(): string {
        return crypto.randomBytes(32).toString('hex')
    }

    /**
     * Berechnet einen sicheren Hash eines Keys
     */
    public hashKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex')
    }

    // ==================== KEY VALIDATION ====================

    /**
     * Validiert einen Encryption Key
     */
    public validateKey(key: string): { valid: boolean; errors: string[] } {
        const errors: string[] = []

        if (!key) {
            errors.push('Key darf nicht leer sein')
            return { valid: false, errors }
        }

        if (key.length < MIN_KEY_LENGTH) {
            errors.push(`Key muss mindestens ${MIN_KEY_LENGTH} Zeichen lang sein`)
        }

        if (this.isWeakKey(key)) {
            errors.push('Key enthält unsichere Muster')
        }

        return {
            valid: errors.length === 0,
            errors
        }
    }

    /**
     * Test-Verschlüsselung um Key-Funktionalität zu prüfen
     */
    public async testEncryption(): Promise<{ success: boolean; error?: string }> {
        const key = this.getCurrentKey()
        if (!key) {
            return { success: false, error: 'Kein Key konfiguriert' }
        }

        try {
            const testData = 'M.A.T.E. Encryption Test'
            const keyBuffer = crypto.createHash('sha256').update(key).digest()
            const iv = crypto.randomBytes(16)

            const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
            let encrypted = cipher.update(testData, 'utf8', 'hex')
            encrypted += cipher.final('hex')
            const authTag = cipher.getAuthTag()

            const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
            decipher.setAuthTag(authTag)
            let decrypted = decipher.update(encrypted, 'hex', 'utf8')
            decrypted += decipher.final('utf8')

            if (decrypted !== testData) {
                return { success: false, error: 'Entschlüsselung fehlgeschlagen' }
            }

            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }

    // ==================== KEY FILE MANAGEMENT ====================

    /**
     * Erstellt eine Key-Datei (für lokale Entwicklung)
     */
    public async createKeyFile(key?: string): Promise<string> {
        const keyPath = this.getKeyFilePath()
        if (!keyPath) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Kein Key-Pfad konfiguriert'
            )
        }

        const keyToWrite = key || this.generateKey()
        
        // Verzeichnis erstellen falls nicht vorhanden
        const dir = path.dirname(keyPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        // Key schreiben mit restriktiven Berechtigungen
        fs.writeFileSync(keyPath, keyToWrite, { mode: 0o600 })

        return keyPath
    }

    /**
     * Löscht die Key-Datei
     */
    public deleteKeyFile(): boolean {
        const keyPath = this.getKeyFilePath()
        if (keyPath && fs.existsSync(keyPath)) {
            fs.unlinkSync(keyPath)
            return true
        }
        return false
    }

    // ==================== KEY ROTATION ====================

    /**
     * Bereitet eine Key-Rotation vor
     */
    public prepareKeyRotation(): {
        newKey: string
        instructions: string[]
    } {
        const newKey = this.generateKey()
        
        return {
            newKey,
            instructions: [
                '1. Stoppe alle Server-Instanzen',
                '2. Erstelle ein Datenbank-Backup',
                '3. Setze den neuen ENCRYPTION_KEY in Railway',
                `   Neuer Key: ${newKey}`,
                '4. Führe die Daten-Migration durch (re-encrypt)',
                '5. Starte die Server-Instanzen neu',
                '6. Verifiziere die Verschlüsselung'
            ]
        }
    }

    /**
     * Markiert den aktuellen Key als rotiert
     */
    public markKeyAsRotated(): void {
        const key = this.getCurrentKey()
        if (key) {
            const keyHash = this.hashKey(key)
            const metadata = this.keyMetadata.get(keyHash)
            if (metadata) {
                metadata.rotatedAt = new Date()
            } else {
                this.keyMetadata.set(keyHash, {
                    createdAt: new Date(),
                    rotatedAt: new Date()
                })
            }
        }
    }

    // ==================== SETUP & INITIALIZATION ====================

    /**
     * Prüft und initialisiert den Encryption Key beim App-Start
     */
    public async ensureEncryptionKey(): Promise<void> {
        const status = this.getKeyStatus()

        if (!status.configured) {
            // In Entwicklung: Auto-Generierung
            if (process.env.NODE_ENV === 'development') {
                console.log('[KeyManagement] Kein Encryption Key gefunden. Generiere neuen Key...')
                const keyPath = await this.createKeyFile()
                console.log(`[KeyManagement] Key wurde erstellt: ${keyPath}`)
                return
            }

            // In Produktion: Fehler werfen
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'ENCRYPTION_KEY nicht konfiguriert. Bitte in Railway Secrets setzen.'
            )
        }

        // Warnungen ausgeben
        if (status.warnings.length > 0) {
            console.warn('[KeyManagement] Warnungen:')
            status.warnings.forEach(w => console.warn(`  - ${w}`))
        }

        // Test durchführen
        const testResult = await this.testEncryption()
        if (!testResult.success) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Encryption Key Test fehlgeschlagen: ${testResult.error}`
            )
        }

        console.log(`[KeyManagement] ✓ Encryption Key konfiguriert (Source: ${status.source})`)
    }
}

// Singleton-Export
export const keyManagementService = KeyManagementService.getInstance()

// Convenience-Funktionen
export const getCurrentKey = () => keyManagementService.getCurrentKey()
export const getKeyStatus = () => keyManagementService.getKeyStatus()
export const generateKey = (options?: KeyGenerationOptions) => keyManagementService.generateKey(options)
export const validateKey = (key: string) => keyManagementService.validateKey(key)
export const testEncryption = () => keyManagementService.testEncryption()
export const ensureEncryptionKey = () => keyManagementService.ensureEncryptionKey()
