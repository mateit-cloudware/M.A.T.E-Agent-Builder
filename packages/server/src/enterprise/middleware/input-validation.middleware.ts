/**
 * M.A.T.E. Input Validation Framework
 * 
 * Zentrales Framework für Input-Validierung und Sanitization.
 * 
 * Features:
 * - Schema-basierte Validierung
 * - Typ-sichere Validatoren
 * - Automatische Sanitization
 * - Custom Validation Rules
 * - Error Messages auf Deutsch
 * 
 * @module middleware/input-validation
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
// @ts-ignore - validator types werden installiert oder ignoriert
import validator from 'validator'

// ==================== TYPES ====================

/**
 * Validierungsregel
 */
export interface ValidationRule {
    type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date' | 'array' | 'object'
    required?: boolean
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: RegExp
    enum?: any[]
    custom?: (value: any) => boolean | string
    sanitize?: boolean
    default?: any
    message?: string
}

/**
 * Validierungsschema
 */
export interface ValidationSchema {
    body?: Record<string, ValidationRule>
    query?: Record<string, ValidationRule>
    params?: Record<string, ValidationRule>
}

/**
 * Validierungsfehler
 */
export interface ValidationError {
    field: string
    message: string
    value?: any
}

/**
 * Validierungsergebnis
 */
export interface ValidationResult {
    valid: boolean
    errors: ValidationError[]
    sanitizedData: Record<string, any>
}

// ==================== SANITIZERS ====================

/**
 * Sanitizer-Funktionen
 */
