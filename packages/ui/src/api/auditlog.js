/**
 * M.A.T.E. Audit Log API Client
 * 
 * Frontend-API für Audit-Log-Operationen
 */

import client from './client'

// ==================== AUDIT LOG API ====================

/**
 * Listet Audit-Logs mit Filtern
 */
const listAuditLogs = (params) => {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page)
    if (params.pageSize) queryParams.append('pageSize', params.pageSize)
    if (params.category) queryParams.append('category', params.category)
    if (params.action) queryParams.append('action', params.action)
    if (params.status) queryParams.append('status', params.status)
    if (params.riskLevel) queryParams.append('riskLevel', params.riskLevel)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.resourceType) queryParams.append('resourceType', params.resourceType)
    if (params.resourceId) queryParams.append('resourceId', params.resourceId)
    if (params.fromDate) queryParams.append('fromDate', params.fromDate)
    if (params.toDate) queryParams.append('toDate', params.toDate)
    if (params.search) queryParams.append('search', params.search)
    
    const queryString = queryParams.toString()
    const url = queryString 
        ? `/api/v1/admin/audit-logs?${queryString}` 
        : '/api/v1/admin/audit-logs'
    
    return client.get(url)
}

/**
 * Holt einen einzelnen Audit-Log-Eintrag
 */
const getAuditLog = (id) => {
    return client.get(`/api/v1/admin/audit-logs/${id}`)
}

/**
 * Holt Audit-Log-Statistiken
 */
const getStats = (params = {}) => {
    const hours = params.hours || 24
    return client.get(`/api/v1/admin/audit-logs/stats?hours=${hours}`)
}

/**
 * Prüft die Hash-Ketten-Integrität
 */
const verifyIntegrity = (params = {}) => {
    return client.post('/api/v1/admin/audit-logs/verify-integrity', params)
}

/**
 * Exportiert Audit-Logs
 */
const exportLogs = (params) => {
    return client.post('/api/v1/admin/audit-logs/export', params, {
        responseType: 'blob'
    })
}

/**
 * Führt die Retention-Policy manuell aus
 */
const runRetentionPolicy = () => {
    return client.post('/api/v1/admin/audit-logs/run-retention')
}

/**
 * Holt verfügbare Filter-Optionen
 */
const getFilterOptions = () => {
    return client.get('/api/v1/admin/audit-logs/filter-options')
}

// ==================== EXPORT ====================

export default {
    listAuditLogs,
    getAuditLog,
    getStats,
    verifyIntegrity,
    exportLogs,
    runRetentionPolicy,
    getFilterOptions
}
