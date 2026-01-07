import client from './client'

/**
 * BYOK (Bring Your Own Key) API
 * 
 * API functions for managing user's own LLM API keys
 */

// Validate API key before saving (test-call to provider)
const validateAPIKey = (body) => client.post('/api-keys/validate', body)

// Create and store encrypted API key
const createAPIKey = (body) => client.post('/api-keys', body)

// List all user's API keys (sanitized)
const getAllAPIKeys = () => client.get('/api-keys')

// Get specific API key details
const getAPIKey = (id) => client.get(`/api-keys/${id}`)

// Delete API key (soft delete)
const deleteAPIKey = (id) => client.delete(`/api-keys/${id}`)

// Re-validate existing key
const revalidateAPIKey = (id) => client.patch(`/api-keys/${id}/revalidate`)

export default {
    validateAPIKey,
    createAPIKey,
    getAllAPIKeys,
    getAPIKey,
    deleteAPIKey,
    revalidateAPIKey
}
