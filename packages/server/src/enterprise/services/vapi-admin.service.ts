import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'

/**
 * M.A.T.E. VAPI Admin Service
 * 
 * Zentraler Service für die VAPI-Integration:
 * - Telefonnummern-Management
 * - Voice Agent-Verwaltung
 * - Call-Tracking und Webhooks
 * - Voice-Usage Billing
 * 
 * Konfiguration:
 * - VAPI_API_KEY: API-Key für VAPI
 * - VAPI_BASE_URL: API-Endpunkt (default: https://api.vapi.ai)
 * - VAPI_WEBHOOK_SECRET: Secret für Webhook-Validierung
 */

// VAPI Pricing: €1.50 pro Minute (150 Cents)
export const VOICE_PRICING = {
    centsPerMinute: 150,
    centsPerSecond: 2.5,
    // Minimum billable duration (30 Sekunden)
    minimumBillableSeconds: 30
} as const

export interface VAPIConfig {
    apiKey: string
    baseUrl: string
    webhookSecret: string
}

export interface VAPIPhoneNumber {
    id: string
    number: string
    name?: string
    assistantId?: string
    status: 'active' | 'inactive' | 'pending'
    provider: string
    createdAt: string
    updatedAt: string
}

export interface VAPIAssistant {
    id: string
    name: string
    model: {
        provider: string
        model: string
        temperature?: number
    }
    voice: {
        provider: string
        voiceId: string
    }
    firstMessage?: string
    instructions?: string
    endCallMessage?: string
    metadata?: Record<string, any>
    createdAt: string
    updatedAt: string
}

export interface VAPICall {
    id: string
    assistantId: string
    phoneNumberId?: string
    status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended'
    type: 'inbound' | 'outbound' | 'web'
    startedAt?: string
    endedAt?: string
    endedReason?: string
    duration?: number // in seconds
    cost?: number
    transcript?: string
    recordingUrl?: string
    metadata?: Record<string, any>
    customer?: {
        number?: string
        name?: string
    }
}

export interface VAPIWebhookPayload {
    type: 'call-started' | 'call-ended' | 'transcript' | 'function-call' | 'status-update'
    call: VAPICall
    timestamp: string
    assistant?: VAPIAssistant
}

class VAPIAdminService {
    private config: VAPIConfig
    private static instance: VAPIAdminService

    private constructor() {
        this.config = {
            apiKey: process.env.VAPI_API_KEY || '',
            baseUrl: process.env.VAPI_BASE_URL || 'https://api.vapi.ai',
            webhookSecret: process.env.VAPI_WEBHOOK_SECRET || ''
        }
    }

    public static getInstance(): VAPIAdminService {
        if (!VAPIAdminService.instance) {
            VAPIAdminService.instance = new VAPIAdminService()
        }
        return VAPIAdminService.instance
    }

    // ==================== PHONE NUMBERS ====================

    /**
     * Listet alle Telefonnummern auf
     */
    public async listPhoneNumbers(): Promise<VAPIPhoneNumber[]> {
        const response = await this.makeRequest<VAPIPhoneNumber[]>('GET', '/phone-number')
        return response
    }

    /**
     * Holt eine spezifische Telefonnummer
     */
    public async getPhoneNumber(id: string): Promise<VAPIPhoneNumber> {
        const response = await this.makeRequest<VAPIPhoneNumber>('GET', `/phone-number/${id}`)
        return response
    }

    /**
     * Aktualisiert eine Telefonnummer (z.B. Assistant zuweisen)
     */
    public async updatePhoneNumber(id: string, data: Partial<VAPIPhoneNumber>): Promise<VAPIPhoneNumber> {
        const response = await this.makeRequest<VAPIPhoneNumber>('PATCH', `/phone-number/${id}`, data)
        return response
    }

    // ==================== ASSISTANTS ====================

    /**
     * Listet alle Assistants auf
     */
    public async listAssistants(): Promise<VAPIAssistant[]> {
        const response = await this.makeRequest<VAPIAssistant[]>('GET', '/assistant')
        return response
    }

    /**
     * Holt einen spezifischen Assistant
     */
    public async getAssistant(id: string): Promise<VAPIAssistant> {
        const response = await this.makeRequest<VAPIAssistant>('GET', `/assistant/${id}`)
        return response
    }

    /**
     * Erstellt einen neuen Assistant
     */
    public async createAssistant(data: {
        name: string
        model: { provider: string; model: string; temperature?: number }
        voice: { provider: string; voiceId: string }
        firstMessage?: string
        instructions?: string
        endCallMessage?: string
        metadata?: Record<string, any>
    }): Promise<VAPIAssistant> {
        const response = await this.makeRequest<VAPIAssistant>('POST', '/assistant', data)
        logger.info(`[VAPI] Assistant erstellt: ${response.id}`, { name: data.name })
        return response
    }

