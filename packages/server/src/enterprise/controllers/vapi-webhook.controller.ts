import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { vapiAdminService, VAPIWebhookPayload, VAPICall, VOICE_PRICING } from '../services/vapi-admin.service'
import { WalletService } from '../services/wallet.service'
import { UsageType } from '../database/entities/wallet-transaction.entity'
import logger from '../../utils/logger'

/**
 * M.A.T.E. VAPI Webhook Controller
 * 
 * Verarbeitet Webhooks von VAPI:
 * - call-started: Call beginnt, Balance prüfen
 * - call-ended: Call beendet, Kosten abrechnen
 * - transcript: Transkript-Updates
 * - status-update: Status-Änderungen
 */

// In-Memory Call-Tracking (für Production: Redis/DB)
const activeCallsMap = new Map<string, {
    userId: string
    startTime: Date
    assistantId: string
    phoneNumberId?: string
}>()

/**
 * POST /api/v1/vapi/webhook
 * Hauptendpunkt für VAPI-Webhooks
 */
export const handleVAPIWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const signature = req.headers['x-vapi-signature'] as string || ''
        const rawBody = JSON.stringify(req.body)

        // Webhook validieren
        if (!vapiAdminService.validateWebhook(signature, rawBody)) {
            logger.warn('[VAPI Webhook] Ungültige Signatur')
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid signature' })
        }

        const payload = req.body as VAPIWebhookPayload
        logger.info(`[VAPI Webhook] ${payload.type}`, {
            callId: payload.call?.id,
            status: payload.call?.status
        })

        switch (payload.type) {
            case 'call-started':
                await handleCallStarted(payload)
                break
            case 'call-ended':
                await handleCallEnded(payload)
                break
            case 'transcript':
                await handleTranscript(payload)
                break
            case 'status-update':
                await handleStatusUpdate(payload)
                break
            default:
                logger.debug(`[VAPI Webhook] Unbekannter Event-Typ: ${payload.type}`)
        }

        return res.status(StatusCodes.OK).json({ received: true })
    } catch (error) {
        logger.error('[VAPI Webhook] Fehler', { error })
        next(error)
    }
}

/**
 * Verarbeitet call-started Events
 */
async function handleCallStarted(payload: VAPIWebhookPayload): Promise<void> {
    const call = payload.call
    
    // User-ID aus Metadata extrahieren (muss beim Assistant konfiguriert sein)
    const userId = call.metadata?.userId || call.metadata?.user_id
    
    if (!userId) {
        logger.warn('[VAPI Webhook] Kein userId in Call-Metadata', { callId: call.id })
        return
    }

    // Call in aktive Calls speichern
    activeCallsMap.set(call.id, {
        userId,
        startTime: new Date(),
        assistantId: call.assistantId,
        phoneNumberId: call.phoneNumberId
    })

    // Optional: Balance-Check bei Call-Start
    try {
        const walletService = new WalletService()
        const balance = await walletService.getWalletBalance(userId)
        
        // Warnung wenn Balance niedrig (< 5 Minuten = 750 Cents)
        if (balance.balanceCents < 750) {
            logger.warn('[VAPI Webhook] Niedriger Kontostand bei Call-Start', {
                callId: call.id,
                userId,
                balanceCents: balance.balanceCents
            })
        }
    } catch (error: any) {
        logger.error('[VAPI Webhook] Balance-Check fehlgeschlagen', { error: error.message })
    }

    logger.info('[VAPI Webhook] Call gestartet', {
        callId: call.id,
        userId,
        assistantId: call.assistantId
    })
}

/**
 * Verarbeitet call-ended Events - BILLING
 */
