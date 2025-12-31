/**
 * M.A.T.E. Financial Scanner (G4)
 * 
 * Scanner für finanzielle Daten:
 * - Kreditkartennummern (Visa, MasterCard, Amex, etc.)
 * - IBAN (International Bank Account Number)
 * - BIC/SWIFT Codes
 * - Bankleitzahlen (DE)
 * - Kontonummern
 * - Steuer-IDs
 */

import { BaseScanner } from './base.scanner'
import { DetectionCategory, SeverityLevel } from '../types'

export class FinancialScanner extends BaseScanner {
    readonly name = 'Financial Scanner'
    readonly category = DetectionCategory.FINANCIAL
    readonly version = '1.0.0'

    constructor() {
        super()
        this.initializePatterns()
    }

    private initializePatterns(): void {
        // ==================== KREDITKARTEN ====================
        
        // Visa (4xxx xxxx xxxx xxxx)
        this.patterns.set('cc_visa', {
            regex: /\b4[0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // MasterCard (5xxx oder 2xxx)
        this.patterns.set('cc_mastercard', {
            regex: /\b(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // American Express (34xx oder 37xx, 15 Ziffern)
        this.patterns.set('cc_amex', {
            regex: /\b3[47][0-9]{2}[\s-]?[0-9]{6}[\s-]?[0-9]{5}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // Discover (6011 oder 65xx)
        this.patterns.set('cc_discover', {
            regex: /\b(?:6011|65[0-9]{2})[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // Diners Club
        this.patterns.set('cc_diners', {
            regex: /\b3(?:0[0-5]|[68][0-9])[0-9][\s-]?[0-9]{6}[\s-]?[0-9]{4}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // JCB
        this.patterns.set('cc_jcb', {
            regex: /\b(?:2131|1800|35[0-9]{3})[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
            severity: SeverityLevel.CRITICAL
        })

        // Generic Credit Card (16 Ziffern)
        this.patterns.set('cc_generic', {
            regex: /\b[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
            severity: SeverityLevel.HIGH
        })

        // CVV/CVC (3-4 Ziffern mit Kontext)
        this.patterns.set('cvv', {
            regex: /(?:cvv|cvc|cvv2|cvc2|sicherheitscode|prüfziffer)[\s:=]*[0-9]{3,4}/gi,
            severity: SeverityLevel.CRITICAL
        })

        // ==================== IBAN ====================
        
        // Deutsche IBAN (DE + 20 Zeichen)
        this.patterns.set('iban_de', {
            regex: /\bDE[0-9]{2}[\s]?(?:[0-9]{4}[\s]?){4}[0-9]{2}\b/gi,
            severity: SeverityLevel.HIGH
        })

        // Internationale IBAN (2 Buchstaben + 2 Prüfziffern + bis zu 30 alphanumerisch)
        this.patterns.set('iban_intl', {
            regex: /\b[A-Z]{2}[0-9]{2}[\s]?(?:[A-Z0-9]{4}[\s]?){2,7}[A-Z0-9]{0,2}\b/g,
            severity: SeverityLevel.HIGH
        })

        // ==================== BIC/SWIFT ====================
        
        // BIC/SWIFT Code (8 oder 11 Zeichen)
        this.patterns.set('bic_swift', {
            regex: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== DEUTSCHE BANKDATEN ====================
        
        // Bankleitzahl (8 Ziffern mit Kontext)
        this.patterns.set('blz_de', {
            regex: /(?:BLZ|Bankleitzahl)[\s:]*[0-9]{8}/gi,
            severity: SeverityLevel.MEDIUM
        })

        // Kontonummer (mit Kontext)
        this.patterns.set('kontonummer_de', {
            regex: /(?:Kontonummer|Kto\.?[\s-]?Nr\.?)[\s:]*[0-9]{6,10}/gi,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== STEUER ====================
        
        // Deutsche USt-IdNr
        this.patterns.set('vat_de', {
            regex: /\bDE[\s]?[0-9]{9}\b/g,
            severity: SeverityLevel.MEDIUM
        })

        // EU USt-IdNr (verschiedene Länder)
        this.patterns.set('vat_eu', {
            regex: /\b(?:AT|BE|BG|CY|CZ|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK)[A-Z0-9]{8,12}\b/g,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== ROUTING NUMBERS (US) ====================
        
        // US Bank Routing Number (9 Ziffern)
        this.patterns.set('routing_us', {
            regex: /(?:routing|aba|rtn)[\s:]*[0-9]{9}/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== PAYMENT ====================
        
        // PayPal-Zahlungsreferenz
        this.patterns.set('paypal_ref', {
            regex: /\b[A-Z0-9]{17}\b(?=.*paypal)/gi,
            severity: SeverityLevel.LOW
        })

        // Bitcoin-Adresse
        this.patterns.set('crypto_btc', {
            regex: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bbc1[a-zA-HJ-NP-Z0-9]{39,59}\b/g,
            severity: SeverityLevel.HIGH
        })

        // Ethereum-Adresse
        this.patterns.set('crypto_eth', {
            regex: /\b0x[a-fA-F0-9]{40}\b/g,
            severity: SeverityLevel.HIGH
        })
    }

    /**
     * Maskiert Finanzwerte basierend auf Typ
     */
    protected maskValue(value: string, type: string): string {
        switch (type) {
            case 'cc_visa':
            case 'cc_mastercard':
            case 'cc_discover':
            case 'cc_jcb':
            case 'cc_generic':
                return this.maskCreditCard(value)
            
            case 'cc_amex':
                // Amex: **** ****** *1234
                const amexDigits = value.replace(/\D/g, '')
                return '**** ****** *' + amexDigits.slice(-4)
            
            case 'cc_diners':
                const dinersDigits = value.replace(/\D/g, '')
                return '**** ****** ' + dinersDigits.slice(-4)
            
            case 'cvv':
                // "CVV: 123" -> "CVV: ***"
                return value.replace(/[0-9]{3,4}$/, '***')
            
            case 'iban_de':
                // DE89 **** **** **** **** 78
                return this.maskIBAN(value)
            
            case 'iban_intl':
                return this.maskIBAN(value)
            
            case 'bic_swift':
                // DEUT*****
                return value.slice(0, 4) + '*'.repeat(value.length - 4)
            
            case 'blz_de':
                // "BLZ: 12345678" -> "BLZ: ****5678"
                return value.replace(/[0-9]{8}/, (m) => '****' + m.slice(-4))
            
            case 'kontonummer_de':
                return value.replace(/[0-9]{6,10}$/, (m) => '*'.repeat(m.length - 4) + m.slice(-4))
            
            case 'vat_de':
                return 'DE*********'
            
            case 'vat_eu':
                return value.slice(0, 2) + '*'.repeat(value.length - 2)
            
            case 'routing_us':
                return value.replace(/[0-9]{9}/, '*****' + value.slice(-4))
            
            case 'crypto_btc':
            case 'crypto_eth':
                return value.slice(0, 6) + '...' + value.slice(-4)
            
            default:
                if (value.length <= 4) return '*'.repeat(value.length)
                return '*'.repeat(value.length - 4) + value.slice(-4)
        }
    }

    /**
     * Maskiert Kreditkartennummer
     */
    private maskCreditCard(cardNumber: string): string {
        const digits = cardNumber.replace(/\D/g, '')
        const last4 = digits.slice(-4)
        
        // Format mit Leerzeichen
        if (cardNumber.includes(' ')) {
            return '**** **** **** ' + last4
        }
        // Format mit Bindestrichen
        if (cardNumber.includes('-')) {
            return '****-****-****-' + last4
        }
        // Ohne Trennzeichen
        return '************' + last4
    }

    /**
     * Maskiert IBAN
     */
    private maskIBAN(iban: string): string {
        const clean = iban.replace(/\s/g, '')
        const countryCode = clean.slice(0, 2)
        const last2 = clean.slice(-2)
        
        // Mit Leerzeichen formatieren
        if (iban.includes(' ')) {
            return `${countryCode}** **** **** **** **** ${last2}`
        }
        
        return countryCode + '*'.repeat(clean.length - 4) + last2
    }

    /**
     * Berechnet Konfidenz basierend auf Validierung
     */
    protected calculateConfidence(value: string, type: string): number {
        switch (type) {
            case 'cc_visa':
            case 'cc_mastercard':
            case 'cc_amex':
            case 'cc_discover':
            case 'cc_diners':
            case 'cc_jcb':
                // Luhn-Check für höhere Konfidenz
                if (this.validateLuhn(value.replace(/\D/g, ''))) {
                    return 0.99
                }
                return 0.7
            
            case 'cc_generic':
                // Generisches Pattern - Luhn-Check erforderlich
                if (this.validateLuhn(value.replace(/\D/g, ''))) {
                    return 0.85
                }
                return 0.4 // Könnte auch andere Nummer sein
            
            case 'iban_de':
                if (this.validateIBAN(value)) return 0.99
                return 0.7
            
            case 'iban_intl':
                if (this.validateIBAN(value)) return 0.95
                return 0.6
            
            case 'bic_swift':
                return 0.85
            
            case 'cvv':
                return 0.9 // Kontext vorhanden
            
            case 'crypto_btc':
            case 'crypto_eth':
                return 0.95
            
            default:
                return 0.7
        }
    }

    /**
     * Luhn-Algorithmus zur Validierung von Kreditkartennummern
     */
    private validateLuhn(number: string): boolean {
        if (!/^\d+$/.test(number)) return false
        
        let sum = 0
        let isEven = false
        
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number[i], 10)
            
            if (isEven) {
                digit *= 2
                if (digit > 9) digit -= 9
            }
            
            sum += digit
            isEven = !isEven
        }
        
        return sum % 10 === 0
    }

    /**
     * IBAN-Validierung (vereinfacht - Prüfziffer)
     */
    private validateIBAN(iban: string): boolean {
        const clean = iban.replace(/\s/g, '').toUpperCase()
        
        // Mindestlänge prüfen
        if (clean.length < 5) return false
        
        // Ersten 4 Zeichen ans Ende verschieben
        const rearranged = clean.slice(4) + clean.slice(0, 4)
        
        // Buchstaben durch Zahlen ersetzen (A=10, B=11, etc.)
        const numericString = rearranged.replace(/[A-Z]/g, (char) => 
            (char.charCodeAt(0) - 55).toString()
        )
        
        // Modulo 97 berechnen (vereinfacht für große Zahlen)
        let remainder = 0
        for (const char of numericString) {
            remainder = (remainder * 10 + parseInt(char, 10)) % 97
        }
        
        return remainder === 1
    }

    /**
     * Prüft ob Text Kreditkartendaten enthält
     */
    public containsCreditCard(text: string): boolean {
        const ccTypes = ['cc_visa', 'cc_mastercard', 'cc_amex', 'cc_discover', 'cc_diners', 'cc_jcb', 'cc_generic']
        
        for (const type of ccTypes) {
            const pattern = this.patterns.get(type)
            if (pattern && pattern.regex.test(text)) {
                // Luhn-Validierung für höhere Sicherheit
                const matches = text.match(pattern.regex)
                if (matches) {
                    for (const match of matches) {
                        if (this.validateLuhn(match.replace(/\D/g, ''))) {
                            return true
                        }
                    }
                }
            }
        }
        
        return false
    }

    /**
     * Extrahiert alle IBANs aus Text
     */
    public extractIBANs(text: string): string[] {
        const ibans: string[] = []
        
        for (const type of ['iban_de', 'iban_intl']) {
            const pattern = this.patterns.get(type)
            if (pattern) {
                const matches = text.match(pattern.regex)
                if (matches) {
                    ibans.push(...matches.filter(iban => this.validateIBAN(iban)))
                }
            }
        }
        
        return [...new Set(ibans)]
    }
}
