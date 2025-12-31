/**
 * M.A.T.E. Encryption Service
 * 
 * Zentraler Service für alle Verschlüsselungsoperationen.
 * Verwendet AES-256-GCM für maximale Sicherheit.
 * 
 * Features:
 * - AES-256-GCM Verschlüsselung (authentifiziert)
 * - Automatische Key-Derivation
 * - Key-Rotation Support
 * - Migration von Legacy-Verschlüsselung (AES-CBC)
 * - Sichere Zufallszahlengenerierung
 * 
 * @module services/encryption
 */

import crypto from 'crypto'
import { AES, enc } from 'crypto-js'
import { getEncryptionKey } from '../../utils'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// Konstanten für AES-256-GCM
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32      // 256 bits
const IV_LENGTH = 16       // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32     // Für Key-Derivation
const ITERATIONS = 100000  // PBKDF2 Iterationen

// Präfix für verschlüsselte Daten (zur Erkennung der Version)
const ENCRYPTION_VERSION_V2 = 'v2:'  // AES-256-GCM
const ENCRYPTION_VERSION_V1 = ''     // Legacy AES-CBC (kein Präfix)

/**
 * Ergebnis einer Verschlüsselung
 */
export interface EncryptionResult {
    encrypted: string
    iv: string
    authTag: string
    version: 'v1' | 'v2'
}

/**
 * Key-Rotation Event
 */
export interface KeyRotationEvent {
    oldKeyHash: string
    newKeyHash: string
    rotatedAt: Date
    itemsReencrypted: number
}

/**
 * Encryption Service Klasse
 */
export class EncryptionService {
    private static instance: EncryptionService
    private cachedKey: Buffer | null = null
    private keyRotationHistory: KeyRotationEvent[] = []

    private constructor() {}

    /**
     * Singleton-Instanz abrufen
     */
    public static getInstance(): EncryptionService {
        if (!EncryptionService.instance) {
            EncryptionService.instance = new EncryptionService()
        }
        return EncryptionService.instance
    }

    // ==================== KEY MANAGEMENT ====================

