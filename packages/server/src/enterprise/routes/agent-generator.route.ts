/**
 * M.A.T.E. Agent Generator Routes
 * 
 * API endpoints for AI-powered agent generation:
 * - POST /agent-generator/generate - Generate agent from description
 * - GET /agent-generator/templates - Get available templates
 * - POST /agent-generator/save - Save generated agent
 * - GET /agent-generator/wizard-config - Get wizard configuration
 * - GET /agent-generator/examples - Get example prompts
 */

import express from 'express'
import { AgentGeneratorController } from '../controllers/agent-generator.controller'

const router = express.Router()
const agentGeneratorController = new AgentGeneratorController()

// Get wizard configuration (public - for onboarding)
router.get('/wizard-config', agentGeneratorController.getWizardConfig)

// Get example prompts (public - for inspiration)
router.get('/examples', agentGeneratorController.getExamples)

// Protected endpoints - require authentication

// Get available templates
router.get('/templates', agentGeneratorController.getTemplates)

// Generate agent from description
router.post('/generate', agentGeneratorController.generateAgent)

// Save generated agent
router.post('/save', agentGeneratorController.saveAgent)

export default router
