import logger from '../../utils/logger'

/**
 * M.A.T.E. Security Service
 * 
 * Zentraler Service für Sicherheitsfunktionen:
 * - PII (Personally Identifiable Information) Detection
 * - Input Sanitization
 * - Prompt Injection Detection
 * - Content Moderation
 * 
 * Konfiguration:
 * - SECURITY_PII_DETECTION_ENABLED: PII-Erkennung aktivieren (default: true)
 * - SECURITY_PROMPT_INJECTION_ENABLED: Prompt-Injection-Schutz (default: true)
 * - SECURITY_LOG_DETECTED_THREATS: Erkannte Bedrohungen loggen (default: true)
 */

// PII-Muster für verschiedene Datentypen
const PII_PATTERNS = {
    // Deutsche Formate
    germanPhone: /(\+49|0049|0)[1-9][0-9]{1,4}[-\s]?[0-9]{3,10}/g,
    germanIBAN: /DE[0-9]{2}[\s]?([0-9]{4}[\s]?){4}[0-9]{2}/gi,
    germanTaxId: /\b[0-9]{2}[\s]?[0-9]{3}[\s]?[0-9]{5}\b/g,
    
    // Internationale Formate
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /\+?[1-9][0-9]{7,14}/g,
    creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    ssn: /\b[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}\b/g,
    ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    
    // Adressen und Namen (weniger zuverlässig, nur für Warnung)
    streetAddress: /\b[A-Za-zäöüÄÖÜß]+(?:straße|strasse|str\.|weg|platz|allee|gasse)\s*[0-9]+[a-zA-Z]?\b/gi,
    postalCode: /\b[0-9]{5}\b/g,
    
    // Passwörter und Secrets (in Logs)
    apiKey: /\b(sk-|pk-|api[_-]?key|secret|password|token)[_-]?[a-zA-Z0-9]{20,}\b/gi,
    bearer: /Bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/gi
} as const

// Prompt Injection Patterns
const INJECTION_PATTERNS = [
    // Direktive Anweisungen
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|commands)/i,
    /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|commands)/i,
    /forget\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|commands)/i,
    
    // System-Prompt-Manipulation
    /you\s+are\s+now\s+(a|an)\s+/i,
    /new\s+instructions?:\s*/i,
    /system\s+prompt:\s*/i,
    /\[system\]/i,
    /\[assistant\]/i,
    /\[user\]/i,
    
    // Jailbreak-Versuche
    /do\s+anything\s+now/i,
    /dan\s+mode/i,
    /developer\s+mode/i,
    /jailbreak/i,
    /bypass\s+(filter|restriction|safety)/i,
    
    // Code-Injection
    /<script[\s>]/i,
    /javascript:/i,
    /on(load|error|click)\s*=/i,
    
    // Rollenspiel-Manipulation
    /pretend\s+(you\s+are|to\s+be)/i,
    /act\s+as\s+(if\s+you\s+are|a)/i,
    /roleplay\s+as/i
] as const

// Gefährliche Wörter für Content Moderation
const DANGEROUS_CONTENT = [
    // Gewalt
    /\b(kill|murder|attack|bomb|weapon|gun|shoot)\b/i,
    // Illegale Aktivitäten
    /\b(hack|crack|steal|fraud|illegal|smuggle)\b/i,
    // Selbstverletzung (mit Kontext)
    /\b(suicide|self-harm|kill\s+myself)\b/i
] as const

export interface PIIDetectionResult {
    hasPII: boolean
    types: string[]
    matches: Array<{
        type: string
        value: string
        masked: string
    }>
    sanitizedText: string
}

export interface InjectionDetectionResult {
    isInjection: boolean
    confidence: 'high' | 'medium' | 'low' | 'none'
    patterns: string[]
    recommendation: 'block' | 'warn' | 'allow'
}

export interface ContentModerationResult {
    isSafe: boolean
    categories: string[]
    recommendation: 'block' | 'warn' | 'allow'
}

class SecurityService {
    private static instance: SecurityService
    private piiEnabled: boolean
    private injectionEnabled: boolean
    private logThreats: boolean

