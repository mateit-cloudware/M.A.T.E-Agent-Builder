/**
 * M.A.T.E. Transcriptions API Client
 * 
 * Provides methods to interact with the transcription API endpoints.
 */
import client from '@/api/client'

// Get all transcriptions (with filters)
const getTranscriptions = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.agentId) queryParams.append('agentId', params.agentId)
    if (params.callStatus) queryParams.append('callStatus', params.callStatus)
    if (params.search) queryParams.append('search', params.search)
    
    const query = queryParams.toString()
    return client.get(`/transcriptions${query ? '?' + query : ''}`)
}

// Get single transcription
const getTranscription = (id) => client.get(`/transcriptions/${id}`)

// Get call statistics
const getStats = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    
    const query = queryParams.toString()
    return client.get(`/transcriptions/stats${query ? '?' + query : ''}`)
}

// Create transcription (used by VAPI webhook integration)
const createTranscription = (data) => client.post('/transcriptions', data)

// Update transcription
const updateTranscription = (id, data) => client.put(`/transcriptions/${id}`, data)

// Delete transcription
const deleteTranscription = (id) => client.delete(`/transcriptions/${id}`)

// Regenerate AI summary
const regenerateSummary = (id) => client.post(`/transcriptions/${id}/summarize`)

export default {
    getTranscriptions,
    getTranscription,
    getStats,
    createTranscription,
    updateTranscription,
    deleteTranscription,
    regenerateSummary
}
