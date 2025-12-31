/**
 * M.A.T.E. Masking Engine (G6)
 * 
 * Zentrale Engine für die Maskierung sensibler Daten:
 * - Verschiedene Maskierungsstile (Asterisk, Redact, Hash, Partial, Placeholder)
 * - Konfigurierbare Regeln pro Datentyp
 * - Reversible Token-Maskierung (für Debugging)
 * - Format-erhaltende Maskierung
 */

import { v4 as uuidv4 } from 'uuid'
import {
    MaskingStyle,
    MaskingRule,
    MaskingResult,
    DetectionCategory
} from './types'

interface MaskingConfig {
    enabled: boolean
    defaultStyle: MaskingStyle
    rules: MaskingRule[]
}

interface TokenStore {
    token: string
    original: string
    type: string
    category: DetectionCategory
    timestamp: Date
}

/**
 * Singleton MaskingEngine
 */
export class MaskingEngine {
    private static instance: MaskingEngine
    private config: MaskingConfig
    private rules: Map<string, MaskingRule>
    
    // Token-Store für reversible Maskierung (nur im Debug-Modus)
    private tokenStore: Map<string, TokenStore>
    private debugMode: boolean

    private constructor() {
        this.config = {
            enabled: true,
            defaultStyle: MaskingStyle.PARTIAL,
            rules: []
        }
        this.rules = new Map()
        this.tokenStore = new Map()
        this.debugMode = process.env.GUARDRAILS_DEBUG_MODE === 'true'
        
        this.initializeDefaultRules()
    }

    public static getInstance(): MaskingEngine {
        if (!MaskingEngine.instance) {
            MaskingEngine.instance = new MaskingEngine()
        }
        return MaskingEngine.instance
    }

    /**
     * Konfiguriert die MaskingEngine
     */
    public configure(config: Partial<MaskingConfig>): void {
        this.config = { ...this.config, ...config }
        
        // Regeln aktualisieren
        if (config.rules) {
            for (const rule of config.rules) {
                this.rules.set(`${rule.category}:${rule.type}`, rule)
            }
        }
    }

    /**
     * Initialisiert Standard-Maskierungsregeln
     */
    private initializeDefaultRules(): void {
        const defaultRules: MaskingRule[] = [
            // PII
            { type: 'email', category: DetectionCategory.PII, style: MaskingStyle.PARTIAL, preservePrefix: 1, preserveSuffix: 1 },
            { type: 'phone', category: DetectionCategory.PII, style: MaskingStyle.PARTIAL, preservePrefix: 3, preserveSuffix: 2 },
            { type: 'ssn', category: DetectionCategory.PII, style: MaskingStyle.REDACT, placeholder: '[SSN]' },
            { type: 'name', category: DetectionCategory.PII, style: MaskingStyle.PARTIAL, preservePrefix: 1 },
            
            // Credentials
            { type: 'api_key', category: DetectionCategory.CREDENTIALS, style: MaskingStyle.REDACT, placeholder: '[API_KEY]' },
            { type: 'password', category: DetectionCategory.CREDENTIALS, style: MaskingStyle.REDACT, placeholder: '[PASSWORD]' },
            { type: 'token', category: DetectionCategory.CREDENTIALS, style: MaskingStyle.REDACT, placeholder: '[TOKEN]' },
            { type: 'private_key', category: DetectionCategory.CREDENTIALS, style: MaskingStyle.REDACT, placeholder: '[PRIVATE_KEY]' },
            
            // Financial
            { type: 'credit_card', category: DetectionCategory.FINANCIAL, style: MaskingStyle.PARTIAL, preserveSuffix: 4 },
            { type: 'iban', category: DetectionCategory.FINANCIAL, style: MaskingStyle.PARTIAL, preservePrefix: 4, preserveSuffix: 2 },
            { type: 'cvv', category: DetectionCategory.FINANCIAL, style: MaskingStyle.ASTERISK },
            
            // Health
            { type: 'diagnosis', category: DetectionCategory.HEALTH, style: MaskingStyle.REDACT, placeholder: '[DIAGNOSIS]' },
            { type: 'medication', category: DetectionCategory.HEALTH, style: MaskingStyle.REDACT, placeholder: '[MEDICATION]' },
            { type: 'lab_value', category: DetectionCategory.HEALTH, style: MaskingStyle.REDACT, placeholder: '[LAB_VALUE]' }
        ]

        for (const rule of defaultRules) {
            this.rules.set(`${rule.category}:${rule.type}`, rule)
        }
    }

