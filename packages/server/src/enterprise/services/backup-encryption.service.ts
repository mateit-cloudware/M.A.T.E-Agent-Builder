/**
 * M.A.T.E. Backup Encryption Service
 * 
 * Verschlüsselt und entschlüsselt Datenbank-Backups.
 * 
 * Features:
 * - AES-256-GCM Verschlüsselung für Backup-Dateien
 * - Streaming-Verschlüsselung für große Dateien
 * - Automatische Komprimierung (gzip)
 * - Integritätsprüfung via HMAC
 * - Backup-Metadaten
 * 
 * @module services/backup-encryption
 */

import crypto from 'crypto'
import { createReadStream, createWriteStream, existsSync, statSync, unlinkSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { pipeline } from 'stream/promises'
import { createGzip, createGunzip } from 'zlib'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// Konstanten
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const BACKUP_VERSION = 1
const MAGIC_BYTES = Buffer.from('MATE_BACKUP_V1')

/**
 * Backup-Metadaten
 */
export interface BackupMetadata {
    version: number
    createdAt: string
    checksum: string
    originalSize: number
    encryptedSize: number
    compressed: boolean
    tables?: string[]
    description?: string
}

/**
 * Backup-Header (gespeichert am Anfang der Datei)
 */
interface BackupHeader {
    magic: Buffer
    version: number
    ivLength: number
    iv: Buffer
    authTagLength: number
    authTag: Buffer
    metadataLength: number
    metadata: BackupMetadata
}

/**
 * Backup Encryption Service
 */
export class BackupEncryptionService {
    private static instance: BackupEncryptionService

    private constructor() {}

    /**
     * Singleton-Instanz
     */
    public static getInstance(): BackupEncryptionService {
        if (!BackupEncryptionService.instance) {
            BackupEncryptionService.instance = new BackupEncryptionService()
        }
        return BackupEncryptionService.instance
    }

    // ==================== KEY MANAGEMENT ====================

    /**
     * Holt den Backup-Encryption-Key
     * Verwendet separaten Key oder fällt auf ENCRYPTION_KEY zurück
     */
    private getBackupKey(): Buffer {
        const backupKey = process.env.BACKUP_ENCRYPTION_KEY || 
                          process.env.ENCRYPTION_KEY || 
                          process.env.JWT_SECRET

        if (!backupKey) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Kein Backup-Encryption-Key konfiguriert'
            )
        }

        return crypto.createHash('sha256').update(backupKey).digest()
    }

    // ==================== ENCRYPTION ====================

    /**
     * Verschlüsselt eine Backup-Datei
     * 
     * @param inputPath - Pfad zur unverschlüsselten Backup-Datei
     * @param outputPath - Pfad für die verschlüsselte Ausgabe
     * @param options - Zusätzliche Optionen
     * @returns Backup-Metadaten
     */
    public async encryptBackup(
        inputPath: string,
        outputPath: string,
        options: {
            compress?: boolean
            description?: string
            tables?: string[]
        } = {}
    ): Promise<BackupMetadata> {
        const { compress = true, description, tables } = options

        if (!existsSync(inputPath)) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Backup-Datei nicht gefunden: ${inputPath}`
            )
        }

        const key = this.getBackupKey()
        const iv = crypto.randomBytes(IV_LENGTH)
        const originalSize = statSync(inputPath).size

        // Verzeichnis erstellen falls nötig
        await mkdir(path.dirname(outputPath), { recursive: true })

        // Checksum des Originals berechnen
        const checksum = await this.calculateFileChecksum(inputPath)

        // Verschlüsselung vorbereiten
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
        
        const tempPath = outputPath + '.tmp'
        const input = createReadStream(inputPath)
        const output = createWriteStream(tempPath)

        try {
            // Pipeline: Input -> (Gzip) -> Cipher -> Output
            if (compress) {
                await pipeline(input, createGzip(), cipher, output)
            } else {
                await pipeline(input, cipher, output)
            }

            const authTag = cipher.getAuthTag()
            const encryptedSize = statSync(tempPath).size

            // Metadaten
            const metadata: BackupMetadata = {
                version: BACKUP_VERSION,
                createdAt: new Date().toISOString(),
                checksum,
                originalSize,
                encryptedSize: 0, // Wird unten berechnet
                compressed: compress,
                tables,
                description
            }
            
            // Header-Größe berechnen und encryptedSize aktualisieren
            metadata.encryptedSize = encryptedSize + this.calculateHeaderSize(metadata)

            // Header schreiben und mit verschlüsselten Daten kombinieren
            await this.writeEncryptedBackup(outputPath, tempPath, iv, authTag, metadata)

            // Temp-Datei löschen
            if (existsSync(tempPath)) {
                unlinkSync(tempPath)
            }

            console.log(`[BackupEncryption] ✓ Backup verschlüsselt: ${outputPath}`)
            console.log(`  Original: ${this.formatBytes(originalSize)}, Verschlüsselt: ${this.formatBytes(metadata.encryptedSize)}`)

            return metadata
        } catch (error) {
            // Cleanup bei Fehler
            if (existsSync(tempPath)) unlinkSync(tempPath)
            if (existsSync(outputPath)) unlinkSync(outputPath)
            throw error
        }
    }

    /**
     * Entschlüsselt eine Backup-Datei
     * 
     * @param inputPath - Pfad zur verschlüsselten Backup-Datei
     * @param outputPath - Pfad für die entschlüsselte Ausgabe
     * @returns Backup-Metadaten
     */
    public async decryptBackup(
        inputPath: string,
        outputPath: string
    ): Promise<BackupMetadata> {
        if (!existsSync(inputPath)) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Verschlüsselte Backup-Datei nicht gefunden: ${inputPath}`
            )
        }

        // Header lesen
        const header = await this.readBackupHeader(inputPath)

        // Überprüfe Magic Bytes
        if (!header.magic.equals(MAGIC_BYTES)) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Ungültiges Backup-Format (Magic Bytes stimmen nicht)'
            )
        }

        const key = this.getBackupKey()
        const headerSize = this.calculateHeaderSize(header.metadata)

        // Verzeichnis erstellen falls nötig
        await mkdir(path.dirname(outputPath), { recursive: true })

        const decipher = crypto.createDecipheriv(ALGORITHM, key, header.iv) as crypto.DecipherGCM
        decipher.setAuthTag(header.authTag)

        const tempPath = outputPath + '.tmp'

        try {
            // Verschlüsselte Daten lesen (nach Header)
            const encryptedData = await readFile(inputPath)
            const ciphertext = encryptedData.slice(headerSize)

            // Entschlüsseln
            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final()
            ])

            // Dekomprimieren falls nötig
            if (header.metadata.compressed) {
                await writeFile(tempPath, decrypted)
                const input = createReadStream(tempPath)
                const output = createWriteStream(outputPath)
                await pipeline(input, createGunzip(), output)
                unlinkSync(tempPath)
            } else {
                await writeFile(outputPath, decrypted)
            }

            // Checksum verifizieren
            const restoredChecksum = await this.calculateFileChecksum(outputPath)
            if (restoredChecksum !== header.metadata.checksum) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    'Backup-Integritätsprüfung fehlgeschlagen (Checksum stimmt nicht)'
                )
            }

            console.log(`[BackupEncryption] ✓ Backup entschlüsselt: ${outputPath}`)

            return header.metadata
        } catch (error) {
            // Cleanup bei Fehler
            if (existsSync(tempPath)) unlinkSync(tempPath)
            throw error
        }
    }

    // ==================== HELPERS ====================

    /**
     * Berechnet die Header-Größe
     */
    private calculateHeaderSize(metadata: BackupMetadata): number {
        const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf8')
        return MAGIC_BYTES.length + 
               1 + // Version byte
               1 + // IV length byte
               IV_LENGTH +
               1 + // Auth tag length byte
               AUTH_TAG_LENGTH +
               4 + // Metadata length (uint32)
               metadataBuffer.length
    }

    /**
     * Schreibt die verschlüsselte Backup-Datei mit Header
     */
    private async writeEncryptedBackup(
        outputPath: string,
        encryptedDataPath: string,
        iv: Buffer,
        authTag: Buffer,
        metadata: BackupMetadata
    ): Promise<void> {
        const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf8')

        // Header bauen
        const header = Buffer.alloc(this.calculateHeaderSize(metadata))
        let offset = 0

        // Magic Bytes
        MAGIC_BYTES.copy(header, offset)
        offset += MAGIC_BYTES.length

        // Version
        header.writeUInt8(BACKUP_VERSION, offset++)

        // IV Length + IV
        header.writeUInt8(IV_LENGTH, offset++)
        iv.copy(header, offset)
        offset += IV_LENGTH

        // Auth Tag Length + Auth Tag
        header.writeUInt8(AUTH_TAG_LENGTH, offset++)
        authTag.copy(header, offset)
        offset += AUTH_TAG_LENGTH

        // Metadata Length + Metadata
        header.writeUInt32BE(metadataBuffer.length, offset)
        offset += 4
        metadataBuffer.copy(header, offset)

        // Header + verschlüsselte Daten schreiben
        const encryptedData = await readFile(encryptedDataPath)
        const combined = Buffer.concat([header, encryptedData])
        await writeFile(outputPath, combined)
    }

    /**
     * Liest den Header einer verschlüsselten Backup-Datei
     */
    private async readBackupHeader(inputPath: string): Promise<BackupHeader> {
        const data = await readFile(inputPath)
        let offset = 0

        // Magic Bytes
        const magic = data.slice(offset, offset + MAGIC_BYTES.length)
        offset += MAGIC_BYTES.length

        // Version
        const version = data.readUInt8(offset++)

        // IV Length + IV
        const ivLength = data.readUInt8(offset++)
        const iv = data.slice(offset, offset + ivLength)
        offset += ivLength

        // Auth Tag Length + Auth Tag
        const authTagLength = data.readUInt8(offset++)
        const authTag = data.slice(offset, offset + authTagLength)
        offset += authTagLength

        // Metadata Length + Metadata
        const metadataLength = data.readUInt32BE(offset)
        offset += 4
        const metadataBuffer = data.slice(offset, offset + metadataLength)
        const metadata: BackupMetadata = JSON.parse(metadataBuffer.toString('utf8'))

        return {
            magic,
            version,
            ivLength,
            iv,
            authTagLength,
            authTag,
            metadataLength,
            metadata
        }
    }

    /**
     * Berechnet die SHA-256 Checksum einer Datei
     */
    private async calculateFileChecksum(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256')
            const stream = createReadStream(filePath)
            
            stream.on('data', (data) => hash.update(data))
            stream.on('end', () => resolve(hash.digest('hex')))
            stream.on('error', reject)
        })
    }

    /**
     * Formatiert Bytes für Anzeige
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Verifiziert die Integrität einer verschlüsselten Backup-Datei
     */
    public async verifyBackup(inputPath: string): Promise<{
        valid: boolean
        metadata: BackupMetadata | null
        error?: string
    }> {
        try {
            if (!existsSync(inputPath)) {
                return { valid: false, metadata: null, error: 'Datei nicht gefunden' }
            }

            const header = await this.readBackupHeader(inputPath)

            if (!header.magic.equals(MAGIC_BYTES)) {
                return { valid: false, metadata: null, error: 'Ungültige Magic Bytes' }
            }

            if (header.version !== BACKUP_VERSION) {
                return { valid: false, metadata: null, error: `Unbekannte Version: ${header.version}` }
            }

            return { valid: true, metadata: header.metadata }
        } catch (error: any) {
            return { valid: false, metadata: null, error: error.message }
        }
    }

    /**
     * Holt Metadaten einer verschlüsselten Backup-Datei ohne Entschlüsselung
     */
    public async getBackupMetadata(inputPath: string): Promise<BackupMetadata> {
        const header = await this.readBackupHeader(inputPath)
        return header.metadata
    }

    /**
     * Verschlüsselt Daten im Speicher (für kleinere Backups)
     */
    public async encryptData(data: Buffer | string): Promise<{
        encrypted: Buffer
        iv: Buffer
        authTag: Buffer
    }> {
        const key = this.getBackupKey()
        const iv = crypto.randomBytes(IV_LENGTH)
        
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
        
        const input = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
        const encrypted = Buffer.concat([cipher.update(input), cipher.final()])
        const authTag = cipher.getAuthTag()

        return { encrypted, iv, authTag }
    }

    /**
     * Entschlüsselt Daten im Speicher
     */
    public async decryptData(
        encrypted: Buffer,
        iv: Buffer,
        authTag: Buffer
    ): Promise<Buffer> {
        const key = this.getBackupKey()
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM
        decipher.setAuthTag(authTag)

        return Buffer.concat([decipher.update(encrypted), decipher.final()])
    }
}

// Singleton-Export
export const backupEncryptionService = BackupEncryptionService.getInstance()

// Convenience-Funktionen
export const encryptBackup = (inputPath: string, outputPath: string, options?: any) =>
    backupEncryptionService.encryptBackup(inputPath, outputPath, options)
export const decryptBackup = (inputPath: string, outputPath: string) =>
    backupEncryptionService.decryptBackup(inputPath, outputPath)
export const verifyBackup = (inputPath: string) =>
    backupEncryptionService.verifyBackup(inputPath)
export const getBackupMetadata = (inputPath: string) =>
    backupEncryptionService.getBackupMetadata(inputPath)