export const sanitizers = {
    /**
     * Entfernt HTML-Tags
     */
    stripHtml: (value: string): string => {
        return value.replace(/<[^>]*>/g, '')
    },

    /**
     * Escaped HTML-Entities
     */
    escapeHtml: (value: string): string => {
        return validator.escape(value)
    },

    /**
     * Trimmt Whitespace
     */
    trim: (value: string): string => {
        return value.trim()
    },

    /**
     * Normalisiert E-Mail
     */
    normalizeEmail: (value: string): string => {
        return validator.normalizeEmail(value) || value.toLowerCase()
    },

    /**
     * Entfernt gefährliche SQL-Zeichen
     */
    sqlSafe: (value: string): string => {
        return value.replace(/['";\\]/g, '')
    },

    /**
     * Entfernt alle nicht-alphanumerischen Zeichen
     */
    alphanumeric: (value: string): string => {
        return value.replace(/[^a-zA-Z0-9]/g, '')
    },

    /**
     * Kombinierter Sanitizer für allgemeine Texteingaben
     */
    sanitizeText: (value: string): string => {
        let result = sanitizers.trim(value)
        result = sanitizers.stripHtml(result)
        result = sanitizers.escapeHtml(result)
        return result
    }
}

// ==================== VALIDATORS ====================

/**
 * Validator-Funktionen
 */
export const validators = {
    isString: (value: any): boolean => typeof value === 'string',
    
    isNumber: (value: any): boolean => typeof value === 'number' && !isNaN(value),
    
    isBoolean: (value: any): boolean => typeof value === 'boolean',
    
    isEmail: (value: any): boolean => typeof value === 'string' && validator.isEmail(value),
    
    isUrl: (value: any): boolean => typeof value === 'string' && validator.isURL(value),
    
    isUuid: (value: any): boolean => typeof value === 'string' && validator.isUUID(value),
    
    isDate: (value: any): boolean => {
        if (value instanceof Date) return !isNaN(value.getTime())
        if (typeof value === 'string') return validator.isISO8601(value)
        return false
    },
    
    isArray: (value: any): boolean => Array.isArray(value),
    
    isObject: (value: any): boolean => typeof value === 'object' && value !== null && !Array.isArray(value),

    isAlphanumeric: (value: any): boolean => typeof value === 'string' && validator.isAlphanumeric(value),

    isPhoneNumber: (value: any): boolean => typeof value === 'string' && validator.isMobilePhone(value, 'any'),

    isCreditCard: (value: any): boolean => typeof value === 'string' && validator.isCreditCard(value),

    isIBAN: (value: any): boolean => typeof value === 'string' && validator.isIBAN(value),

    isIP: (value: any): boolean => typeof value === 'string' && validator.isIP(value),

    isJSON: (value: any): boolean => {
        if (typeof value !== 'string') return false
        try {
            JSON.parse(value)
            return true
        } catch {
            return false
        }
    },

    hasNoSqlInjection: (value: any): boolean => {
        if (typeof value !== 'string') return true
        const patterns = [
            /('|"|;|--|\|\||&&)/,
            /(union\s+select|insert\s+into|update\s+.+\s+set|delete\s+from|drop\s+table)/i
        ]
        return !patterns.some(pattern => pattern.test(value))
    },

    hasNoXss: (value: any): boolean => {
        if (typeof value !== 'string') return true
        const patterns = [
            /<script[^>]*>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i
        ]
        return !patterns.some(pattern => pattern.test(value))
    }
}

// ==================== VALIDATION ENGINE ====================

/**
 * Validiert einen Wert gegen eine Regel
 */
function validateValue(
    field: string,
    value: any,
    rule: ValidationRule
): { valid: boolean; error?: ValidationError; sanitizedValue: any } {
    let sanitizedValue = value

    // Required Check
    if (rule.required && (value === undefined || value === null || value === '')) {
        return {
            valid: false,
            error: { field, message: rule.message || `${field} ist erforderlich` },
            sanitizedValue: rule.default
        }
    }

    // Optional und nicht vorhanden
    if (!rule.required && (value === undefined || value === null)) {
        return { valid: true, sanitizedValue: rule.default ?? value }
    }

    // Typ-Validierung
    let typeValid = true
    switch (rule.type) {
        case 'string':
            typeValid = validators.isString(value)
            if (typeValid && rule.sanitize !== false) {
                sanitizedValue = sanitizers.sanitizeText(value)
            }
            break
        case 'number':
            if (typeof value === 'string') {
                sanitizedValue = parseFloat(value)
            }
            typeValid = validators.isNumber(sanitizedValue)
            break
        case 'boolean':
            if (typeof value === 'string') {
                sanitizedValue = value === 'true' || value === '1'
            }
            typeValid = validators.isBoolean(sanitizedValue)
            break
        case 'email':
            typeValid = validators.isEmail(value)
            if (typeValid && rule.sanitize !== false) {
                sanitizedValue = sanitizers.normalizeEmail(value)
            }
            break
        case 'url':
            typeValid = validators.isUrl(value)
            break
        case 'uuid':
            typeValid = validators.isUuid(value)
            break
        case 'date':
            typeValid = validators.isDate(value)
            if (typeValid && typeof value === 'string') {
                sanitizedValue = new Date(value)
            }
            break
        case 'array':
            typeValid = validators.isArray(value)
            break
        case 'object':
            typeValid = validators.isObject(value)
            break
    }

    if (!typeValid) {
        return {
            valid: false,
            error: { field, message: rule.message || `${field} muss vom Typ ${rule.type} sein`, value },
            sanitizedValue
        }
    }

    // String-spezifische Validierungen
    if (rule.type === 'string' || rule.type === 'email') {
        const strValue = String(sanitizedValue)
        
        if (rule.minLength !== undefined && strValue.length < rule.minLength) {
            return {
                valid: false,
                error: { field, message: rule.message || `${field} muss mindestens ${rule.minLength} Zeichen haben`, value },
                sanitizedValue
            }
        }
        
        if (rule.maxLength !== undefined && strValue.length > rule.maxLength) {
            return {
                valid: false,
                error: { field, message: rule.message || `${field} darf maximal ${rule.maxLength} Zeichen haben`, value },
                sanitizedValue
            }
        }
        
        if (rule.pattern && !rule.pattern.test(strValue)) {
            return {
                valid: false,
                error: { field, message: rule.message || `${field} hat ein ungültiges Format`, value },
                sanitizedValue
            }
        }
    }

    // Numerische Validierungen
    if (rule.type === 'number') {
        const numValue = Number(sanitizedValue)
        
        if (rule.min !== undefined && numValue < rule.min) {
            return {
                valid: false,
                error: { field, message: rule.message || `${field} muss mindestens ${rule.min} sein`, value },
                sanitizedValue
            }
        }
        
        if (rule.max !== undefined && numValue > rule.max) {
            return {
                valid: false,
                error: { field, message: rule.message || `${field} darf maximal ${rule.max} sein`, value },
                sanitizedValue
            }
        }
    }

    // Enum-Validierung
    if (rule.enum && !rule.enum.includes(sanitizedValue)) {
        return {
            valid: false,
            error: { 
                field, 
                message: rule.message || `${field} muss einer der folgenden Werte sein: ${rule.enum.join(', ')}`,
                value 
            },
            sanitizedValue
        }
    }

    // Custom-Validierung
    if (rule.custom) {
        const customResult = rule.custom(sanitizedValue)
        if (customResult !== true) {
            return {
                valid: false,
                error: { 
                    field, 
                    message: typeof customResult === 'string' ? customResult : `${field} ist ungültig`,
                    value 
                },
                sanitizedValue
            }
        }
    }

    // Security-Checks
    if (rule.type === 'string' && rule.sanitize !== false) {
        if (!validators.hasNoSqlInjection(sanitizedValue)) {
            return {
                valid: false,
                error: { field, message: `${field} enthält ungültige Zeichen`, value },
                sanitizedValue
            }
        }
        if (!validators.hasNoXss(sanitizedValue)) {
            return {
                valid: false,
                error: { field, message: `${field} enthält ungültige Zeichen`, value },
                sanitizedValue
            }
        }
    }

    return { valid: true, sanitizedValue }
}

/**
 * Validiert Daten gegen ein Schema
 */
export function validate(
    data: Record<string, any>,
    schema: Record<string, ValidationRule>
): ValidationResult {
    const errors: ValidationError[] = []
    const sanitizedData: Record<string, any> = {}

    for (const [field, rule] of Object.entries(schema)) {
        const result = validateValue(field, data[field], rule)
        
        if (!result.valid && result.error) {
            errors.push(result.error)
        }
        
        if (result.sanitizedValue !== undefined) {
            sanitizedData[field] = result.sanitizedValue
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitizedData
    }
}

// ==================== MIDDLEWARE ====================

/**
 * Validation Middleware
 */
export function validateRequest(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const allErrors: ValidationError[] = []

        // Validate Body
        if (schema.body && req.body) {
            const bodyResult = validate(req.body, schema.body)
            if (!bodyResult.valid) {
                allErrors.push(...bodyResult.errors)
            }
            req.body = bodyResult.sanitizedData
        }

        // Validate Query
        if (schema.query && req.query) {
            const queryResult = validate(req.query as Record<string, any>, schema.query)
            if (!queryResult.valid) {
                allErrors.push(...queryResult.errors)
            }
            req.query = queryResult.sanitizedData as any
        }

        // Validate Params
        if (schema.params && req.params) {
            const paramsResult = validate(req.params, schema.params)
            if (!paramsResult.valid) {
                allErrors.push(...paramsResult.errors)
            }
            req.params = paramsResult.sanitizedData as any
        }

        if (allErrors.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Validierungsfehler',
                details: allErrors
            })
        }

        next()
    }
}

// ==================== COMMON SCHEMAS ====================

/**
 * Häufig verwendete Validierungsregeln
 */
export const commonRules = {
    id: { type: 'uuid' as const, required: true },
    
    email: { type: 'email' as const, required: true, maxLength: 255 },
    
    password: { 
        type: 'string' as const, 
        required: true, 
        minLength: 8, 
        maxLength: 128,
        custom: (value: string) => {
            if (!/[A-Z]/.test(value)) return 'Passwort muss mindestens einen Großbuchstaben enthalten'
            if (!/[a-z]/.test(value)) return 'Passwort muss mindestens einen Kleinbuchstaben enthalten'
            if (!/[0-9]/.test(value)) return 'Passwort muss mindestens eine Zahl enthalten'
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Passwort muss mindestens ein Sonderzeichen enthalten'
            return true
        }
    },
    
    username: { 
        type: 'string' as const, 
        required: true, 
        minLength: 3, 
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_-]+$/
    },
    
    name: { type: 'string' as const, required: true, minLength: 1, maxLength: 100 },
    
    text: { type: 'string' as const, maxLength: 5000 },
    
    url: { type: 'url' as const },
    
    positiveNumber: { type: 'number' as const, min: 0 },
    
    pagination: {
        page: { type: 'number' as const, min: 1, default: 1 },
        limit: { type: 'number' as const, min: 1, max: 100, default: 20 }
    }
}

// ==================== CSRF PROTECTION ====================

const CSRF_TOKEN_LENGTH = 32
const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf-token'

/**
 * Generiert ein CSRF-Token
 */
export function generateCsrfToken(): string {
    return require('crypto').randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
        // Skip für sichere Methoden
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            // Token generieren für GET-Requests
            const token = generateCsrfToken()
            res.cookie(CSRF_COOKIE, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            })
            ;(req as any).csrfToken = token
            return next()
        }

        // Token validieren für unsichere Methoden
        const cookieToken = req.cookies?.[CSRF_COOKIE]
        const headerToken = req.headers[CSRF_HEADER] as string

        if (!cookieToken || !headerToken) {
            return res.status(StatusCodes.FORBIDDEN).json({
                error: 'CSRF-Token fehlt'
            })
        }

        if (cookieToken !== headerToken) {
            return res.status(StatusCodes.FORBIDDEN).json({
                error: 'CSRF-Token ungültig'
            })
        }

        next()
    }
}

export default {
    validate,
    validateRequest,
    sanitizers,
    validators,
    commonRules,
    csrfProtection,
    generateCsrfToken
}
