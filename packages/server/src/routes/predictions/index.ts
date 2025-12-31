import express from 'express'
import predictionsController from '../../controllers/predictions'
import { getMulterStorage } from '../../utils'
import { requireBalanceForPrediction } from '../../enterprise/middleware/balanceGate'

const router = express.Router()

// NOTE: extractChatflowId function in XSS.ts extracts the chatflow ID from the prediction URL.
// It assumes the URL format is /prediction/{chatflowId}. Make sure to update the function if the URL format changes.
// CREATE
// M.A.T.E.: Balance Gate Middleware prüft Guthaben vor kostenpflichtigen LLM-Calls
router.post(
    ['/', '/:id'],
    getMulterStorage().array('files'),
    requireBalanceForPrediction,
    predictionsController.getRateLimiterMiddleware,
    predictionsController.createPrediction
)

export default router
