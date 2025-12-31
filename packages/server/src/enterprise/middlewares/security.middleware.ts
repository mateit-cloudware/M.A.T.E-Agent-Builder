import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { securityService } from '../services/security.service'
import logger from '../../utils/logger'

/**
 * M.A.T.E. Security Middleware
 * 
 * Zentrale Sicherheits-Middleware für alle API-Requests:
 * - Input Sanitization
 * - PII Detection
 * - Prompt Injection Detection
 * - Request Validation
 */

// Konfiguration
const SECURITY_CONFIG = {
    // Maximale Request-Body-Größe (10MB)
    maxBodySize: parseInt(process.env.SECURITY_MAX_BODY_SIZE || '10485760'),
    // Maximale String-Länge für einzelne Felder
    maxStringLength: parseInt(process.env.SECURITY_MAX_STRING_LENGTH || '100000'),
    // PII-Prüfung aktivieren
    checkPII: process.env.SECURITY_CHECK_PII !== 'false',
    // Prompt-Injection-Prüfung aktivieren
    checkInjection: process.env.SECURITY_CHECK_INJECTION !== 'false',
    // Strenger Modus (blockiert bei Warnung)
    strictMode: process.env.SECURITY_STRICT_MODE === 'true',
    // Bypass für bestimmte Pfade
    bypassPaths: [
        '/api/v1/ping',
        '/api/v1/health',
        '/api/v1/version'
    ]
}

/**
 * Haupt-Security-Middleware
 * Prüft alle eingehenden Requests auf Sicherheitsbedrohungen
 */
export const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Bypass für bestimmte Pfade
        if (SECURITY_CONFIG.bypassPaths.some(path => req.path.startsWith(path))) {
            return next()
        }

        // Content-Length prüfen
        const contentLength = parseInt(req.headers['content-length'] || '0')
        if (contentLength > SECURITY_CONFIG.maxBodySize) {
            logger.warn('[Security] Request zu groß', {
                path: req.path,
                size: contentLength,
                maxSize: SECURITY_CONFIG.maxBodySize
            })
            return res.status(StatusCodes.REQUEST_TOO_LONG).json({
                error: 'Request body zu groß',
                maxSize: SECURITY_CONFIG.maxBodySize
            })
        }

        // Body sanitisieren
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body)
        }

        // Query-Parameter sanitisieren
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query) as any
        }

        next()
    } catch (error) {
        logger.error('[Security] Middleware-Fehler', { error })
        next(error)
    }
}

/**
 * LLM Input Security Middleware
 * Speziell für LLM-relevante Endpunkte (Prompts, Messages)
 */
export const llmSecurityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Relevante Felder für LLM-Input
        const llmFields = ['prompt', 'message', 'content', 'text', 'query', 'input', 'messages']
        
        for (const field of llmFields) {
            const value = getNestedValue(req.body, field)
            
            if (value && typeof value === 'string') {
                const validation = securityService.validateLLMInput(value)

                if (validation.shouldBlock) {
                    logger.warn('[Security] LLM-Input blockiert', {
                        path: req.path,
                        warnings: validation.warnings,
                        userId: (req as any).user?.id
                    })
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        error: 'Ungültige Eingabe erkannt',
                        details: SECURITY_CONFIG.strictMode 
                            ? validation.warnings 
                            : ['Eingabe enthält nicht erlaubte Inhalte']
                    })
                }

                // PII im Input maskieren (optional)
                if (validation.pii.hasPII && SECURITY_CONFIG.checkPII) {
                    // Original durch sanitisierte Version ersetzen
                    setNestedValue(req.body, field, validation.sanitizedInput)
                    
                    // Warnung in Request-Kontext speichern
                    if (!(req as any).securityWarnings) {
                        (req as any).securityWarnings = []
                    }
                    (req as any).securityWarnings.push(...validation.warnings)
                }

                // Bei Strict-Mode auch bei Warnungen blockieren
                if (SECURITY_CONFIG.strictMode && validation.warnings.length > 0) {
                    logger.warn('[Security] Strict Mode: Request blockiert', {
                        path: req.path,
                        warnings: validation.warnings
                    })
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        error: 'Sicherheitswarnung',
                        details: validation.warnings
                    })
                }
            }

            // Array von Messages prüfen (z.B. für Chat-APIs)
            if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    const item = value[i]
                    if (item && typeof item.content === 'string') {
                        const validation = securityService.validateLLMInput(item.content)
                        
                        if (validation.shouldBlock) {
                            return res.status(StatusCodes.BAD_REQUEST).json({
                                error: 'Ungültige Eingabe in Nachricht erkannt',
                                index: i
                            })
                        }

                        if (validation.pii.hasPII) {
                            value[i].content = validation.sanitizedInput
                        }
                    }
                }
            }
        }

        next()
    } catch (error) {
        logger.error('[Security] LLM-Middleware-Fehler', { error })
        next(error)
    }
}

