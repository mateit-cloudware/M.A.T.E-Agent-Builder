import express from 'express'
import * as tokenUsageController from '../controllers/token-usage.controller'

const router = express.Router()

/**
 * Token Usage Routes
 * 
 * User Routes:
 * - GET /api/v1/token-usage - Eigene Token-Nutzung abrufen
 * - GET /api/v1/token-usage/stats - Aggregierte Statistiken
 * - GET /api/v1/token-usage/models - Verfügbare LLM-Modelle
 * - POST /api/v1/token-usage/estimate - Kosten schätzen
 */

// Verfügbare Modelle (öffentlich)
router.get('/models', tokenUsageController.getAvailableModels)

// User Routes (erfordern Authentifizierung)
router.get('/', tokenUsageController.getTokenUsage)
router.get('/stats', tokenUsageController.getTokenStats)
router.post('/estimate', tokenUsageController.estimateCost)

export default router
