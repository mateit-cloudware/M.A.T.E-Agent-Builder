/**
 * M.A.T.E. SystemConfig Entity
 * 
 * Speichert Plattform-Konfigurationen mit verschlüsselter Speicherung
 * für sensible Werte wie API-Keys und Secrets.
 * 
 * Kategorien:
 * - LLM: OpenRouter API-Key, Standard-Modell, Fallback
 * - VAPI: API-Key, Webhook-Secret
 * - PRICING: Token-Preise, Voice-Preise, Margen
 * - LIMITS: Usage-Limits, Volumen-Rabatte
 */
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import crypto from 'crypto'

// Konfigurationskategorien
export enum ConfigCategory {
    LLM = 'llm',
    VAPI = 'vapi',
    PRICING = 'pricing',
    LIMITS = 'limits',
    SYSTEM = 'system'
}

// Werttypen für Konfigurationen
export enum ConfigValueType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    JSON = 'json',
    SECRET = 'secret'  // Verschlüsselt gespeichert
}

@Entity('system_config')
export class SystemConfig {
    @PrimaryColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'varchar', length: 50 })
    category: ConfigCategory

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 100, name: 'config_key' })
    key: string

    @Column({ type: 'text', name: 'config_value' })
    value: string

    @Column({ type: 'varchar', length: 20, name: 'value_type', default: ConfigValueType.STRING })
    valueType: ConfigValueType

    @Column({ type: 'boolean', name: 'is_encrypted', default: false })
    isEncrypted: boolean

    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string

    @Column({ type: 'varchar', length: 255, name: 'display_name', nullable: true })
    displayName: string

    @Column({ type: 'boolean', name: 'is_required', default: false })
    isRequired: boolean

    @Column({ type: 'varchar', length: 255, name: 'default_value', nullable: true })
    defaultValue: string

    @Column({ type: 'varchar', length: 36, name: 'updated_by', nullable: true })
    updatedBy: string

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
    updatedAt: Date
}

/**
 * Verschlüsselungs-Utilities für sensible Konfigurationswerte
 */
export class ConfigEncryption {
    private static algorithm = 'aes-256-gcm'
    private static keyLength = 32
    private static ivLength = 16
    private static tagLength = 16

    /**
     * Ermittelt den Verschlüsselungs-Key aus der Umgebungsvariable
     */
    private static getEncryptionKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY || process.env.PASSPHRASE || process.env.JWT_SECRET
        if (!key) {
            throw new Error('Kein Verschlüsselungs-Key konfiguriert (ENCRYPTION_KEY, PASSPHRASE oder JWT_SECRET)')
        }
        // Key auf 32 Bytes normalisieren
        return crypto.createHash('sha256').update(key).digest()
    }

    /**
     * Verschlüsselt einen Wert
     */
    public static encrypt(plaintext: string): string {
        const key = this.getEncryptionKey()
        const iv = crypto.randomBytes(this.ivLength)
        
        const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM
        let encrypted = cipher.update(plaintext, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        const authTag = cipher.getAuthTag()
        
        // Format: iv:authTag:encryptedData (alle als Hex)
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    }

    /**
     * Entschlüsselt einen Wert
     */
    public static decrypt(encryptedValue: string): string {
        const key = this.getEncryptionKey()
        const parts = encryptedValue.split(':')
        
        if (parts.length !== 3) {
            throw new Error('Ungültiges verschlüsseltes Format')
        }

        const iv = Buffer.from(parts[0], 'hex')
        const authTag = Buffer.from(parts[1], 'hex')
        const encryptedData = parts[2]

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as crypto.DecipherGCM
        decipher.setAuthTag(authTag)
        
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        
        return decrypted
    }

    /**
     * Prüft ob ein Wert bereits verschlüsselt ist
     */
    public static isEncrypted(value: string): boolean {
        const parts = value.split(':')
        if (parts.length !== 3) return false
        
        // Prüfe ob alle Teile gültige Hex-Strings sind
        return parts.every(part => /^[0-9a-fA-F]+$/.test(part))
    }

    /**
     * Maskiert einen Wert für die Anzeige (zeigt nur die letzten 4 Zeichen)
     */
    public static mask(value: string): string {
        if (!value || value.length < 8) return '••••••••'
        return '••••••••' + value.slice(-4)
    }
}

/**
 * Standard-Konfigurationen für die Initialisierung
 */