    /**
     * Hauptmethode: Maskiert einen Wert
     */
    public mask(value: string, type: string, category: DetectionCategory): MaskingResult {
        if (!this.config.enabled || !value) {
            return {
                original: value,
                masked: value,
                masksApplied: []
            }
        }

        // Regel suchen
        const rule = this.getRule(type, category)
        const style = rule?.style || this.config.defaultStyle

        let masked: string

        switch (style) {
            case MaskingStyle.ASTERISK:
                masked = this.maskAsterisk(value, rule)
                break
            
            case MaskingStyle.REDACT:
                masked = this.maskRedact(value, rule)
                break
            
            case MaskingStyle.HASH:
                masked = this.maskHash(value)
                break
            
            case MaskingStyle.PARTIAL:
                masked = this.maskPartial(value, rule)
                break
            
            case MaskingStyle.PLACEHOLDER:
                masked = this.maskPlaceholder(value, rule)
                break
            
            case MaskingStyle.CUSTOM:
                masked = this.maskCustom(value, rule)
                break
            
            default:
                masked = this.maskPartial(value, rule)
        }

        // Debug-Token speichern
        if (this.debugMode) {
            this.storeToken(value, masked, type, category)
        }

        return {
            original: value,
            masked,
            masksApplied: [{
                type,
                original: value,
                masked,
                position: { start: 0, end: value.length }
            }]
        }
    }

    /**
     * Maskiert mit Sternchen
     */
    private maskAsterisk(value: string, rule?: MaskingRule): string {
        if (rule?.preserveLength) {
            return '*'.repeat(value.length)
        }
        
        // Standard: 8 Sternchen
        return '********'
    }

    /**
     * Ersetzt durch [REDACTED] oder benutzerdefinierten Placeholder
     */
    private maskRedact(value: string, rule?: MaskingRule): string {
        return rule?.placeholder || '[REDACTED]'
    }

    /**
     * Maskiert mit Hash-Zeichen
     */
    private maskHash(value: string): string {
        const length = Math.min(value.length, 16)
        return '[' + '#'.repeat(length) + ']'
    }

    /**
     * Partielle Maskierung - behält Anfang/Ende
     */
    private maskPartial(value: string, rule?: MaskingRule): string {
        const len = value.length
        const prefix = rule?.preservePrefix || 0
        const suffix = rule?.preserveSuffix || 0

        // Sonderfälle für kurze Werte
        if (len <= prefix + suffix) {
            return '*'.repeat(len)
        }

        const maskLength = len - prefix - suffix
        const maskChar = '*'

        const prefixPart = prefix > 0 ? value.slice(0, prefix) : ''
        const suffixPart = suffix > 0 ? value.slice(-suffix) : ''
        const middlePart = maskChar.repeat(Math.max(3, maskLength))

        return prefixPart + middlePart + suffixPart
    }

    /**
     * Ersetzt durch Typ-Placeholder
     */
    private maskPlaceholder(value: string, rule?: MaskingRule): string {
        if (rule?.placeholder) {
            return rule.placeholder
        }
        
        // Default-Placeholder basierend auf Typ generieren
        return `[${rule?.type?.toUpperCase() || 'DATA'}]`
    }

    /**
     * Benutzerdefinierte Maskierung (erweiterbar)
     */
    private maskCustom(value: string, rule?: MaskingRule): string {
        // Fallback zu Partial
        return this.maskPartial(value, rule)
    }

    /**
     * Sucht passende Regel
     */
    private getRule(type: string, category: DetectionCategory): MaskingRule | undefined {
        // Exakte Suche
        const exactKey = `${category}:${type}`
        if (this.rules.has(exactKey)) {
            return this.rules.get(exactKey)
        }

        // Wildcard-Suche (category:*)
        const wildcardKey = `${category}:*`
        if (this.rules.has(wildcardKey)) {
            return this.rules.get(wildcardKey)
        }

        // Typ-basierte Suche (für generische Typen)
        for (const [key, rule] of this.rules) {
            if (type.includes(rule.type) || rule.type.includes(type)) {
                return rule
            }
        }

        return undefined
    }

    // ==================== SPEZIELLE MASKIERUNGEN ====================

    /**
     * E-Mail-spezifische Maskierung
     * user@example.com → u***r@e***e.com
     */
    public maskEmail(email: string): string {
        const parts = email.split('@')
        if (parts.length !== 2) return this.maskPartial(email)

        const [local, domain] = parts
        const maskedLocal = this.maskPartial(local, { 
            type: 'email_local', 
            category: DetectionCategory.PII, 
            style: MaskingStyle.PARTIAL,
            preservePrefix: 1, 
            preserveSuffix: 1 
        })

        const domainParts = domain.split('.')
        if (domainParts.length >= 2) {
            const maskedDomain = domainParts[0][0] + '***' + '.' + domainParts.slice(-1)[0]
            return `${maskedLocal}@${maskedDomain}`
        }

        return `${maskedLocal}@***`
    }

