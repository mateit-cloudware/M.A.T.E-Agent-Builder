/**
 * M.A.T.E. Agent Generator API Client
 * 
 * Provides methods to interact with the AI agent generator API endpoints.
 */
import client from '@/api/client'

// Get wizard configuration
const getWizardConfig = () => client.get('/agent-generator/wizard-config')

// Get example prompts for inspiration
const getExamples = () => client.get('/agent-generator/examples')

// Get available templates
const getTemplates = (category) => {
    const params = category ? `?category=${category}` : ''
    return client.get(`/agent-generator/templates${params}`)
}

// Generate agent from description
const generateAgent = (data) => client.post('/agent-generator/generate', data)

// Save generated agent
const saveAgent = (data) => client.post('/agent-generator/save', data)

export default {
    getWizardConfig,
    getExamples,
    getTemplates,
    generateAgent,
    saveAgent
}