export const DEFAULT_CONFIGS: Array<{
    category: ConfigCategory
    key: string
    displayName: string
    description: string
    valueType: ConfigValueType
    defaultValue?: string
    isRequired: boolean
}> = [
    // === LLM Konfiguration ===
    {
        category: ConfigCategory.LLM,
        key: 'openrouter_api_key',
        displayName: 'OpenRouter API Key',
        description: 'API-Schlüssel für OpenRouter (beginnt mit sk-or-)',
        valueType: ConfigValueType.SECRET,
        isRequired: true
    },
    {
        category: ConfigCategory.LLM,
        key: 'openrouter_base_url',
        displayName: 'OpenRouter Base URL',
        description: 'API-Endpunkt für OpenRouter',
        valueType: ConfigValueType.STRING,
        defaultValue: 'https://openrouter.ai/api/v1',
        isRequired: false
    },
    {
        category: ConfigCategory.LLM,
        key: 'default_model',
        displayName: 'Standard-Modell',
        description: 'Das Standardmodell für LLM-Anfragen',
        valueType: ConfigValueType.STRING,
        defaultValue: 'moonshotai/kimi-k2',
        isRequired: true
    },
    {
        category: ConfigCategory.LLM,
        key: 'fallback_model',
        displayName: 'Fallback-Modell',
        description: 'Modell bei Nichtverfügbarkeit des Standard-Modells',
        valueType: ConfigValueType.STRING,
        defaultValue: 'qwen/qwen3-max',
        isRequired: false
    },
    {
        category: ConfigCategory.LLM,
        key: 'max_retries',
        displayName: 'Max. Wiederholungen',
        description: 'Maximale Anzahl Wiederholungen bei Fehlern',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '3',
        isRequired: false
    },
    {
        category: ConfigCategory.LLM,
        key: 'timeout_ms',
        displayName: 'Timeout (ms)',
        description: 'Timeout für LLM-Anfragen in Millisekunden',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '30000',
        isRequired: false
    },

    // === VAPI Konfiguration ===
    {
        category: ConfigCategory.VAPI,
        key: 'vapi_api_key',
        displayName: 'VAPI API Key',
        description: 'API-Schlüssel für VAPI Voice-Integration',
        valueType: ConfigValueType.SECRET,
        isRequired: true
    },
    {
        category: ConfigCategory.VAPI,
        key: 'vapi_webhook_secret',
        displayName: 'VAPI Webhook Secret',
        description: 'Secret zur Validierung von VAPI-Webhooks',
        valueType: ConfigValueType.SECRET,
        isRequired: false
    },
    {
        category: ConfigCategory.VAPI,
        key: 'vapi_default_voice',
        displayName: 'Standard-Stimme',
        description: 'Standard-Stimme für Voice-Agenten',
        valueType: ConfigValueType.STRING,
        defaultValue: 'minimax',
        isRequired: false
    },

    // === Pricing Konfiguration ===
    {
        category: ConfigCategory.PRICING,
        key: 'token_margin_percent',
        displayName: 'Token-Marge (%)',
        description: 'Aufschlag auf Token-Kosten in Prozent',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '40',
        isRequired: true
    },
    {
        category: ConfigCategory.PRICING,
        key: 'voice_margin_percent',
        displayName: 'Voice-Marge (%)',
        description: 'Aufschlag auf Voice-Kosten in Prozent',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '30',
        isRequired: true
    },
    {
        category: ConfigCategory.PRICING,
        key: 'voice_inbound_price',
        displayName: 'Eingehende Anrufe (EUR/Min)',
        description: 'Preis pro Minute für eingehende Anrufe',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '0.08',
        isRequired: true
    },
    {
        category: ConfigCategory.PRICING,
        key: 'voice_outbound_price',
        displayName: 'Ausgehende Anrufe (EUR/Min)',
        description: 'Preis pro Minute für ausgehende Anrufe',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '0.12',
        isRequired: true
    },
    {
        category: ConfigCategory.PRICING,
        key: 'phone_number_monthly',
        displayName: 'Telefonnummer (EUR/Monat)',
        description: 'Monatliche Gebühr pro Telefonnummer',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '5.00',
        isRequired: false
    },

    // === Limits Konfiguration ===
    {
        category: ConfigCategory.LIMITS,
        key: 'initial_credits',
        displayName: 'Start-Guthaben (Cents)',
        description: 'Initiales Guthaben für neue Benutzer in Cents',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '1000',
        isRequired: true
    },
    {
        category: ConfigCategory.LIMITS,
        key: 'rate_limit_requests',
        displayName: 'Rate-Limit (Anfragen)',
        description: 'Maximale Anfragen pro Zeitfenster',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '100',
        isRequired: false
    },
    {
        category: ConfigCategory.LIMITS,
        key: 'rate_limit_window_ms',
        displayName: 'Rate-Limit Zeitfenster (ms)',
        description: 'Zeitfenster für Rate-Limiting in Millisekunden',
        valueType: ConfigValueType.NUMBER,
        defaultValue: '60000',
        isRequired: false
    },
    {
        category: ConfigCategory.LIMITS,
        key: 'volume_discounts',
        displayName: 'Volumen-Rabatte',
        description: 'JSON-Konfiguration für Volumen-Rabatte',
        valueType: ConfigValueType.JSON,
        defaultValue: JSON.stringify({
            token: [
                { minTokens: 0, discount: 0 },
                { minTokens: 100000, discount: 5 },
                { minTokens: 500000, discount: 10 },
                { minTokens: 1000000, discount: 15 },
                { minTokens: 5000000, discount: 20 }
            ],
            voice: [
                { minMinutes: 0, discount: 0 },
                { minMinutes: 60, discount: 5 },
                { minMinutes: 300, discount: 10 },
                { minMinutes: 1000, discount: 15 },
                { minMinutes: 5000, discount: 20 }
            ]
        }),
        isRequired: false
    }
]