    /**
     * Kreditkarten-spezifische Maskierung
     * 4111111111111111 → ****-****-****-1111
     */
    public maskCreditCard(cardNumber: string): string {
        const digits = cardNumber.replace(/\D/g, '')
        const last4 = digits.slice(-4)
        
        if (cardNumber.includes(' ')) {
            return `**** **** **** ${last4}`
        }
        if (cardNumber.includes('-')) {
            return `****-****-****-${last4}`
        }
        return `************${last4}`
    }

    /**
     * IBAN-spezifische Maskierung
     * DE89370400440532013000 → DE** **** **** **** ****00
     */
    public maskIBAN(iban: string): string {
        const clean = iban.replace(/\s/g, '')
        const countryCode = clean.slice(0, 2)
        const last2 = clean.slice(-2)
        
        if (iban.includes(' ')) {
            return `${countryCode}** **** **** **** ****${last2}`
        }
        return `${countryCode}${'*'.repeat(clean.length - 4)}${last2}`
    }

    /**
     * Telefonnummer-spezifische Maskierung
     * +491234567890 → +49 *** ***7890
     */
    public maskPhone(phone: string): string {
        const digits = phone.replace(/\D/g, '')
        
        if (phone.startsWith('+')) {
            const countryCode = phone.slice(0, 3)
            const last4 = digits.slice(-4)
            return `${countryCode} *** ***${last4}`
        }
        
        if (phone.startsWith('0')) {
            const prefix = phone.slice(0, 4)
            const last4 = digits.slice(-4)
            return `${prefix} ***${last4}`
        }
        
        return phone.slice(0, 3) + '***' + phone.slice(-4)
    }

    // ==================== TOKEN MANAGEMENT (DEBUG) ====================

    /**
     * Speichert Token für reversible Maskierung (nur Debug-Modus)
     */
    private storeToken(original: string, masked: string, type: string, category: DetectionCategory): void {
        const token = 'TOK_' + uuidv4().slice(0, 8)
        
        this.tokenStore.set(token, {
            token,
            original,
            type,
            category,
            timestamp: new Date()
        })

        // Alte Tokens bereinigen (max 1000)
        if (this.tokenStore.size > 1000) {
            const oldest = Array.from(this.tokenStore.entries())
                .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
                .slice(0, 500)
            
            for (const [key] of oldest) {
                this.tokenStore.delete(key)
            }
        }
    }

    /**
     * Löst Token auf (nur Debug-Modus)
     */
    public resolveToken(token: string): string | null {
        if (!this.debugMode) return null
        
        const stored = this.tokenStore.get(token)
        return stored?.original || null
    }

    /**
     * Löscht alle gespeicherten Tokens
     */
    public clearTokens(): void {
        this.tokenStore.clear()
    }

    // ==================== BATCH OPERATIONS ====================

    /**
     * Maskiert alle Matches in einem Text
     */
    public maskAll(
        text: string,
        matches: Array<{
            value: string
            type: string
            category: DetectionCategory
            startIndex: number
            endIndex: number
        }>
    ): MaskingResult {
        // Nach Position sortieren (absteigend)
        const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex)
        
        let maskedText = text
        const masksApplied: MaskingResult['masksApplied'] = []

        for (const match of sortedMatches) {
            const maskResult = this.mask(match.value, match.type, match.category)
            
            maskedText = 
                maskedText.slice(0, match.startIndex) + 
                maskResult.masked + 
                maskedText.slice(match.endIndex)
            
            masksApplied.push({
                type: match.type,
                original: match.value,
                masked: maskResult.masked,
                position: { start: match.startIndex, end: match.endIndex }
            })
        }

        return {
            original: text,
            masked: maskedText,
            masksApplied
        }
    }

    // ==================== UTILITIES ====================

    /**
     * Fügt benutzerdefinierte Regel hinzu
     */
    public addRule(rule: MaskingRule): void {
        this.rules.set(`${rule.category}:${rule.type}`, rule)
    }

    /**
     * Entfernt Regel
     */
    public removeRule(type: string, category: DetectionCategory): boolean {
        return this.rules.delete(`${category}:${type}`)
    }

    /**
     * Gibt alle konfigurierten Regeln zurück
     */
    public getRules(): MaskingRule[] {
        return Array.from(this.rules.values())
    }

    /**
     * Prüft ob Wert bereits maskiert ist
     */
    public isMasked(value: string): boolean {
        // Prüfe auf typische Maskierungsmuster
        return (
            value.includes('***') ||
            value.includes('[REDACTED]') ||
            /^\[.+\]$/.test(value) ||
            /^\*+$/.test(value) ||
            /^\*{4}[- ]\*{4}[- ]\*{4}[- ]\d{4}$/.test(value)
        )
    }

    /**
     * Aktiviert/Deaktiviert Maskierung
     */
    public setEnabled(enabled: boolean): void {
        this.config.enabled = enabled
    }

    /**
     * Status-Check
     */
    public isEnabled(): boolean {
        return this.config.enabled
    }
}
