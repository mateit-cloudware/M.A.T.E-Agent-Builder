/**
 * M.A.T.E. Pseudonymization Service (S2.2c)
 * 
 * DSGVO-konforme Pseudonymisierung gemäß Art. 4 Nr. 5 DSGVO:
 * "Verarbeitung personenbezogener Daten in einer Weise, dass die Daten ohne
 * Hinzuziehung zusätzlicher Informationen nicht mehr einer spezifischen
 * betroffenen Person zugeordnet werden können."
 * 
 * Features:
 * - Konsistente Pseudonymisierung (gleicher Input → gleicher Output)
 * - Verschiedene Pseudonymisierungsstrategien
 * - Sichere Schlüsselverwaltung
 * - Re-Identifizierung nur für berechtigte Anfragen
 * - Audit-Trail für alle Operationen
 */

import * as crypto from 'crypto'
import { DataSource, Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

// ==================== ENUMS & TYPES ====================

export enum PseudonymType {
    NAME = 'name',
    EMAIL = 'email',
    PHONE = 'phone',
    IP_ADDRESS = 'ip_address',
    USER_ID = 'user_id',
    DEVICE_ID = 'device_id',
    SESSION_ID = 'session_id',
    TRANSACTION_ID = 'transaction_id',
    LOCATION = 'location',
    FREE_TEXT = 'free_text'
}

export enum PseudonymStrategy {
    HASH = 'hash',                      // SHA-256 Hash
    HMAC = 'hmac',                      // HMAC mit Schlüssel (reversibel mit Schlüssel)
    TOKENIZATION = 'tokenization',      // Zufälliger Token mit Mapping
    GENERALIZATION = 'generalization',  // Generalisierung (z.B. PLZ → Region)
    MASKING = 'masking',                // Teilweise Maskierung
    ENCRYPTION = 'encryption'           // AES-256 Verschlüsselung (reversibel)
}

export interface PseudonymConfig {
    type: PseudonymType
    strategy: PseudonymStrategy
    preserveFormat?: boolean        // Format beibehalten (z.B. E-Mail-Format)
    preserveLength?: boolean        // Länge beibehalten
    salt?: string                   // Zusätzlicher Salt
    customKey?: string              // Eigener Schlüssel
}

export interface PseudonymMapping {
    id: string
    originalHash: string            // Hash des Originals (zur Suche)
    pseudonym: string               // Der Pseudonym-Wert
    type: PseudonymType
    strategy: PseudonymStrategy
    encryptedOriginal?: string      // Verschlüsseltes Original (für Rückgängigmachung)
    createdAt: Date
    lastUsedAt: Date
    usageCount: number
}

export interface PseudonymizationResult {
    originalValue: string
    pseudonym: string
    type: PseudonymType
    strategy: PseudonymStrategy
    isNewPseudonym: boolean
    mappingId?: string
}

export interface DePseudonymizationRequest {
    id: string
    requesterId: string
    requesterRole: string
    reason: string
    pseudonyms: string[]
    status: 'pending' | 'approved' | 'denied' | 'completed'
    approvedBy?: string
    approvedAt?: Date
    results?: Map<string, string>   // pseudonym → original
    createdAt: Date
}

// ==================== PSEUDONYMIZATION SERVICE ====================

class PseudonymizationService {
    private dataSource: DataSource | null = null
    
    // Master-Schlüssel für HMAC und Verschlüsselung
    private masterKey: Buffer
    private hmacKey: Buffer
    
    // Token-Mapping (In Produktion: Datenbank)
    private tokenMappings: Map<string, PseudonymMapping> = new Map()
    private hashToMapping: Map<string, string> = new Map() // originalHash → mappingId
    
    // De-Pseudonymisierungs-Anfragen
    private depseudonymizationRequests: Map<string, DePseudonymizationRequest> = new Map()
    
    // Standard-Konfigurationen pro Typ
    private defaultConfigs: Map<PseudonymType, PseudonymConfig> = new Map([
        [PseudonymType.NAME, { type: PseudonymType.NAME, strategy: PseudonymStrategy.TOKENIZATION, preserveFormat: true }],
        [PseudonymType.EMAIL, { type: PseudonymType.EMAIL, strategy: PseudonymStrategy.HMAC, preserveFormat: true }],
        [PseudonymType.PHONE, { type: PseudonymType.PHONE, strategy: PseudonymStrategy.MASKING, preserveFormat: true }],
        [PseudonymType.IP_ADDRESS, { type: PseudonymType.IP_ADDRESS, strategy: PseudonymStrategy.GENERALIZATION }],
        [PseudonymType.USER_ID, { type: PseudonymType.USER_ID, strategy: PseudonymStrategy.HMAC }],
        [PseudonymType.DEVICE_ID, { type: PseudonymType.DEVICE_ID, strategy: PseudonymStrategy.HASH }],
        [PseudonymType.SESSION_ID, { type: PseudonymType.SESSION_ID, strategy: PseudonymStrategy.HASH }],
        [PseudonymType.TRANSACTION_ID, { type: PseudonymType.TRANSACTION_ID, strategy: PseudonymStrategy.HMAC }],
        [PseudonymType.LOCATION, { type: PseudonymType.LOCATION, strategy: PseudonymStrategy.GENERALIZATION }],
        [PseudonymType.FREE_TEXT, { type: PseudonymType.FREE_TEXT, strategy: PseudonymStrategy.ENCRYPTION }]
    ])

    // Deutsche Vornamen für pseudonymisierte Namen
    private pseudonymFirstNames = [
        'Anna', 'Max', 'Lena', 'Paul', 'Marie', 'Leon', 'Sophie', 'Felix',
        'Emma', 'Julian', 'Mia', 'Ben', 'Hannah', 'Noah', 'Lea', 'Tim'
    ]
    
    private pseudonymLastNames = [
        'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner',
        'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter'
    ]

    // ==================== INITIALIZATION ====================

    constructor() {
        // Schlüssel aus Environment oder generieren
        const envKey = process.env.PSEUDONYMIZATION_KEY || process.env.ENCRYPTION_KEY
        if (envKey && envKey.length >= 64) {
            this.masterKey = Buffer.from(envKey.substring(0, 64), 'hex')
        } else {
            // Fallback: Generiere temporären Schlüssel (WARNUNG in Produktion)
            this.masterKey = crypto.randomBytes(32)
            console.warn('[Pseudonymization] WARNUNG: Temporärer Schlüssel generiert. Setze PSEUDONYMIZATION_KEY!')
        }
        
        // HMAC-Schlüssel ableiten
        this.hmacKey = crypto.createHmac('sha256', this.masterKey)
            .update('hmac-key-derivation')
            .digest()
    }

    public initialize(dataSource: DataSource): void {
        this.dataSource = dataSource
        console.log('[Pseudonymization] Service initialisiert')
    }

    // ==================== MAIN PSEUDONYMIZATION METHODS ====================

    /**
     * Einzelnen Wert pseudonymisieren
     */
    public async pseudonymize(
        value: string,
        type: PseudonymType,
        config?: Partial<PseudonymConfig>
    ): Promise<PseudonymizationResult> {
        if (!value || value.trim().length === 0) {
            return {
                originalValue: value,
                pseudonym: value,
                type,
                strategy: PseudonymStrategy.HASH,
                isNewPseudonym: false
            }
        }

        const fullConfig: PseudonymConfig = {
            ...this.defaultConfigs.get(type),
            ...config,
            type
        } as PseudonymConfig

        // Prüfen ob bereits Pseudonym existiert
        const existingMapping = await this.findExistingMapping(value)
        if (existingMapping) {
            existingMapping.lastUsedAt = new Date()
            existingMapping.usageCount++
            return {
                originalValue: value,
                pseudonym: existingMapping.pseudonym,
                type,
                strategy: existingMapping.strategy,
                isNewPseudonym: false,
                mappingId: existingMapping.id
            }
        }

        // Neues Pseudonym erstellen
        const pseudonym = await this.createPseudonym(value, fullConfig)
        
        // Mapping speichern (für Tokenization und Encryption)
        if (fullConfig.strategy === PseudonymStrategy.TOKENIZATION || 
            fullConfig.strategy === PseudonymStrategy.ENCRYPTION) {
            await this.saveMapping(value, pseudonym, fullConfig)
        }

        return {
            originalValue: value,
            pseudonym,
            type,
            strategy: fullConfig.strategy,
            isNewPseudonym: true
        }
    }

    /**
     * Mehrere Werte pseudonymisieren
     */
    public async pseudonymizeBatch(
        values: Array<{ value: string; type: PseudonymType; config?: Partial<PseudonymConfig> }>
    ): Promise<PseudonymizationResult[]> {
        const results: PseudonymizationResult[] = []
        
        for (const item of values) {
            const result = await this.pseudonymize(item.value, item.type, item.config)
            results.push(result)
        }
        
        return results
    }

    /**
     * Objekt pseudonymisieren (alle markierten Felder)
     */
    public async pseudonymizeObject<T extends object>(
        obj: T,
        fieldMappings: Record<string, PseudonymType>
    ): Promise<T> {
        const result = { ...obj } as any
        
        for (const [field, type] of Object.entries(fieldMappings)) {
            if (result[field] !== undefined && result[field] !== null) {
                const pseudonymResult = await this.pseudonymize(String(result[field]), type)
                result[field] = pseudonymResult.pseudonym
            }
        }
        
        return result
    }

    // ==================== PSEUDONYM CREATION ====================

    /**
     * Pseudonym nach Strategie erstellen
     */
    private async createPseudonym(value: string, config: PseudonymConfig): Promise<string> {
        switch (config.strategy) {
            case PseudonymStrategy.HASH:
                return this.hashPseudonymize(value, config)
            
            case PseudonymStrategy.HMAC:
                return this.hmacPseudonymize(value, config)
            
            case PseudonymStrategy.TOKENIZATION:
                return this.tokenizePseudonymize(value, config)
            
            case PseudonymStrategy.GENERALIZATION:
                return this.generalizePseudonymize(value, config)
            
            case PseudonymStrategy.MASKING:
                return this.maskPseudonymize(value, config)
            
            case PseudonymStrategy.ENCRYPTION:
                return this.encryptPseudonymize(value, config)
            
            default:
                return this.hashPseudonymize(value, config)
        }
    }

    /**
     * Hash-basierte Pseudonymisierung (nicht reversibel)
     */
    private hashPseudonymize(value: string, config: PseudonymConfig): string {
        const salt = config.salt || 'default-salt'
        const hash = crypto.createHash('sha256')
            .update(salt + value)
            .digest('hex')
        
        // Kürzen für bessere Lesbarkeit
        return `PSH-${hash.substring(0, 16).toUpperCase()}`
    }

    /**
     * HMAC-basierte Pseudonymisierung (reversibel mit Schlüssel)
     */
    private hmacPseudonymize(value: string, config: PseudonymConfig): string {
        const key = config.customKey 
            ? Buffer.from(config.customKey, 'hex')
            : this.hmacKey
        
        const hmac = crypto.createHmac('sha256', key)
            .update(value)
            .digest('hex')
        
        if (config.preserveFormat && config.type === PseudonymType.EMAIL) {
            // E-Mail-Format beibehalten
            return `user-${hmac.substring(0, 8)}@pseudonym.local`
        }
        
        return `PSM-${hmac.substring(0, 16).toUpperCase()}`
    }

    /**
     * Token-basierte Pseudonymisierung (zufälliger Token mit Mapping)
     */
    private tokenizePseudonymize(value: string, config: PseudonymConfig): string {
        if (config.type === PseudonymType.NAME && config.preserveFormat) {
            // Pseudo-Namen generieren
            const hash = crypto.createHash('sha256').update(value).digest()
            const firstIndex = hash[0] % this.pseudonymFirstNames.length
            const lastIndex = hash[1] % this.pseudonymLastNames.length
            return `${this.pseudonymFirstNames[firstIndex]} ${this.pseudonymLastNames[lastIndex]}`
        }
        
        // Zufälliger Token
        const token = crypto.randomBytes(8).toString('hex').toUpperCase()
        return `PST-${token}`
    }

    /**
     * Generalisierung (reduziert Präzision)
     */
    private generalizePseudonymize(value: string, config: PseudonymConfig): string {
        switch (config.type) {
            case PseudonymType.IP_ADDRESS:
                // IPv4: Letztes Oktett auf 0 setzen
                const ipParts = value.split('.')
                if (ipParts.length === 4) {
                    return `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`
                }
                // IPv6: Letzte 64 Bits entfernen
                if (value.includes(':')) {
                    const v6Parts = value.split(':')
                    return v6Parts.slice(0, 4).join(':') + '::/64'
                }
                return 'X.X.X.0/24'
            
            case PseudonymType.LOCATION:
                // PLZ → Bundesland oder Region
                const plz = value.replace(/\D/g, '')
                if (plz.length >= 2) {
                    const region = this.getRegionFromPLZ(plz.substring(0, 2))
                    return `Region: ${region}`
                }
                return 'Deutschland'
            
            default:
                return `[Generalisiert: ${value.substring(0, 3)}...]`
        }
    }

    /**
     * Maskierung (teilweise Anzeige)
     */
    private maskPseudonymize(value: string, config: PseudonymConfig): string {
        switch (config.type) {
            case PseudonymType.PHONE:
                // +49 123 ***45
                if (value.length >= 6) {
                    return value.substring(0, value.length - 4).replace(/\d/g, '*') + 
                           value.substring(value.length - 2)
                }
                return '***'
            
            case PseudonymType.EMAIL:
                // j***@e***.com
                const [local, domain] = value.split('@')
                if (local && domain) {
                    const maskedLocal = local[0] + '*'.repeat(local.length - 1)
                    const domainParts = domain.split('.')
                    const maskedDomain = domainParts[0][0] + '*'.repeat(domainParts[0].length - 1)
                    return `${maskedLocal}@${maskedDomain}.${domainParts.slice(1).join('.')}`
                }
                return '***@***.***'
            
            case PseudonymType.NAME:
                // Max M.
                const parts = value.split(' ')
                if (parts.length >= 2) {
                    return `${parts[0][0]}. ${parts[parts.length - 1][0]}.`
                }
                return `${value[0]}.***`
            
            default:
                // Standard: Mitte maskieren
                if (value.length <= 4) return '***'
                const showChars = Math.max(1, Math.floor(value.length / 4))
                return value.substring(0, showChars) + 
                       '*'.repeat(value.length - showChars * 2) + 
                       value.substring(value.length - showChars)
        }
    }

    /**
     * Verschlüsselung (vollständig reversibel)
     */
    private encryptPseudonymize(value: string, config: PseudonymConfig): string {
        const key = config.customKey 
            ? Buffer.from(config.customKey, 'hex')
            : this.masterKey
        
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
        
        let encrypted = cipher.update(value, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        const authTag = cipher.getAuthTag()
        
        // Format: iv:authTag:encrypted
        return `PSE-${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    }

    // ==================== DE-PSEUDONYMIZATION ====================

    /**
     * De-Pseudonymisierung anfordern (erfordert Genehmigung)
     */
    public async requestDePseudonymization(
        requesterId: string,
        requesterRole: string,
        pseudonyms: string[],
        reason: string
    ): Promise<DePseudonymizationRequest> {
        const request: DePseudonymizationRequest = {
            id: uuidv4(),
            requesterId,
            requesterRole,
            reason,
            pseudonyms,
            status: 'pending',
            createdAt: new Date()
        }
        
        this.depseudonymizationRequests.set(request.id, request)
        
        console.log(`[Pseudonymization] De-Pseudonymisierung angefordert von ${requesterId}: ${pseudonyms.length} Werte`)
        
        return request
    }

    /**
     * De-Pseudonymisierung genehmigen
     */
    public async approveDePseudonymization(
        requestId: string,
        approverId: string
    ): Promise<boolean> {
        const request = this.depseudonymizationRequests.get(requestId)
        if (!request || request.status !== 'pending') {
            return false
        }
        
        request.status = 'approved'
        request.approvedBy = approverId
        request.approvedAt = new Date()
        
        // De-Pseudonymisierung durchführen
        request.results = new Map()
        for (const pseudonym of request.pseudonyms) {
            const original = await this.dePseudonymize(pseudonym)
            if (original) {
                request.results.set(pseudonym, original)
            }
        }
        
        request.status = 'completed'
        
        console.log(`[Pseudonymization] De-Pseudonymisierung genehmigt von ${approverId}`)
        
        return true
    }

    /**
     * Wert de-pseudonymisieren (intern)
     */
    private async dePseudonymize(pseudonym: string): Promise<string | null> {
        // Verschlüsselte Pseudonyme können direkt entschlüsselt werden
        if (pseudonym.startsWith('PSE-')) {
            return this.decryptPseudonym(pseudonym)
        }
        
        // Token-Mapping suchen
        const mapping = this.tokenMappings.get(pseudonym)
        if (mapping && mapping.encryptedOriginal) {
            return this.decryptValue(mapping.encryptedOriginal)
        }
        
        // Hash und HMAC sind nicht reversibel
        return null
    }

    /**
     * Verschlüsseltes Pseudonym entschlüsseln
     */
    private decryptPseudonym(pseudonym: string): string | null {
        try {
            const parts = pseudonym.replace('PSE-', '').split(':')
            if (parts.length !== 3) return null
            
            const iv = Buffer.from(parts[0], 'hex')
            const authTag = Buffer.from(parts[1], 'hex')
            const encrypted = parts[2]
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv)
            decipher.setAuthTag(authTag)
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8')
            decrypted += decipher.final('utf8')
            
            return decrypted
        } catch (error) {
            console.error('[Pseudonymization] Entschlüsselung fehlgeschlagen:', error)
            return null
        }
    }

    /**
     * Verschlüsselten Wert entschlüsseln
     */
    private decryptValue(encrypted: string): string | null {
        try {
            const parts = encrypted.split(':')
            if (parts.length !== 3) return null
            
            const iv = Buffer.from(parts[0], 'hex')
            const authTag = Buffer.from(parts[1], 'hex')
            const data = parts[2]
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv)
            decipher.setAuthTag(authTag)
            
            let decrypted = decipher.update(data, 'hex', 'utf8')
            decrypted += decipher.final('utf8')
            
            return decrypted
        } catch {
            return null
        }
    }

    // ==================== MAPPING MANAGEMENT ====================

    /**
     * Existierendes Mapping finden
     */
    private async findExistingMapping(originalValue: string): Promise<PseudonymMapping | null> {
        const hash = this.hashOriginal(originalValue)
        const mappingId = this.hashToMapping.get(hash)
        
        if (mappingId) {
            return this.tokenMappings.get(mappingId) || null
        }
        
        return null
    }

    /**
     * Mapping speichern
     */
    private async saveMapping(
        originalValue: string,
        pseudonym: string,
        config: PseudonymConfig
    ): Promise<void> {
        const mapping: PseudonymMapping = {
            id: uuidv4(),
            originalHash: this.hashOriginal(originalValue),
            pseudonym,
            type: config.type,
            strategy: config.strategy,
            encryptedOriginal: this.encryptForStorage(originalValue),
            createdAt: new Date(),
            lastUsedAt: new Date(),
            usageCount: 1
        }
        
        this.tokenMappings.set(pseudonym, mapping)
        this.hashToMapping.set(mapping.originalHash, pseudonym)
    }

    /**
     * Original hashen für Suche
     */
    private hashOriginal(value: string): string {
        return crypto.createHmac('sha256', this.masterKey)
            .update(value)
            .digest('hex')
    }

    /**
     * Original für Speicherung verschlüsseln
     */
    private encryptForStorage(value: string): string {
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv)
        
        let encrypted = cipher.update(value, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        const authTag = cipher.getAuthTag()
        
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    }

    // ==================== HELPER METHODS ====================

    /**
     * PLZ zu Region mappen (Deutschland)
     */
    private getRegionFromPLZ(prefix: string): string {
        const plzRegions: Record<string, string> = {
            '01': 'Sachsen', '02': 'Sachsen', '03': 'Brandenburg', '04': 'Sachsen',
            '06': 'Sachsen-Anhalt', '07': 'Thüringen', '08': 'Sachsen', '09': 'Sachsen',
            '10': 'Berlin', '12': 'Berlin', '13': 'Berlin', '14': 'Brandenburg',
            '15': 'Brandenburg', '16': 'Brandenburg', '17': 'Mecklenburg-Vorpommern',
            '18': 'Mecklenburg-Vorpommern', '19': 'Mecklenburg-Vorpommern',
            '20': 'Hamburg', '21': 'Niedersachsen/Schleswig-Holstein', '22': 'Hamburg',
            '23': 'Schleswig-Holstein', '24': 'Schleswig-Holstein', '25': 'Schleswig-Holstein',
            '26': 'Niedersachsen', '27': 'Niedersachsen', '28': 'Bremen', '29': 'Niedersachsen',
            '30': 'Niedersachsen', '31': 'Niedersachsen', '32': 'NRW', '33': 'NRW',
            '34': 'Hessen', '35': 'Hessen', '36': 'Hessen', '37': 'Niedersachsen',
            '38': 'Niedersachsen', '39': 'Sachsen-Anhalt',
            '40': 'NRW', '41': 'NRW', '42': 'NRW', '44': 'NRW', '45': 'NRW',
            '46': 'NRW', '47': 'NRW', '48': 'NRW', '49': 'Niedersachsen',
            '50': 'NRW', '51': 'NRW', '52': 'NRW', '53': 'NRW', '54': 'Rheinland-Pfalz',
            '55': 'Rheinland-Pfalz', '56': 'Rheinland-Pfalz', '57': 'NRW', '58': 'NRW', '59': 'NRW',
            '60': 'Hessen', '61': 'Hessen', '63': 'Bayern', '64': 'Hessen',
            '65': 'Hessen', '66': 'Saarland', '67': 'Rheinland-Pfalz', '68': 'Baden-Württemberg',
            '69': 'Baden-Württemberg',
            '70': 'Baden-Württemberg', '71': 'Baden-Württemberg', '72': 'Baden-Württemberg',
            '73': 'Baden-Württemberg', '74': 'Baden-Württemberg', '75': 'Baden-Württemberg',
            '76': 'Baden-Württemberg', '77': 'Baden-Württemberg', '78': 'Baden-Württemberg',
            '79': 'Baden-Württemberg',
            '80': 'Bayern', '81': 'Bayern', '82': 'Bayern', '83': 'Bayern',
            '84': 'Bayern', '85': 'Bayern', '86': 'Bayern', '87': 'Bayern',
            '88': 'Baden-Württemberg', '89': 'Baden-Württemberg',
            '90': 'Bayern', '91': 'Bayern', '92': 'Bayern', '93': 'Bayern',
            '94': 'Bayern', '95': 'Bayern', '96': 'Bayern', '97': 'Bayern',
            '98': 'Thüringen', '99': 'Thüringen'
        }
        
        return plzRegions[prefix] || 'Deutschland'
    }

    // ==================== STATISTICS & ADMIN ====================

    /**
     * Statistiken abrufen
     */
    public getStatistics(): {
        totalMappings: number
        byType: Record<PseudonymType, number>
        byStrategy: Record<PseudonymStrategy, number>
        pendingRequests: number
    } {
        const byType: Record<string, number> = {}
        const byStrategy: Record<string, number> = {}
        
        for (const mapping of this.tokenMappings.values()) {
            byType[mapping.type] = (byType[mapping.type] || 0) + 1
            byStrategy[mapping.strategy] = (byStrategy[mapping.strategy] || 0) + 1
        }
        
        const pendingRequests = Array.from(this.depseudonymizationRequests.values())
            .filter(r => r.status === 'pending').length
        
        return {
            totalMappings: this.tokenMappings.size,
            byType: byType as Record<PseudonymType, number>,
            byStrategy: byStrategy as Record<PseudonymStrategy, number>,
            pendingRequests
        }
    }

    /**
     * Alle Mappings für einen Typ löschen
     */
    public async deleteMappingsByType(type: PseudonymType): Promise<number> {
        let count = 0
        
        for (const [pseudonym, mapping] of this.tokenMappings.entries()) {
            if (mapping.type === type) {
                this.tokenMappings.delete(pseudonym)
                this.hashToMapping.delete(mapping.originalHash)
                count++
            }
        }
        
        console.log(`[Pseudonymization] ${count} Mappings vom Typ ${type} gelöscht`)
        return count
    }

    /**
     * Master-Schlüssel rotieren (alle Mappings müssen neu erstellt werden!)
     */
    public rotateKeys(): void {
        console.warn('[Pseudonymization] Schlüsselrotation gestartet - alle bestehenden Mappings werden ungültig!')
        
        // Neuen Schlüssel generieren
        this.masterKey = crypto.randomBytes(32)
        this.hmacKey = crypto.createHmac('sha256', this.masterKey)
            .update('hmac-key-derivation')
            .digest()
        
        // Alle Mappings löschen (müssen neu erstellt werden)
        this.tokenMappings.clear()
        this.hashToMapping.clear()
        
        console.log('[Pseudonymization] Schlüsselrotation abgeschlossen')
    }
}

// Singleton-Export
export const pseudonymizationService = new PseudonymizationService()