/**
 * Webhook Security Middleware
 * Für externe Webhooks (VAPI, Stripe, etc.)
 */
export const webhookSecurityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Webhook-Signature prüfen (muss vom jeweiligen Handler gemacht werden)
        // Hier nur allgemeine Sanitization

        // Body sanitisieren, aber weniger strikt
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body, { preserveSpecialChars: true })
        }

        // Rate-Limit-Header setzen
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('X-XSS-Protection', '1; mode=block')

        next()
    } catch (error) {
        logger.error('[Security] Webhook-Middleware-Fehler', { error })
        next(error)
    }
}

/**
 * Admin-Only Security Middleware
 * Zusätzliche Sicherheit für Admin-Endpunkte
 */
export const adminSecurityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Logging für Admin-Aktionen
        const user = (req as any).user
        
        logger.info('[Security] Admin-Aktion', {
            path: req.path,
            method: req.method,
            userId: user?.id,
            email: user?.email,
            ip: req.ip || req.headers['x-forwarded-for']
        })

        // Zusätzliche Validierung für kritische Aktionen
        if (req.method === 'DELETE' || req.path.includes('/bulk')) {
            logger.warn('[Security] Kritische Admin-Aktion', {
                path: req.path,
                method: req.method,
                userId: user?.id,
                body: JSON.stringify(req.body).slice(0, 500)
            })
        }

        next()
    } catch (error) {
        logger.error('[Security] Admin-Middleware-Fehler', { error })
        next(error)
    }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Rekursiv ein Objekt sanitisieren
 */
function sanitizeObject(obj: any, options?: { preserveSpecialChars?: boolean }): any {
    if (obj === null || obj === undefined) return obj
    
    if (typeof obj === 'string') {
        // String-Länge begrenzen
        if (obj.length > SECURITY_CONFIG.maxStringLength) {
            obj = obj.slice(0, SECURITY_CONFIG.maxStringLength)
        }
        
        if (!options?.preserveSpecialChars) {
            return securityService.sanitizeInput(obj)
        }
        return obj
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, options))
    }
    
    if (typeof obj === 'object') {
        const sanitized: any = {}
        for (const [key, value] of Object.entries(obj)) {
            // Schlüsselnamen auch sanitisieren
            const sanitizedKey = securityService.sanitizeInput(key)
            sanitized[sanitizedKey] = sanitizeObject(value, options)
        }
        return sanitized
    }
    
    return obj
}

/**
 * Verschachtelten Wert aus Objekt holen
 */
function getNestedValue(obj: any, key: string): any {
    if (!obj) return undefined
    
    // Direkte Eigenschaft
    if (obj[key] !== undefined) return obj[key]
    
    // Verschachtelt suchen
    for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'object') {
            const nested = getNestedValue(obj[k], key)
            if (nested !== undefined) return nested
        }
    }
    
    return undefined
}

/**
 * Verschachtelten Wert in Objekt setzen
 */
function setNestedValue(obj: any, key: string, value: any): boolean {
    if (!obj) return false
    
    // Direkte Eigenschaft
    if (obj[key] !== undefined) {
        obj[key] = value
        return true
    }
    
    // Verschachtelt suchen und setzen
    for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'object') {
            if (setNestedValue(obj[k], key, value)) return true
        }
    }
    
    return false
}
