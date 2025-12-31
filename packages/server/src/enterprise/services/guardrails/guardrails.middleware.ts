/**
 * M.A.T.E. Guardrails Middleware (G7)
 * 
 * Express Middleware für bidirektionale Guardrails-Überprüfung:
 * - Input Validation (Request Body, Query, Headers)
 * - Output Validation (Response Body)
 * - Automatische Maskierung
 * - Audit-Logging
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import logger from '../../../utils/logger'
import { guardrailsService } from './guardrails.service'
import { Direction, ActionType } from './types'

// Konfiguration
const GUARDRAILS_CONFIG = {
    // Aktiviert/Deaktiviert
    enabled: process.env.GUARDRAILS_ENABLED !== 'false',
    // Strenger Modus (blockiert bei kritischen Funden)
    strictMode: process.env.GUARDRAILS_STRICT_MODE === 'true',
    // Bypass für bestimmte Pfade
    bypassPaths: [
        '/api/v1/ping',
        '/api/v1/health',
        '/api/v1/version',
        '/api/v1/node-icon'
    ],
    // Bypass für bestimmte Content-Types
    bypassContentTypes: [
        'multipart/form-data',
        'application/octet-stream'
    ],
    // Maximale Body-Größe für Prüfung (10MB)
    maxBodySize: parseInt(process.env.GUARDRAILS_MAX_BODY_SIZE || '10485760'),
    // Response-Überprüfung aktivieren
    checkResponse: process.env.GUARDRAILS_CHECK_RESPONSE !== 'false',
    // Header für Skip (z.B. für Admin-Requests)
    skipHeader: 'X-Guardrails-Skip'
}

/**
 * Hauptmiddleware für Input-Überprüfung
 */
export const guardrailsInputMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Prüfe ob Guardrails aktiviert
    if (!GUARDRAILS_CONFIG.enabled) {
        return next()
    }

    // Bypass-Prüfung
    if (shouldBypass(req)) {
        return next()
    }

    try {
        const userId = (req as any).user?.id
        const sessionId = req.sessionID || req.headers['x-session-id'] as string
        const requestId = req.headers['x-request-id'] as string || generateRequestId()

        // Request-ID an Response anhängen
        res.setHeader('X-Request-Id', requestId)

        // Text aus Request extrahieren
        const textToCheck = extractRequestText(req)
        
        if (!textToCheck) {
            return next()
        }

        // Guardrails-Prüfung
        const result = await guardrailsService.validateInput(textToCheck, {
            userId,
            sessionId,
            requestId
        })

        // Bei blockierter Anfrage
        if (result.isBlocked) {
            logger.warn('[Guardrails] Request blocked', {
                path: req.path,
                method: req.method,
                requestId,
                userId,
                severity: result.aggregatedSeverity,
                warnings: result.warnings
            })

            return res.status(StatusCodes.BAD_REQUEST).json({
                error: 'Request enthält sensible oder nicht erlaubte Daten',
                code: 'GUARDRAILS_BLOCKED',
                requestId,
                details: result.warnings.slice(0, 3) // Nur erste 3 Warnungen
            })
        }

        // Bei Maskierung: Request-Body aktualisieren
        if (result.action === ActionType.MASK && result.processedText !== textToCheck) {
            updateRequestWithMaskedText(req, result.processedText)
            
            // Header für Information setzen
            res.setHeader('X-Guardrails-Applied', 'mask')
        }

        // Bei Warnungen: Header setzen
        if (result.warnings.length > 0) {
            res.setHeader('X-Guardrails-Warnings', result.warnings.length.toString())
        }

        next()

    } catch (error) {
        logger.error('[Guardrails] Middleware error', { error, path: req.path })
        
        // Im Strict-Mode blockieren, sonst durchlassen
        if (GUARDRAILS_CONFIG.strictMode) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Sicherheitsprüfung fehlgeschlagen',
                code: 'GUARDRAILS_ERROR'
            })
        }
        
        next()
    }
}

/**
 * Middleware für Output-Überprüfung (Response)
 */
export const guardrailsOutputMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Prüfe ob Response-Überprüfung aktiviert
    if (!GUARDRAILS_CONFIG.enabled || !GUARDRAILS_CONFIG.checkResponse) {
        return next()
    }

    // Bypass-Prüfung
    if (shouldBypass(req)) {
        return next()
    }

    // Original send/json Methoden speichern
    const originalJson = res.json.bind(res)
    const originalSend = res.send.bind(res)

    // JSON-Antwort abfangen
    res.json = function(body: any): Response {
        processResponseBody(body, req, res).then(processedBody => {
            return originalJson(processedBody)
        }).catch(() => {
            return originalJson(body)
        })
        return this
    }

    // Send-Antwort abfangen (für String-Bodies)
    res.send = function(body: any): Response {
        if (typeof body === 'string' && body.length > 0 && body.length < GUARDRAILS_CONFIG.maxBodySize) {
            processResponseBody(body, req, res).then(processedBody => {
                return originalSend(processedBody)
            }).catch(() => {
                return originalSend(body)
            })
            return this
        }
        return originalSend(body)
    }

    next()
}

/**
 * Kombinierte Middleware für beide Richtungen
 */
export const guardrailsMiddleware = [
    guardrailsInputMiddleware,
    guardrailsOutputMiddleware
]

// ==================== HELPER FUNCTIONS ====================

/**
 * Prüft ob Request von Guardrails ausgenommen werden soll
 */
