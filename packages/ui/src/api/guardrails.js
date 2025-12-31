/**
 * M.A.T.E. Guardrails API Client
 * 
 * Provides methods to interact with the guardrails API endpoints.
 * Manages scanner configurations, masking rules, and audit logs.
 */
import client from '@/api/client'

// ===== Configuration =====

// Get all guardrail configurations
const getAllConfigs = () => client.get('/guardrails/config')

// Get configuration by category
const getConfigByCategory = (category) => client.get(`/guardrails/config/${category}`)

// Update single configuration
const updateConfig = (configId, data) => client.put(`/guardrails/config/${configId}`, data)

// Create new configuration
const createConfig = (data) => client.post('/guardrails/config', data)

// Delete configuration
const deleteConfig = (configId) => client.delete(`/guardrails/config/${configId}`)

// Bulk update configurations
const bulkUpdateConfigs = (configs) => client.put('/guardrails/config/bulk', { configs })

// ===== Scanner Operations =====

// Get scanner status (all scanners)
const getScannerStatus = () => client.get('/guardrails/scanners/status')

// Enable/disable specific scanner
const toggleScanner = (scannerName, enabled) => 
    client.post(`/guardrails/scanners/${scannerName}/toggle`, { enabled })

// Test scanner with sample text
const testScanner = (scannerName, text) => 
    client.post(`/guardrails/scanners/${scannerName}/test`, { text })

// ===== Masking Operations =====

// Get all masking rules
const getMaskingRules = () => client.get('/guardrails/masking/rules')

// Update masking rule
const updateMaskingRule = (ruleId, data) => 
    client.put(`/guardrails/masking/rules/${ruleId}`, data)

// Create new masking rule
const createMaskingRule = (data) => client.post('/guardrails/masking/rules', data)

// Delete masking rule
const deleteMaskingRule = (ruleId) => client.delete(`/guardrails/masking/rules/${ruleId}`)

// Test masking on sample text
const testMasking = (text, options) => 
    client.post('/guardrails/masking/test', { text, options })

// ===== Audit Logs =====

// Get audit logs with filters
const getAuditLogs = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    if (params.category) queryParams.append('category', params.category)
    if (params.severity) queryParams.append('severity', params.severity)
    if (params.action) queryParams.append('action', params.action)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.chatflowId) queryParams.append('chatflowId', params.chatflowId)
    
    const queryString = queryParams.toString()
    return client.get(`/guardrails/audit${queryString ? `?${queryString}` : ''}`)
}

// Get single audit log by ID
const getAuditLogById = (logId) => client.get(`/guardrails/audit/${logId}`)

// Get audit log statistics
const getAuditStats = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.groupBy) queryParams.append('groupBy', params.groupBy)
    
    const queryString = queryParams.toString()
    return client.get(`/guardrails/audit/stats${queryString ? `?${queryString}` : ''}`)
}

// ===== Analytics =====

// Get guardrails analytics summary
const getAnalyticsSummary = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    
    const queryString = queryParams.toString()
    return client.get(`/guardrails/analytics/summary${queryString ? `?${queryString}` : ''}`)
}

// Get detection trends over time
const getDetectionTrends = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.interval) queryParams.append('interval', params.interval)
    
    const queryString = queryParams.toString()
    return client.get(`/guardrails/analytics/trends${queryString ? `?${queryString}` : ''}`)
}

// Get top detection categories
const getTopCategories = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    
    const queryString = queryParams.toString()
    return client.get(`/guardrails/analytics/categories${queryString ? `?${queryString}` : ''}`)
}

// Get detection by severity
const getDetectionBySeverity = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    
    const queryString = queryParams.toString()
    return client.get(`/guardrails/analytics/severity${queryString ? `?${queryString}` : ''}`)
}

// ===== Quick Actions =====

// Quick test for guardrails (input text, get result)
const quickTest = (text, direction = 'input') => 
    client.post('/guardrails/test', { text, direction })

// Get current guardrails status (enabled/disabled, stats)
const getStatus = () => client.get('/guardrails/status')

// Enable/disable guardrails globally
const toggleGuardrails = (enabled) => 
    client.post('/guardrails/toggle', { enabled })

// Reset all configurations to defaults
const resetToDefaults = () => client.post('/guardrails/reset')

export default {
    // Configuration
    getAllConfigs,
    getConfigByCategory,
    updateConfig,
    createConfig,
    deleteConfig,
    bulkUpdateConfigs,
    // Scanners
    getScannerStatus,
    toggleScanner,
    testScanner,
    // Masking
    getMaskingRules,
    updateMaskingRule,
    createMaskingRule,
    deleteMaskingRule,
    testMasking,
    // Audit
    getAuditLogs,
    getAuditLogById,
    getAuditStats,
    // Analytics
    getAnalyticsSummary,
    getDetectionTrends,
    getTopCategories,
    getDetectionBySeverity,
    // Quick Actions
    quickTest,
    getStatus,
    toggleGuardrails,
    resetToDefaults
}