    /**
     * Aktualisiert einen Assistant
     */
    public async updateAssistant(id: string, data: Partial<VAPIAssistant>): Promise<VAPIAssistant> {
        const response = await this.makeRequest<VAPIAssistant>('PATCH', `/assistant/${id}`, data)
        logger.info(`[VAPI] Assistant aktualisiert: ${id}`)
        return response
    }

    /**
     * Löscht einen Assistant
     */
    public async deleteAssistant(id: string): Promise<void> {
        await this.makeRequest('DELETE', `/assistant/${id}`)
        logger.info(`[VAPI] Assistant gelöscht: ${id}`)
    }

    // ==================== CALLS ====================

    /**
     * Listet alle Calls auf
     */
    public async listCalls(params?: {
        assistantId?: string
        phoneNumberId?: string
        limit?: number
        createdAtGt?: string
        createdAtLt?: string
    }): Promise<VAPICall[]> {
        const queryParams = new URLSearchParams()
        if (params?.assistantId) queryParams.append('assistantId', params.assistantId)
        if (params?.phoneNumberId) queryParams.append('phoneNumberId', params.phoneNumberId)
        if (params?.limit) queryParams.append('limit', params.limit.toString())
        if (params?.createdAtGt) queryParams.append('createdAtGt', params.createdAtGt)
        if (params?.createdAtLt) queryParams.append('createdAtLt', params.createdAtLt)

        const query = queryParams.toString()
        const path = query ? `/call?${query}` : '/call'
        return await this.makeRequest<VAPICall[]>('GET', path)
    }

    /**
     * Holt einen spezifischen Call
     */
    public async getCall(id: string): Promise<VAPICall> {
        return await this.makeRequest<VAPICall>('GET', `/call/${id}`)
    }

    /**
     * Startet einen Outbound-Call
     */
    public async createOutboundCall(data: {
        assistantId: string
        phoneNumberId: string
        customer: { number: string; name?: string }
        metadata?: Record<string, any>
    }): Promise<VAPICall> {
        const response = await this.makeRequest<VAPICall>('POST', '/call/phone', data)
        logger.info(`[VAPI] Outbound Call gestartet: ${response.id}`, {
            assistantId: data.assistantId,
            customerNumber: data.customer.number
        })
        return response
    }

    // ==================== WEBHOOK HANDLING ====================

    /**
     * Validiert einen Webhook-Request
     */
    public validateWebhook(signature: string, body: string): boolean {
        if (!this.config.webhookSecret) {
            logger.warn('[VAPI] Webhook-Secret nicht konfiguriert - Validierung übersprungen')
            return true
        }

        // VAPI verwendet HMAC-SHA256 für Webhook-Signaturen
        const crypto = require('crypto')
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(body)
            .digest('hex')

        return signature === expectedSignature
    }

    /**
     * Berechnet Kosten für einen Call basierend auf Dauer
     */
    public calculateCallCost(durationSeconds: number): {
        billableSeconds: number
        costCents: number
    } {
        // Minimum billable duration
        const billableSeconds = Math.max(durationSeconds, VOICE_PRICING.minimumBillableSeconds)
        
        // Kosten berechnen (pro Sekunde)
        const costCents = Math.ceil(billableSeconds * VOICE_PRICING.centsPerSecond)

        return {
            billableSeconds,
            costCents
        }
    }

    // ==================== HELPER ====================

    /**
     * Prüft ob der Service konfiguriert ist
     */
    public isConfigured(): boolean {
        return !!this.config.apiKey
    }

    /**
     * Führt einen API-Request an VAPI durch
     */
    private async makeRequest<T>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        path: string,
        body?: any
    ): Promise<T> {
        if (!this.config.apiKey) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'VAPI_API_KEY nicht konfiguriert'
            )
        }

        const url = `${this.config.baseUrl}${path}`
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
        }

        const options: RequestInit = {
            method,
            headers
        }

        if (body && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(body)
        }

        try {
            const response = await fetch(url, options)

            if (!response.ok) {
                const errorBody = await response.text()
                logger.error(`[VAPI] API-Fehler: ${response.status}`, {
                    path,
                    method,
                    error: errorBody
                })
                throw new InternalFlowiseError(
                    response.status,
                    `VAPI API Fehler: ${errorBody}`
                )
            }

            // DELETE gibt oft keinen Body zurück
            if (method === 'DELETE') {
                return undefined as T
            }

            return await response.json() as T
        } catch (error: any) {
            if (error instanceof InternalFlowiseError) {
                throw error
            }
            logger.error(`[VAPI] Request fehlgeschlagen: ${error.message}`, {
                path,
                method
            })
            throw new InternalFlowiseError(
                StatusCodes.SERVICE_UNAVAILABLE,
                `VAPI nicht erreichbar: ${error.message}`
            )
        }
    }
}

export const vapiAdminService = VAPIAdminService.getInstance()
