/**
 * M.A.T.E. Encryption Utilities
 * 
 * Wrapper-Funktionen für den zentralen EncryptionService.
 * Verwendet AES-256-GCM mit Abwärtskompatibilität zu AES-CBC.
 */

import bcrypt from 'bcryptjs'
import { AES, enc } from 'crypto-js'
import { getEncryptionKey } from '../../utils'
import { encryptionService } from '../services/encryption.service'

/**
 * Erstellt einen bcrypt Hash eines Wertes
 */
export function getHash(value: string) {
    const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '5'))
    return bcrypt.hashSync(value, salt)
}

/**
 * Vergleicht einen Wert mit einem bcrypt Hash
 */
export function compareHash(value1: string, value2: string) {
    return bcrypt.compareSync(value1, value2)
}

/**
 * Verschlüsselt einen Wert mit AES-256-GCM (V2)
 * Neue Verschlüsselungen verwenden den sicheren GCM-Modus
 */
export async function encrypt(value: string): Promise<string> {
    return encryptionService.encrypt(value)
}

/**
 * Entschlüsselt einen Wert (unterstützt V1 AES-CBC und V2 AES-256-GCM)
 * Automatische Erkennung des Verschlüsselungsformats
 */
export async function decrypt(value: string): Promise<string> {
    return encryptionService.decrypt(value)
}

/**
 * Legacy-Verschlüsselung (AES-CBC via crypto-js)
 * NUR für Abwärtskompatibilität - neue Daten sollten encrypt() verwenden
 */
export async function encryptLegacy(value: string): Promise<string> {
    const encryptionKey = await getEncryptionKey()
    return AES.encrypt(value, encryptionKey).toString()
}

/**
 * Legacy-Entschlüsselung (AES-CBC via crypto-js)
 * NUR für Abwärtskompatibilität
 */
export async function decryptLegacy(value: string): Promise<string> {
    const encryptionKey = await getEncryptionKey()
    return AES.decrypt(value, encryptionKey).toString(enc.Utf8)
}

/**
 * Migriert V1-verschlüsselte Daten zu V2 (AES-256-GCM)
 */
export async function migrateToV2(v1EncryptedData: string): Promise<string> {
    return encryptionService.migrateToV2(v1EncryptedData)
}

/**
 * Prüft ob Daten bereits V2-verschlüsselt sind
 */
export function isV2Encrypted(data: string): boolean {
    return encryptionService.isV2Encrypted(data)
}

/**
 * Maskiert sensible Daten für Logging/Anzeige
 */
export function maskSensitiveData(value: string, showLast: number = 4): string {
    return encryptionService.mask(value, showLast)
}

/**
 * Generiert einen sicheren Zufalls-Token
 */
export function generateSecureToken(length: number = 32): string {
    return encryptionService.generateSecureToken(length)
}
