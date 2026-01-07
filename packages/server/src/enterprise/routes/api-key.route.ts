/**
 * M.A.T.E. API Key Management Routes
 * 
 * BYOK (Bring Your Own Key) endpoints for users to manage their own LLM API keys.
 * These keys are stored encrypted with AES-256-GCM and validated before storage.
 * 
 * API endpoints:
 * - POST /api-keys/validate - Validate API key before saving
 * - POST /api-keys - Create and store encrypted API key
 * - GET /api-keys - List all user's API keys
 * - GET /api-keys/:id - Get specific API key details (without decrypted key)
 * - DELETE /api-keys/:id - Soft-delete API key
 * - PATCH /api-keys/:id/revalidate - Re-validate existing key
 */

import express from 'express'
import { APIKeyController } from '../controllers/api-key.controller'

const router = express.Router()
const apiKeyController = new APIKeyController()

// Validation endpoint (no auth required for testing, but recommended to add auth)
router.post('/validate', apiKeyController.validateKey)

// Protected endpoints - require authentication
// Note: Auth middleware is applied at the app level

// Create new API key (with validation)
router.post('/', apiKeyController.createKey)

// List all user's API keys (sanitized, no plaintext keys)
router.get('/', apiKeyController.listKeys)

// Get specific API key details
router.get('/:id', apiKeyController.getKey)

// Delete API key (soft delete)
router.delete('/:id', apiKeyController.deleteKey)

// Re-validate existing key
router.patch('/:id/revalidate', apiKeyController.revalidateKey)

export default router
