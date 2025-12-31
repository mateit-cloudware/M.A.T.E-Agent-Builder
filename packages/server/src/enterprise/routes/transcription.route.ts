/**
 * M.A.T.E. Transcription Routes
 * 
 * API endpoints for call transcription management:
 * - GET /transcriptions - List transcriptions
 * - GET /transcriptions/stats - Get call statistics
 * - GET /transcriptions/:id - Get single transcription
 * - POST /transcriptions - Create transcription (from VAPI webhook)
 * - PUT /transcriptions/:id - Update transcription
 * - DELETE /transcriptions/:id - Delete transcription
 * - POST /transcriptions/:id/summarize - Regenerate AI summary
 */

import express from 'express'
import transcriptionController from '../controllers/transcription.controller'

const router = express.Router()

// Get call statistics (must be before :id route)
router.get('/stats', transcriptionController.getStats)

// List all transcriptions (with filters)
router.get('/', transcriptionController.getTranscriptions)

// Get single transcription
router.get('/:id', transcriptionController.getTranscription)

// Create new transcription
router.post('/', transcriptionController.createTranscription)

// Update transcription
router.put('/:id', transcriptionController.updateTranscription)

// Delete transcription
router.delete('/:id', transcriptionController.deleteTranscription)

// Regenerate AI summary
router.post('/:id/summarize', transcriptionController.regenerateSummary)

export default router
