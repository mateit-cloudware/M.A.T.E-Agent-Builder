/**
 * M.A.T.E. Guardrail Middleware
 * 
 * Express-Middleware für automatische Guardrail-Validierung bei LLM-Requests
 * - Input-Validierung vor LLM-Call
 * - Output-Validierung nach LLM-Call
 * - Automatisches Blocking bei kritischen Verstößen
 * - Audit-Logging
 */

import { Request, Response, NextFunction } from 'express'
import { guardrailService, GuardrailOptions } from '../services/guardrail.service'
import { AuditAction } from '../database/entities/guardrail.entity'
import { StatusCodes } from 'http-status-codes'
import logger from '../../utils/logger'

/**
 * Erweitert Express Request um Guardrail-Daten
 */
declare global {
    namespace Express {
        interface Request {
            guardrailData?: {
                originalInput?: string
                sanitizedInput?: string
                scanResult?: any
            }
        }
    }
}

/**
 * Input Guardrail Middleware
 * 
 * Prüft eingehende Requests auf sensible Daten und wendet Sanitization an.
 * Blockiert kritische Requests automatisch.
 * 
 * Verwendung:
 * ```typescript
 * router.post('/prediction/:id', inputGuardrailMiddleware, predictionController)
 * ```
 */
export const inputGuardrailMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extrahiere User-Kontext
        const userId = (req as any).user?.id
        const sessionId = (req as any).session?.id || req.sessionID
        const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`
        const sourceIp = req.ip || req.socket.remoteAddress || 'unknown'
        const sourcePath = req.path

        // Extrahiere Input-Text aus Request-Body
        const inputText = extractInputText(req.body)
        
        if (!inputText) {
            // Kein Text zu prüfen - weiter
            return next()
        }

        // Guardrail-Optionen
        const options: GuardrailOptions = {
            userId,
            sessionId,
            requestId,
            sourcePath,
            sourceIp
        }

        // Input-Validierung
        const validation = await guardrailService.validateInput(inputText, options)

        // Speichere Ergebnis im Request für spätere Verwendung
        req.guardrailData = {
            originalInput: inputText,
            sanitizedInput: validation.sanitized
        }

        // Blockiere bei kritischem Verstoß
        if (!validation.allowed) {
            logger.warn(`[GuardrailMiddleware] Blocked request from user ${userId}: ${validation.reason}`)
            
            res.status(StatusCodes.FORBIDDEN).json({
                error: 'Security violation detected',
                message: validation.reason || 'Your request contains prohibited content',
                blocked: true
            })
            return
        }

        // Ersetze Input mit sanitisierter Version
        if (validation.sanitized !== inputText) {
            replaceInputText(req.body, validation.sanitized)
            logger.info(`[GuardrailMiddleware] Sanitized input for user ${userId}`)
        }

        next()
    } catch (error) {
        logger.error('[GuardrailMiddleware] Input validation error:', error)
        // Bei Fehler: Nicht blockieren, nur loggen
        next()
    }
}

/**
 * Output Guardrail Middleware
 * 
 * Prüft LLM-Responses auf sensible Daten und wendet Sanitization an.
 * 
 * Verwendung: Wird durch Response-Interception in LLM-Services angewendet
 */
export const outputGuardrailMiddleware = async (
    outputText: string,
    options: GuardrailOptions = {}
): Promise<{ sanitized: string; blocked: boolean; reason?: string }> => {
    try {
        const validation = await guardrailService.validateOutput(outputText, options)

        if (!validation.allowed) {
            logger.warn(`[GuardrailMiddleware] Blocked LLM output: ${validation.reason}`)
            return {
                sanitized: '',
                blocked: true,
                reason: validation.reason
            }
        }

        return {
            sanitized: validation.sanitized,
            blocked: false
        }
    } catch (error) {
        logger.error('[GuardrailMiddleware] Output validation error:', error)
        // Bei Fehler: Original-Text zurückgeben
        return {
            sanitized: outputText,
            blocked: false
        }
    }
}

/**
 * Conditional Guardrail Middleware
 * 
 * Wendet Guardrails nur an, wenn aktiviert (basierend auf Konfiguration)
 */
export const conditionalGuardrailMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Prüfe ob Guardrails global aktiviert sind
    const guardrailsEnabled = process.env.GUARDRAILS_ENABLED !== 'false'

    if (!guardrailsEnabled) {
        return next()
    }

    // Führe Input-Guardrail aus
    inputGuardrailMiddleware(req, res, next)
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extrahiert Input-Text aus verschiedenen Request-Body-Strukturen
 */
function extractInputText(body: any): string | null {
    if (!body) return null

    // LangChain/Flowise prediction format
    if (body.question) return body.question
    if (body.input) return typeof body.input === 'string' ? body.input : JSON.stringify(body.input)
    
    // Chat message format
    if (body.message) return body.message
    if (body.content) return body.content
    
    // Array of messages
    if (Array.isArray(body.messages)) {
        const lastMessage = body.messages[body.messages.length - 1]
        if (lastMessage?.content) return lastMessage.content
        if (lastMessage?.text) return lastMessage.text
    }

    // Generic text field
    if (body.text) return body.text
    
    // Prompt field
    if (body.prompt) return body.prompt

    return null
}

/**
 * Ersetzt Input-Text im Request-Body
 */
function replaceInputText(body: any, sanitizedText: string): void {
    if (!body) return

    // LangChain/Flowise prediction format
    if (body.question) body.question = sanitizedText
    if (body.input) body.input = sanitizedText
    
    // Chat message format
    if (body.message) body.message = sanitizedText
    if (body.content) body.content = sanitizedText
    
    // Array of messages
    if (Array.isArray(body.messages) && body.messages.length > 0) {
        const lastMessage = body.messages[body.messages.length - 1]
        if (lastMessage?.content) lastMessage.content = sanitizedText
        if (lastMessage?.text) lastMessage.text = sanitizedText
    }

    // Generic text field
    if (body.text) body.text = sanitizedText
    
    // Prompt field
    if (body.prompt) body.prompt = sanitizedText
}

/**
 * Response-Wrapper für automatische Output-Validierung
 * 
 * Verwendung in Controller:
 * ```typescript
 * const response = await llmService.predict(input)
 * return wrapResponseWithGuardrail(res, response, { userId: req.user.id })
 * ```
 */
export async function wrapResponseWithGuardrail(
    res: Response,
    data: any,
    options: GuardrailOptions = {}
): Promise<Response> {
    try {
        // Extrahiere Text aus Response
        let responseText: string | null = null
        
        if (typeof data === 'string') {
            responseText = data
        } else if (data?.text) {
            responseText = data.text
        } else if (data?.content) {
            responseText = data.content
        } else if (data?.result) {
            responseText = typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
        }

        if (!responseText) {
            // Keine Text-Response - direkt zurückgeben
            return res.json(data)
        }

        // Output-Validierung
        const validation = await outputGuardrailMiddleware(responseText, options)

        if (validation.blocked) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Security violation in response',
                message: 'The generated response contains prohibited content',
                blocked: true
            })
        }

        // Ersetze Response-Text mit sanitisierter Version
        if (typeof data === 'string') {
            return res.send(validation.sanitized)
        } else if (data?.text) {
            data.text = validation.sanitized
        } else if (data?.content) {
            data.content = validation.sanitized
        } else if (data?.result) {
            data.result = validation.sanitized
        }

        return res.json(data)
    } catch (error) {
        logger.error('[GuardrailMiddleware] Response wrapping error:', error)
        // Bei Fehler: Original-Response zurückgeben
        return res.json(data)
    }
}

/**
 * Express Error Handler für Guardrail-Fehler
 */
export function guardrailErrorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (error.name === 'GuardrailViolation') {
        res.status(StatusCodes.FORBIDDEN).json({
            error: 'Security violation',
            message: error.message,
            blocked: true
        })
        return
    }

    next(error)
}
