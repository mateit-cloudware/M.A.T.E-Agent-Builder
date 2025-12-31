import express from 'express'
import {
    handleVAPIWebhook,
    listPhoneNumbers,
    listAssistants,
    createAssistant,
    listCalls,
    getVAPIStatus
} from '../controllers/vapi-webhook.controller'

const router = express.Router()

/**
 * M.A.T.E. VAPI API Routes
 * 
 * Public (für VAPI Webhooks):
 *   POST /webhook - VAPI Webhook Endpoint
 * 
 * Protected (erfordern Auth):
 *   GET /status - VAPI Konfigurationsstatus
 *   GET /phone-numbers - Liste aller Telefonnummern
 *   GET /assistants - Liste aller Assistants
 *   POST /assistants - Neuen Assistant erstellen
 *   GET /calls - Liste der Calls
 */

// Webhook - öffentlich (VAPI benötigt Zugriff ohne Auth)
router.post('/webhook', handleVAPIWebhook)

// Status-Check
router.get('/status', getVAPIStatus)

// Telefonnummern (Admin)
router.get('/phone-numbers', listPhoneNumbers)

// Assistants
router.get('/assistants', listAssistants)
router.post('/assistants', createAssistant)

// Calls
router.get('/calls', listCalls)

export default router
