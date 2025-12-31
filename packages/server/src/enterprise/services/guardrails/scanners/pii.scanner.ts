/**
 * M.A.T.E. PII Scanner (G2)
 * 
 * Scanner für personenbezogene Daten (Personally Identifiable Information):
 * - E-Mail-Adressen
 * - Telefonnummern (DE + international)
 * - SSN / Sozialversicherungsnummern
 * - Namen (mit Kontextanalyse)
 * - Adressen
 * - Geburtsdaten
 * - Personalausweisnummern
 */

import { BaseScanner } from './base.scanner'
import { DetectionCategory, SeverityLevel } from '../types'

export class PIIScanner extends BaseScanner {
    readonly name = 'PII Scanner'
    readonly category = DetectionCategory.PII
    readonly version = '1.0.0'

    constructor() {
        super()
        this.initializePatterns()
    }

    private initializePatterns(): void {
        // ==================== E-MAIL ====================
        this.patterns.set('email', {
            regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== TELEFON ====================
        
        // Deutsche Telefonnummern
        this.patterns.set('phone_de', {
            regex: /(?:\+49|0049|0)[1-9][0-9]{1,4}[-\s]?[0-9]{3,10}/g,
            severity: SeverityLevel.HIGH
        })

        // Internationale Telefonnummern
        this.patterns.set('phone_intl', {
            regex: /\+?[1-9][0-9]{7,14}/g,
            severity: SeverityLevel.MEDIUM
        })

        // US-Telefonnummern (XXX) XXX-XXXX
        this.patterns.set('phone_us', {
            regex: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
            severity: SeverityLevel.HIGH
        })

        // ==================== SOZIALVERSICHERUNG ====================
        
        // US Social Security Number (SSN)
        this.patterns.set('ssn_us', {
            regex: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // Deutsche Sozialversicherungsnummer (12 Stellen)
        this.patterns.set('sozvers_de', {
            regex: /\b[0-9]{2}[0-9]{6}[A-Z][0-9]{3}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // Deutsche Steuer-ID (11 Stellen)
        this.patterns.set('steuer_id_de', {
            regex: /\b[0-9]{11}\b/g,
            severity: SeverityLevel.HIGH
        })

        // ==================== ADRESSEN ====================
        
        // Deutsche Straßenadresse
        this.patterns.set('street_de', {
            regex: /\b[A-Za-zäöüÄÖÜß]+(?:straße|strasse|str\.|weg|platz|allee|gasse)\s*[0-9]+[a-zA-Z]?\b/gi,
            severity: SeverityLevel.MEDIUM
        })

        // Deutsche Postleitzahl
        this.patterns.set('postal_de', {
            regex: /\b[0-9]{5}\b/g,
            severity: SeverityLevel.LOW
        })

        // US-Postleitzahl (ZIP)
        this.patterns.set('zip_us', {
            regex: /\b[0-9]{5}(?:-[0-9]{4})?\b/g,
            severity: SeverityLevel.LOW
        })

        // ==================== GEBURTSDATUM ====================
        
        // Datum (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD)
        this.patterns.set('date_birth', {
            regex: /\b(?:0[1-9]|[12][0-9]|3[01])[./-](?:0[1-9]|1[0-2])[./-](?:19|20)\d{2}\b|\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12][0-9]|3[01])\b/g,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== AUSWEISNUMMERN ====================
        
        // Deutscher Personalausweis (9 alphanumerisch)
        this.patterns.set('perso_de', {
            regex: /\b[A-Z0-9]{9}\b/g,
            severity: SeverityLevel.HIGH
        })

        // Deutscher Reisepass (9 alphanumerisch)
        this.patterns.set('passport_de', {
            regex: /\b[CFGHJKLMNPRTVWXYZ][0-9A-Z]{8}\b/g,
            severity: SeverityLevel.HIGH
        })

        // ==================== NAMEN (mit Kontext) ====================
        
        // Namens-Kontextmuster (nach "Name:", "Herr/Frau", etc.)
        this.patterns.set('name_context', {
            regex: /(?:(?:Name|Vorname|Nachname|Familienname|Ansprechpartner)[\s:]+|(?:Herr|Frau|Dr\.|Prof\.|Hr\.|Fr\.)\s+)([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+){1,3})/gi,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== IP-ADRESSEN ====================
        
        this.patterns.set('ip_address', {
            regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
            severity: SeverityLevel.MEDIUM
        })

        // IPv6 (vereinfacht)
        this.patterns.set('ipv6_address', {
            regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== BENUTZERNAMEN ====================
        
        this.patterns.set('username_context', {
            regex: /(?:(?:user|username|benutzer|nutzer|login)[\s:=]+)([a-zA-Z0-9_-]{3,30})/gi,
            severity: SeverityLevel.LOW
        })
    }

    /**
     * Maskiert PII-Werte basierend auf Typ
     */
    protected maskValue(value: string, type: string): string {
        const length = value.length

        switch (type) {
            case 'email':
                return this.maskEmail(value)
            
            case 'phone_de':
            case 'phone_intl':
            case 'phone_us':
                return this.maskPhone(value)
            
            case 'ssn_us':
            case 'sozvers_de':
                return '***-**-' + value.slice(-4).replace(/[0-9A-Z]/g, '*')
            
            case 'steuer_id_de':
                return '*******' + value.slice(-4)
            
            case 'street_de':
                // Ersten Buchstaben behalten, Rest maskieren
                return value[0] + '*'.repeat(length - 3) + value.slice(-2)
            
            case 'postal_de':
            case 'zip_us':
                return value.slice(0, 2) + '***'
            
            case 'date_birth':
                // Tag/Monat maskieren, Jahr behalten
                const yearMatch = value.match(/(?:19|20)\d{2}/)
                if (yearMatch) {
                    return '**.**.****'
                }
                return '*'.repeat(length)
            
            case 'perso_de':
            case 'passport_de':
                return value.slice(0, 2) + '*'.repeat(length - 4) + value.slice(-2)
            
            case 'name_context':
                return this.maskName(value)
            
            case 'ip_address':
                return value.split('.').map((_, i) => i < 2 ? _ : '***').join('.')
            
            case 'ipv6_address':
                return '[REDACTED_IPv6]'
            
            case 'username_context':
                return value.slice(0, 2) + '*'.repeat(Math.max(3, length - 4)) + value.slice(-2)
            
            default:
                if (length <= 4) return '*'.repeat(length)
                return value.slice(0, 2) + '*'.repeat(length - 4) + value.slice(-2)
        }
    }

    /**
     * Maskiert E-Mail-Adresse
     */
    private maskEmail(email: string): string {
        const parts = email.split('@')
        if (parts.length !== 2) return '[REDACTED_EMAIL]'
        
        const [local, domain] = parts
        const maskedLocal = local.length > 2 
            ? local[0] + '*'.repeat(local.length - 2) + local.slice(-1)
            : '*'.repeat(local.length)
        
        const domainParts = domain.split('.')
        const maskedDomain = domainParts.length > 1
            ? domainParts[0][0] + '***.' + domainParts.slice(-1)[0]
            : '***.' + domain
        
        return `${maskedLocal}@${maskedDomain}`
    }

    /**
     * Maskiert Telefonnummer
     */
    private maskPhone(phone: string): string {
        // Präfix behalten (Ländercode)
        const cleaned = phone.replace(/[\s-]/g, '')
        
        if (cleaned.startsWith('+')) {
            // +49 123 *** **45
            const prefix = cleaned.slice(0, 3)
            const suffix = cleaned.slice(-2)
            return `${prefix} *** ***${suffix}`
        }
        
        if (cleaned.startsWith('0')) {
            // 0123 *** **45
            const prefix = cleaned.slice(0, 4)
            const suffix = cleaned.slice(-2)
            return `${prefix} ***${suffix}`
        }
        
        return phone.slice(0, 3) + '***' + phone.slice(-2)
    }

    /**
     * Maskiert Namen
     */
    private maskName(name: string): string {
        const parts = name.trim().split(/\s+/)
        
        return parts.map(part => {
            if (part.length <= 2) return part
            return part[0] + '*'.repeat(part.length - 1)
        }).join(' ')
    }

    /**
     * Berechnet Konfidenz für Match
     */
    protected calculateConfidence(value: string, type: string): number {
        switch (type) {
            case 'email':
                // Höhere Konfidenz bei bekannten Domains
                if (/@(gmail|yahoo|outlook|hotmail|gmx|web)\./i.test(value)) {
                    return 0.99
                }
                return 0.95
            
            case 'phone_de':
            case 'phone_us':
                // Höhere Konfidenz bei vollständigen Nummern
                if (value.replace(/\D/g, '').length >= 10) {
                    return 0.95
                }
                return 0.7
            
            case 'ssn_us':
            case 'sozvers_de':
                return 0.98
            
            case 'date_birth':
                // Geringere Konfidenz - könnte auch anderes Datum sein
                return 0.6
            
            case 'postal_de':
            case 'zip_us':
                // Geringere Konfidenz - viele Zahlenfolgen
                return 0.5
            
            case 'name_context':
                // Mittlere Konfidenz - Kontext hilft
                return 0.75
            
            default:
                return 0.8
        }
    }

    /**
     * Prüft ob ein spezifischer PII-Typ im Text vorhanden ist
     */
    public hasType(text: string, type: string): boolean {
        const patternConfig = this.patterns.get(type)
        if (!patternConfig) return false
        
        return patternConfig.regex.test(text)
    }

    /**
     * Extrahiert alle E-Mails aus Text (für spezielle Anwendungsfälle)
     */
    public extractEmails(text: string): string[] {
        const emailPattern = this.patterns.get('email')
        if (!emailPattern) return []
        
        const matches = text.match(emailPattern.regex)
        return matches || []
    }

    /**
     * Extrahiert alle Telefonnummern aus Text
     */
    public extractPhones(text: string): string[] {
        const phones: string[] = []
        
        for (const [type, config] of this.patterns) {
            if (type.startsWith('phone_')) {
                const matches = text.match(config.regex)
                if (matches) phones.push(...matches)
            }
        }
        
        return [...new Set(phones)] // Duplikate entfernen
    }
}