    private constructor() {
        this.piiEnabled = process.env.SECURITY_PII_DETECTION_ENABLED !== 'false'
        this.injectionEnabled = process.env.SECURITY_PROMPT_INJECTION_ENABLED !== 'false'
        this.logThreats = process.env.SECURITY_LOG_DETECTED_THREATS !== 'false'
    }

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService()
        }
        return SecurityService.instance
    }

    // ==================== PII DETECTION ====================

    /**
     * Erkennt PII in Text und gibt maskierte Version zurück
     */
    public detectPII(text: string): PIIDetectionResult {
        if (!this.piiEnabled || !text) {
            return {
                hasPII: false,
                types: [],
                matches: [],
                sanitizedText: text || ''
            }
        }

        const matches: PIIDetectionResult['matches'] = []
        let sanitizedText = text

        for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
            const regex = new RegExp(pattern.source, pattern.flags)
            let match: RegExpExecArray | null

            while ((match = regex.exec(text)) !== null) {
                const value = match[0]
                const masked = this.maskPII(value, type)
                
                matches.push({ type, value, masked })
                sanitizedText = sanitizedText.replace(value, masked)
            }
        }

        const types = [...new Set(matches.map(m => m.type))]
        const hasPII = matches.length > 0

        if (hasPII && this.logThreats) {
            logger.warn('[Security] PII erkannt', {
                types,
                count: matches.length
            })
        }

        return {
            hasPII,
            types,
            matches,
            sanitizedText
        }
    }

    /**
     * Maskiert PII-Werte je nach Typ
     */
    private maskPII(value: string, type: string): string {
        const length = value.length

        switch (type) {
            case 'email':
                const [local, domain] = value.split('@')
                return `${local[0]}***@${domain}`
            
            case 'phone':
            case 'germanPhone':
                return value.slice(0, 3) + '***' + value.slice(-2)
            
            case 'creditCard':
                return '****-****-****-' + value.slice(-4)
            
            case 'germanIBAN':
                return value.slice(0, 4) + ' **** **** **** **** ' + value.slice(-2)
            
            case 'apiKey':
            case 'bearer':
                return '[REDACTED_SECRET]'
            
            default:
                if (length <= 4) return '***'
                return value.slice(0, 2) + '*'.repeat(length - 4) + value.slice(-2)
        }
    }

    // ==================== PROMPT INJECTION DETECTION ====================

    /**
     * Erkennt Prompt-Injection-Versuche
     */
    public detectPromptInjection(text: string): InjectionDetectionResult {
        if (!this.injectionEnabled || !text) {
            return {
                isInjection: false,
                confidence: 'none',
                patterns: [],
                recommendation: 'allow'
            }
        }

        const detectedPatterns: string[] = []

        for (const pattern of INJECTION_PATTERNS) {
            if (pattern.test(text)) {
                detectedPatterns.push(pattern.source)
            }
        }

        const patternCount = detectedPatterns.length
        let confidence: InjectionDetectionResult['confidence'] = 'none'
        let recommendation: InjectionDetectionResult['recommendation'] = 'allow'

        if (patternCount >= 3) {
            confidence = 'high'
            recommendation = 'block'
        } else if (patternCount === 2) {
            confidence = 'medium'
            recommendation = 'warn'
        } else if (patternCount === 1) {
            confidence = 'low'
            recommendation = 'warn'
        }

        const isInjection = patternCount > 0

        if (isInjection && this.logThreats) {
            logger.warn('[Security] Prompt Injection erkannt', {
                confidence,
                patternCount,
                recommendation
            })
        }

        return {
            isInjection,
            confidence,
            patterns: detectedPatterns,
            recommendation
        }
    }

    // ==================== CONTENT MODERATION ====================

    /**
     * Prüft Inhalt auf gefährliche Themen
     */
    public moderateContent(text: string): ContentModerationResult {
        if (!text) {
            return {
                isSafe: true,
                categories: [],
                recommendation: 'allow'
            }
        }

        const categories: string[] = []

        for (const pattern of DANGEROUS_CONTENT) {
            if (pattern.test(text)) {
                // Kategorie aus Pattern-Kommentar extrahieren wäre ideal
                // Hier einfache Zuordnung
                if (/kill|murder|attack|bomb|weapon|gun|shoot/i.test(text)) {
                    categories.push('violence')
                }
                if (/hack|crack|steal|fraud|illegal|smuggle/i.test(text)) {
                    categories.push('illegal_activity')
                }
                if (/suicide|self-harm|kill\s+myself/i.test(text)) {
                    categories.push('self_harm')
                }
            }
        }

        const uniqueCategories = [...new Set(categories)]
        const isSafe = uniqueCategories.length === 0

        let recommendation: ContentModerationResult['recommendation'] = 'allow'
        if (uniqueCategories.includes('self_harm')) {
            recommendation = 'warn' // Wichtig: Nicht blockieren, aber Hilfe anbieten
        } else if (uniqueCategories.length > 0) {
            recommendation = 'warn'
        }

        if (!isSafe && this.logThreats) {
            logger.warn('[Security] Gefährlicher Inhalt erkannt', {
                categories: uniqueCategories,
                recommendation
            })
        }

        return {
            isSafe,
            categories: uniqueCategories,
            recommendation
        }
    }

    // ==================== INPUT SANITIZATION ====================

    /**
     * Sanitiert User-Input für sichere Verarbeitung
     */
    public sanitizeInput(input: string): string {
        if (!input) return ''

        let sanitized = input

        // HTML-Entities escapen
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')

        // Kontrollzeichen entfernen (außer Newlines und Tabs)
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

        // Excessive Whitespace normalisieren
        sanitized = sanitized.replace(/\s{10,}/g, '          ')

        // Null-Bytes entfernen
        sanitized = sanitized.replace(/\0/g, '')

        return sanitized
    }

    /**
     * Kombinierte Sicherheitsprüfung für LLM-Input
     */
    public validateLLMInput(input: string): {
        isValid: boolean
        sanitizedInput: string
        pii: PIIDetectionResult
        injection: InjectionDetectionResult
        moderation: ContentModerationResult
        shouldBlock: boolean
        warnings: string[]
    } {
        const sanitizedInput = this.sanitizeInput(input)
        const pii = this.detectPII(sanitizedInput)
        const injection = this.detectPromptInjection(sanitizedInput)
        const moderation = this.moderateContent(sanitizedInput)

        const warnings: string[] = []
        let shouldBlock = false

        if (pii.hasPII) {
            warnings.push(`PII erkannt: ${pii.types.join(', ')}`)
        }

        if (injection.isInjection) {
            warnings.push(`Prompt Injection erkannt (${injection.confidence})`)
            if (injection.recommendation === 'block') {
                shouldBlock = true
            }
        }

        if (!moderation.isSafe) {
            warnings.push(`Bedenklicher Inhalt: ${moderation.categories.join(', ')}`)
        }

        const isValid = !shouldBlock

        return {
            isValid,
            sanitizedInput: pii.sanitizedText, // PII-bereinigter Text
            pii,
            injection,
            moderation,
            shouldBlock,
            warnings
        }
    }
}

export const securityService = SecurityService.getInstance()