function shouldBypass(req: Request): boolean {
    // Pfad-Bypass
    if (GUARDRAILS_CONFIG.bypassPaths.some(path => req.path.startsWith(path))) {
        return true
    }

    // Content-Type Bypass
    const contentType = req.headers['content-type'] || ''
    if (GUARDRAILS_CONFIG.bypassContentTypes.some(type => contentType.includes(type))) {
        return true
    }

    // Skip-Header
    if (req.headers[GUARDRAILS_CONFIG.skipHeader.toLowerCase()]) {
        // Nur für Admin-User erlaubt
        const user = (req as any).user
        if (user?.isGlobalAdmin || user?.permissions?.includes('guardrails:bypass')) {
            return true
        }
    }

    // Service-zu-Service Bypass (via Pfad)
    if (guardrailsService.isPathBypassed(req.path)) {
        return true
    }

    // User-Bypass
    const userId = (req as any).user?.id
    if (userId && guardrailsService.isUserBypassed(userId)) {
        return true
    }

    return false
}

/**
 * Extrahiert prüfbaren Text aus Request
 */
function extractRequestText(req: Request): string {
    const parts: string[] = []

    // Body
    if (req.body) {
        if (typeof req.body === 'string') {
            parts.push(req.body)
        } else if (typeof req.body === 'object') {
            parts.push(extractTextFromObject(req.body))
        }
    }

    // Query-Parameter
    if (req.query && Object.keys(req.query).length > 0) {
        parts.push(extractTextFromObject(req.query))
    }

    return parts.join('\n')
}

/**
 * Extrahiert alle String-Werte aus einem Objekt rekursiv
 */
function extractTextFromObject(obj: any, maxDepth: number = 5): string {
    if (maxDepth <= 0) return ''

    const texts: string[] = []

    if (typeof obj === 'string') {
        texts.push(obj)
    } else if (Array.isArray(obj)) {
        for (const item of obj) {
            texts.push(extractTextFromObject(item, maxDepth - 1))
        }
    } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
            // Bestimmte Felder überspringen (z.B. Binärdaten)
            if (['file', 'buffer', 'data', 'base64'].includes(key.toLowerCase())) {
                continue
            }
            texts.push(extractTextFromObject(value, maxDepth - 1))
        }
    }

    return texts.filter(t => t.length > 0).join('\n')
}

/**
 * Aktualisiert Request mit maskiertem Text
 */
function updateRequestWithMaskedText(req: Request, maskedText: string): void {
    // Für einfache String-Bodies
    if (typeof req.body === 'string') {
        req.body = maskedText
        return
    }

    // Für JSON-Bodies: Rekursiv ersetzen (vereinfacht)
    // In der Praxis würde man hier die Original-Positionen verwenden
    if (typeof req.body === 'object') {
        // Quick-Mask auf alle String-Felder anwenden
        maskObjectStrings(req.body)
    }
}

/**
 * Maskiert alle String-Felder in einem Objekt
 */
function maskObjectStrings(obj: any, maxDepth: number = 5): void {
    if (maxDepth <= 0 || !obj || typeof obj !== 'object') return

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            obj[key] = guardrailsService.quickMask(value)
        } else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                if (typeof value[i] === 'string') {
                    value[i] = guardrailsService.quickMask(value[i])
                } else if (typeof value[i] === 'object') {
                    maskObjectStrings(value[i], maxDepth - 1)
                }
            }
        } else if (typeof value === 'object') {
            maskObjectStrings(value, maxDepth - 1)
        }
    }
}

/**
 * Verarbeitet Response-Body
 */
async function processResponseBody(body: any, req: Request, res: Response): Promise<any> {
    const userId = (req as any).user?.id
    const sessionId = req.sessionID
    const requestId = res.getHeader('X-Request-Id') as string

    let textToCheck: string

    if (typeof body === 'string') {
        textToCheck = body
    } else if (typeof body === 'object') {
        textToCheck = extractTextFromObject(body)
    } else {
        return body
    }

    if (!textToCheck || textToCheck.length === 0) {
        return body
    }

    const result = await guardrailsService.validateOutput(textToCheck, {
        userId,
        sessionId,
        requestId
    })

    // Bei Maskierung
    if (result.action === ActionType.MASK && result.processedText !== textToCheck) {
        if (typeof body === 'string') {
            return result.processedText
        } else {
            // Objekt maskieren
            maskObjectStrings(body)
            return body
        }
    }

    return body
}

/**
 * Generiert eine Request-ID
 */
function generateRequestId(): string {
    return 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ==================== LLM-SPEZIFISCHE MIDDLEWARE ====================

/**
 * Middleware speziell für LLM-Requests (höhere Sicherheitsstufe)
 */
export const guardrailsLLMMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Standard-Middleware zuerst
    await guardrailsInputMiddleware(req, res, (err) => {
        if (err) return next(err)

        // Zusätzliche LLM-spezifische Prüfungen
        const body = req.body
        
        // Prompt-Felder prüfen
        const promptFields = ['prompt', 'message', 'messages', 'input', 'query', 'question']
        
        for (const field of promptFields) {
            if (body && body[field]) {
                // Bereits durch Standard-Middleware geprüft
                // Hier könnten zusätzliche LLM-spezifische Prüfungen erfolgen
            }
        }

        next()
    })
}

/**
 * Middleware für Chatflow-Predictions
 */
export const guardrailsChatflowMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Für Chatflow-Predictions mit speziellen Anforderungen
    if (req.path.includes('/prediction') || req.path.includes('/chat')) {
        // Höhere Sicherheitsstufe für User-Input
        return guardrailsLLMMiddleware(req, res, next)
    }
    
    return guardrailsInputMiddleware(req, res, next)
}