async function handleCallEnded(payload: VAPIWebhookPayload): Promise<void> {
    const call = payload.call
    const activeCall = activeCallsMap.get(call.id)

    // Fallback: User-ID aus Metadata
    const userId = activeCall?.userId || call.metadata?.userId || call.metadata?.user_id

    if (!userId) {
        logger.error('[VAPI Webhook] Keine User-ID für Billing', { callId: call.id })
        return
    }

    // Call-Dauer berechnen
    let durationSeconds = call.duration || 0
    
    // Fallback: Dauer aus Start/End-Zeit berechnen
    if (!durationSeconds && activeCall) {
        const endTime = new Date()
        durationSeconds = Math.floor((endTime.getTime() - activeCall.startTime.getTime()) / 1000)
    }

    // Kosten berechnen
    const { billableSeconds, costCents } = vapiAdminService.calculateCallCost(durationSeconds)

    logger.info('[VAPI Webhook] Call beendet - Billing', {
        callId: call.id,
        userId,
        durationSeconds,
        billableSeconds,
        costCents,
        endedReason: call.endedReason
    })

    // Wallet-Abzug
    if (costCents > 0) {
        try {
            const walletService = new WalletService()
            await walletService.deductBalance(userId, costCents, UsageType.VOICE, {
                voiceSeconds: billableSeconds,
                callId: call.id,
                description: `Voice Call: ${Math.ceil(billableSeconds / 60)} Minute(n)`
            })

            logger.info('[VAPI Webhook] Billing erfolgreich', {
                callId: call.id,
                userId,
                costCents
            })
        } catch (error: any) {
            logger.error('[VAPI Webhook] Billing fehlgeschlagen', {
                callId: call.id,
                userId,
                error: error.message
            })
            // TODO: Retry-Logik oder Queue für fehlgeschlagene Abrechnungen
        }
    }

    // Call aus aktiver Liste entfernen
    activeCallsMap.delete(call.id)
}

/**
 * Verarbeitet transcript Events
 */
async function handleTranscript(payload: VAPIWebhookPayload): Promise<void> {
    const call = payload.call
    
    // Transkript speichern falls benötigt
    if (call.transcript) {
        logger.debug('[VAPI Webhook] Transkript erhalten', {
            callId: call.id,
            transcriptLength: call.transcript.length
        })
        // TODO: Transkript in DB speichern für Transcription-Feature
    }
}

/**
 * Verarbeitet status-update Events
 */
async function handleStatusUpdate(payload: VAPIWebhookPayload): Promise<void> {
    const call = payload.call
    
    logger.debug('[VAPI Webhook] Status-Update', {
        callId: call.id,
        status: call.status
    })
}

/**
 * GET /api/v1/vapi/phone-numbers
 * Listet alle Telefonnummern auf
 */
export const listPhoneNumbers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const phoneNumbers = await vapiAdminService.listPhoneNumbers()
        return res.status(StatusCodes.OK).json(phoneNumbers)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/vapi/assistants
 * Listet alle Assistants auf
 */
export const listAssistants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const assistants = await vapiAdminService.listAssistants()
        return res.status(StatusCodes.OK).json(assistants)
    } catch (error) {
        next(error)
    }
}

/**
 * POST /api/v1/vapi/assistants
 * Erstellt einen neuen Assistant
 */
export const createAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const assistant = await vapiAdminService.createAssistant(req.body)
        return res.status(StatusCodes.CREATED).json(assistant)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/vapi/calls
 * Listet Calls auf
 */
export const listCalls = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { assistantId, phoneNumberId, limit } = req.query
        const calls = await vapiAdminService.listCalls({
            assistantId: assistantId as string,
            phoneNumberId: phoneNumberId as string,
            limit: limit ? parseInt(limit as string) : undefined
        })
        return res.status(StatusCodes.OK).json(calls)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/vapi/status
 * Gibt VAPI-Status zurück
 */
export const getVAPIStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isConfigured = vapiAdminService.isConfigured()
        
        let phoneNumberCount = 0
        let assistantCount = 0
        
        if (isConfigured) {
            try {
                const [phoneNumbers, assistants] = await Promise.all([
                    vapiAdminService.listPhoneNumbers(),
                    vapiAdminService.listAssistants()
                ])
                phoneNumberCount = phoneNumbers.length
                assistantCount = assistants.length
            } catch (error) {
                // API-Fehler ignorieren für Status-Check
            }
        }

        return res.status(StatusCodes.OK).json({
            configured: isConfigured,
            phoneNumbers: phoneNumberCount,
            assistants: assistantCount,
            activeCalls: activeCallsMap.size,
            pricing: {
                centsPerMinute: VOICE_PRICING.centsPerMinute,
                euroPerMinute: (VOICE_PRICING.centsPerMinute / 100).toFixed(2)
            }
        })
    } catch (error) {
        next(error)
    }
}