    /**
     * Master-Key aus Umgebungsvariable abrufen
     * Priorität: ENCRYPTION_KEY > PASSPHRASE > JWT_SECRET
     */
    private async getMasterKey(): Promise<Buffer> {
        if (this.cachedKey) {
            return this.cachedKey
        }

        const keySource = process.env.ENCRYPTION_KEY || 
                          process.env.PASSPHRASE || 
                          process.env.JWT_SECRET

        if (!keySource) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Kein Verschlüsselungs-Key konfiguriert. Bitte ENCRYPTION_KEY setzen.'
            )
        }

        // Key auf 32 Bytes normalisieren via SHA-256
        this.cachedKey = crypto.createHash('sha256').update(keySource).digest()
        return this.cachedKey
    }

    /**
     * Key-Derivation mit PBKDF2 für zusätzliche Sicherheit
     */
    private async deriveKey(salt: Buffer): Promise<Buffer> {
        const masterKey = await this.getMasterKey()
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha512', (err, derivedKey) => {
                if (err) reject(err)
                else resolve(derivedKey)
            })
        })
    }

    /**
     * Generiert einen neuen Encryption Key
     */
    public generateKey(): string {
        return crypto.randomBytes(KEY_LENGTH).toString('base64')
    }

    /**
     * Berechnet einen sicheren Hash eines Keys (für Logging/Vergleich)
     */
    public hashKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16)
    }

    /**
     * Invalidiert den gecachten Key (für Key-Rotation)
     */
    public invalidateKeyCache(): void {
        this.cachedKey = null
    }

    // ==================== ENCRYPTION (V2 - AES-256-GCM) ====================

    /**
     * Verschlüsselt einen String mit AES-256-GCM
     * 
     * @param plaintext - Zu verschlüsselnder Text
     * @param usePbkdf - Ob PBKDF2 für Key-Derivation verwendet werden soll
     * @returns Verschlüsselter String im Format: v2:salt:iv:authTag:ciphertext
     */
    public async encrypt(plaintext: string, usePbkdf: boolean = false): Promise<string> {
        if (!plaintext) return ''

        try {
            const salt = crypto.randomBytes(SALT_LENGTH)
            const iv = crypto.randomBytes(IV_LENGTH)
            
            let key: Buffer
            if (usePbkdf) {
                key = await this.deriveKey(salt)
            } else {
                key = await this.getMasterKey()
            }

            const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
            
            let encrypted = cipher.update(plaintext, 'utf8', 'hex')
            encrypted += cipher.final('hex')
            
            const authTag = cipher.getAuthTag()

            // Format: v2:salt:iv:authTag:ciphertext
            if (usePbkdf) {
                return `${ENCRYPTION_VERSION_V2}${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
            }
            
            // Ohne PBKDF: v2:iv:authTag:ciphertext
            return `${ENCRYPTION_VERSION_V2}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
        } catch (error: any) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Verschlüsselungsfehler: ${error.message}`
            )
        }
    }

    /**
     * Entschlüsselt einen String
     * Unterstützt automatisch V1 (Legacy AES-CBC) und V2 (AES-256-GCM)
     * 
     * @param encryptedData - Verschlüsselter String
     * @param usePbkdf - Ob PBKDF2 für V2 verwendet wurde
     * @returns Entschlüsselter Klartext
     */
    public async decrypt(encryptedData: string, usePbkdf: boolean = false): Promise<string> {
        if (!encryptedData) return ''

        try {
            // V2 Entschlüsselung (AES-256-GCM)
            if (encryptedData.startsWith(ENCRYPTION_VERSION_V2)) {
                return await this.decryptV2(encryptedData.substring(ENCRYPTION_VERSION_V2.length), usePbkdf)
            }

            // V1 Legacy Entschlüsselung (AES-CBC via crypto-js)
            return await this.decryptV1(encryptedData)
        } catch (error: any) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Entschlüsselungsfehler: ${error.message}`
            )
        }
    }

    /**
     * V2 Entschlüsselung (AES-256-GCM)
     */
    private async decryptV2(encryptedData: string, usePbkdf: boolean): Promise<string> {
        const parts = encryptedData.split(':')
        
        let salt: Buffer | undefined
        let iv: Buffer
        let authTag: Buffer
        let ciphertext: string

        if (usePbkdf && parts.length === 4) {
            // Format: salt:iv:authTag:ciphertext
            salt = Buffer.from(parts[0], 'hex')
            iv = Buffer.from(parts[1], 'hex')
            authTag = Buffer.from(parts[2], 'hex')
            ciphertext = parts[3]
        } else if (parts.length === 3) {
            // Format: iv:authTag:ciphertext
            iv = Buffer.from(parts[0], 'hex')
            authTag = Buffer.from(parts[1], 'hex')
            ciphertext = parts[2]
        } else {
            throw new Error('Ungültiges V2-Verschlüsselungsformat')
        }

        let key: Buffer
        if (usePbkdf && salt) {
            key = await this.deriveKey(salt)
        } else {
            key = await this.getMasterKey()
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    }

    /**
     * V1 Legacy Entschlüsselung (AES-CBC via crypto-js)
     * Für Abwärtskompatibilität mit bestehenden verschlüsselten Daten
     */
    private async decryptV1(encryptedData: string): Promise<string> {
        const encryptionKey = await getEncryptionKey()
        const decrypted = AES.decrypt(encryptedData, encryptionKey)
        return decrypted.toString(enc.Utf8)
    }

    // ==================== SPECIALIZED ENCRYPTION ====================

    /**
     * Verschlüsselt Credential-Daten (JSON-Objekt)
     */
    public async encryptCredentials(credentials: Record<string, any>): Promise<string> {
        const jsonString = JSON.stringify(credentials)
        return this.encrypt(jsonString)
    }

    /**
     * Entschlüsselt Credential-Daten
     */
    public async decryptCredentials(encryptedData: string): Promise<Record<string, any>> {
        const jsonString = await this.decrypt(encryptedData)
        if (!jsonString) return {}
        try {
            return JSON.parse(jsonString)
        } catch {
            return {}
        }
    }

    /**
     * Verschlüsselt einen API-Key mit zusätzlicher PBKDF2-Sicherheit
     */
    public async encryptApiKey(apiKey: string): Promise<string> {
        return this.encrypt(apiKey, true)
    }

    /**
     * Entschlüsselt einen API-Key
     */
    public async decryptApiKey(encryptedKey: string): Promise<string> {
        return this.decrypt(encryptedKey, true)
    }

    // ==================== MIGRATION & UTILITIES ====================

    /**
     * Migriert V1-verschlüsselte Daten zu V2
     * 
     * @param v1Data - V1-verschlüsselter String
     * @returns V2-verschlüsselter String
     */
    public async migrateToV2(v1Data: string): Promise<string> {
        if (!v1Data || v1Data.startsWith(ENCRYPTION_VERSION_V2)) {
            return v1Data // Bereits V2 oder leer
        }

        const decrypted = await this.decryptV1(v1Data)
        return this.encrypt(decrypted)
    }

    /**
     * Prüft ob Daten V2-verschlüsselt sind
     */
    public isV2Encrypted(data: string): boolean {
        return data?.startsWith(ENCRYPTION_VERSION_V2) ?? false
    }

    /**
     * Prüft ob Daten verschlüsselt sind (V1 oder V2)
     */
    public isEncrypted(data: string): boolean {
        if (!data) return false
        
        // V2 Check
        if (data.startsWith(ENCRYPTION_VERSION_V2)) return true
        
        // V1 Check (crypto-js Format - Base64)
        try {
            const decoded = Buffer.from(data, 'base64').toString('utf8')
            return decoded.startsWith('U2FsdGVk') // crypto-js Signatur
        } catch {
            return false
        }
    }

    /**
     * Maskiert sensible Daten für Logging/Anzeige
     * 
     * @param value - Zu maskierender Wert
     * @param showLast - Anzahl der sichtbaren Zeichen am Ende
     * @returns Maskierter String
     */
    public mask(value: string, showLast: number = 4): string {
        if (!value || value.length < 8) return '••••••••'
        const visible = value.slice(-showLast)
        return '••••••••' + visible
    }

    /**
     * Generiert einen sicheren Zufalls-Token
     */
    public generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex')
    }

    /**
     * Generiert eine UUID v4
     */
    public generateUuid(): string {
        return crypto.randomUUID()
    }

    // ==================== KEY ROTATION ====================

    /**
     * Führt eine Key-Rotation durch
     * Re-verschlüsselt alle übergebenen Daten mit dem neuen Key
     * 
     * @param items - Array von {id, encryptedData} Objekten
     * @param newKey - Neuer Encryption Key (wird in ENCRYPTION_KEY gesetzt)
     * @returns Anzahl der re-verschlüsselten Items
     */
    public async rotateKey(
        items: Array<{ id: string; encryptedData: string }>,
        newKey: string
    ): Promise<{ success: boolean; itemsProcessed: number; errors: string[] }> {
        const errors: string[] = []
        const oldKeyHash = this.hashKey(process.env.ENCRYPTION_KEY || '')
        const reencryptedItems: Array<{ id: string; newEncryptedData: string }> = []

        // Erst alle Daten mit altem Key entschlüsseln
        for (const item of items) {
            try {
                const decrypted = await this.decrypt(item.encryptedData)
                reencryptedItems.push({ id: item.id, newEncryptedData: decrypted })
            } catch (error: any) {
                errors.push(`Item ${item.id}: ${error.message}`)
            }
        }

        // Key wechseln
        this.invalidateKeyCache()
        process.env.ENCRYPTION_KEY = newKey

        // Mit neuem Key verschlüsseln
        const result: Array<{ id: string; newEncryptedData: string }> = []
        for (const item of reencryptedItems) {
            try {
                const encrypted = await this.encrypt(item.newEncryptedData)
                result.push({ id: item.id, newEncryptedData: encrypted })
            } catch (error: any) {
                errors.push(`Re-encryption ${item.id}: ${error.message}`)
            }
        }

        // Event loggen
        this.keyRotationHistory.push({
            oldKeyHash,
            newKeyHash: this.hashKey(newKey),
            rotatedAt: new Date(),
            itemsReencrypted: result.length
        })

        return {
            success: errors.length === 0,
            itemsProcessed: result.length,
            errors
        }
    }

    /**
     * Gibt die Key-Rotation-Historie zurück
     */
    public getKeyRotationHistory(): KeyRotationEvent[] {
        return [...this.keyRotationHistory]
    }

    // ==================== HASHING ====================

    /**
     * Erstellt einen HMAC-SHA256 Hash
     */
    public async hmac(data: string, key?: string): Promise<string> {
        const hmacKey = key || (await this.getMasterKey()).toString('hex')
        return crypto.createHmac('sha256', hmacKey).update(data).digest('hex')
    }

    /**
     * Erstellt einen SHA-256 Hash
     */
    public sha256(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex')
    }

    /**
     * Erstellt einen SHA-512 Hash
     */
    public sha512(data: string): string {
        return crypto.createHash('sha512').update(data).digest('hex')
    }

    /**
     * Vergleicht zwei Hashes in konstanter Zeit (timing-safe)
     */
    public timingSafeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) return false
        try {
            return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
        } catch {
            return false
        }
    }
}

// Singleton-Export
export const encryptionService = EncryptionService.getInstance()

// Convenience-Funktionen für direkten Import
export const encrypt = (plaintext: string) => encryptionService.encrypt(plaintext)
export const decrypt = (ciphertext: string) => encryptionService.decrypt(ciphertext)
export const encryptCredentials = (credentials: Record<string, any>) => 
    encryptionService.encryptCredentials(credentials)
export const decryptCredentials = (encryptedData: string) => 
    encryptionService.decryptCredentials(encryptedData)
export const generateSecureToken = (length?: number) => 
    encryptionService.generateSecureToken(length)
export const mask = (value: string, showLast?: number) => 
    encryptionService.mask(value, showLast)
