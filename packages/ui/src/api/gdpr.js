/**
 * M.A.T.E. GDPR API Client
 * 
 * Frontend-API-Client für DSGVO-Funktionen:
 * - Consent Management
 * - Datenexport
 * - Datenlöschung
 * - Verarbeitungseinschränkung
 * - Datenschutz-Center
 */

import client from './client'

const GDPR_BASE = '/api/v1/gdpr'

// ==================== CONSENT MANAGEMENT ====================

/**
 * Einwilligung erteilen
 */
const grantConsent = (consentType, options = {}) =>
    client.post(`${GDPR_BASE}/consent`, {
        consentType,
        ...options
    })

/**
 * Einwilligung widerrufen
 */
const withdrawConsent = (consentType, reason) =>
    client.delete(`${GDPR_BASE}/consent/${consentType}`, {
        data: { reason }
    })

/**
 * Alle Einwilligungen abrufen
 */
const getConsents = () =>
    client.get(`${GDPR_BASE}/consents`)

/**
 * Alle Einwilligungen aktualisieren (Cookie-Banner)
 */
const updateAllConsents = (consents) =>
    client.put(`${GDPR_BASE}/consents/all`, { consents })

// ==================== DATA EXPORT ====================

/**
 * Datenexport anfordern
 */
const requestDataExport = (format = 'zip', categories = null) =>
    client.post(`${GDPR_BASE}/export`, {
        format,
        categories
    })

/**
 * Export-Status abrufen
 */
const getExportStatus = (requestId) =>
    client.get(`${GDPR_BASE}/export/${requestId}/status`)

/**
 * Export herunterladen
 */
const downloadExport = (requestId) =>
    client.get(`${GDPR_BASE}/exports/${requestId}/download`, {
        responseType: 'blob'
    })

// ==================== DATA DELETION ====================

/**
 * Löschung anfordern
 */
const requestDeletion = (categories = null, confirmPassword = null) =>
    client.post(`${GDPR_BASE}/deletion`, {
        categories,
        confirmPassword
    })

/**
 * Löschung stornieren
 */
const cancelDeletion = (requestId, reason) =>
    client.post(`${GDPR_BASE}/deletion/${requestId}/cancel`, { reason })

/**
 * Löschstatus abrufen
 */
const getDeletionStatus = (requestId) =>
    client.get(`${GDPR_BASE}/deletion/${requestId}`)

/**
 * Alle Löschanfragen abrufen
 */
const getDeletionRequests = () =>
    client.get(`${GDPR_BASE}/deletions`)

// ==================== PROCESSING RESTRICTION ====================

/**
 * Verarbeitungseinschränkung anfordern
 */
const requestRestriction = (restrictionType, reason, notes = null, endDate = null) =>
    client.post(`${GDPR_BASE}/restriction`, {
        restrictionType,
        reason,
        notes,
        endDate
    })

/**
 * Einschränkung aufheben
 */
const liftRestriction = (restrictionId) =>
    client.delete(`${GDPR_BASE}/restriction/${restrictionId}`)

/**
 * Aktive Einschränkungen abrufen
 */
const getRestrictions = () =>
    client.get(`${GDPR_BASE}/restrictions`)

// ==================== PRIVACY CENTER ====================

/**
 * Datenschutz-Center Übersicht
 */
const getPrivacyCenter = () =>
    client.get(`${GDPR_BASE}/privacy-center`)

// ==================== ADMIN FUNCTIONS ====================

/**
 * GDPR-Statistiken (Admin)
 */
const getGDPRStats = () =>
    client.get(`/api/v1/admin/gdpr/stats`)

/**
 * GDPR-Einstellungen aktualisieren (Admin)
 */
const updateGDPRSettings = (settings) =>
    client.put(`/api/v1/admin/gdpr/settings`, settings)

/**
 * Retention Cleanup ausführen (Admin)
 */
const runRetentionCleanup = () =>
    client.post(`/api/v1/admin/gdpr/run-cleanup`)

export default {
    // Consent
    grantConsent,
    withdrawConsent,
    getConsents,
    updateAllConsents,
    
    // Export
    requestDataExport,
    getExportStatus,
    downloadExport,
    
    // Deletion
    requestDeletion,
    cancelDeletion,
    getDeletionStatus,
    getDeletionRequests,
    
    // Restriction
    requestRestriction,
    liftRestriction,
    getRestrictions,
    
    // Privacy Center
    getPrivacyCenter,
    
    // Admin
    getGDPRStats,
    updateGDPRSettings,
    runRetentionCleanup
}
