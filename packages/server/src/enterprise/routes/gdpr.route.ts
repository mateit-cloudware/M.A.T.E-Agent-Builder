/**
 * M.A.T.E. GDPR User Routes
 * 
 * API endpoints für DSGVO-Compliance (Benutzer-seitig):
 * 
 * Consent Management:
 * - POST /gdpr/consent - Einwilligung erteilen
 * - DELETE /gdpr/consent/:consentType - Einwilligung widerrufen
 * - GET /gdpr/consents - Alle Einwilligungen abrufen
 * - PUT /gdpr/consents/all - Alle Einwilligungen aktualisieren
 * 
 * Datenexport (Art. 15 & 20):
 * - POST /gdpr/export - Datenexport anfordern
 * - GET /gdpr/export/:requestId/status - Export-Status
 * - GET /gdpr/exports/:requestId/download - Export herunterladen
 * 
 * Datenlöschung (Art. 17):
 * - POST /gdpr/deletion - Löschung anfordern
 * - POST /gdpr/deletion/:requestId/cancel - Löschung stornieren
 * - GET /gdpr/deletion/:requestId - Löschstatus
 * - GET /gdpr/deletions - Alle Löschanfragen
 * 
 * Verarbeitungseinschränkung (Art. 18):
 * - POST /gdpr/restriction - Einschränkung anfordern
 * - DELETE /gdpr/restriction/:restrictionId - Einschränkung aufheben
 * - GET /gdpr/restrictions - Aktive Einschränkungen
 * 
 * Datenschutz-Center:
 * - GET /gdpr/privacy-center - Übersicht aller Datenschutz-Optionen
 */

import express from 'express'
import gdprController from '../controllers/gdpr.controller'

const router = express.Router()

// ===== Consent Management =====
router.post('/consent', gdprController.grantConsent)
router.delete('/consent/:consentType', gdprController.withdrawConsent)
router.get('/consents', gdprController.getConsents)
router.put('/consents/all', gdprController.updateAllConsents)

// ===== Data Export (Art. 15 & 20 DSGVO) =====
router.post('/export', gdprController.requestDataExport)
router.get('/export/:requestId/status', gdprController.getExportStatus)
router.get('/exports/:requestId/download', gdprController.downloadExport)

// ===== Data Deletion (Art. 17 DSGVO) =====
router.post('/deletion', gdprController.requestDeletion)
router.post('/deletion/:requestId/cancel', gdprController.cancelDeletion)
router.get('/deletion/:requestId', gdprController.getDeletionStatus)
router.get('/deletions', gdprController.getUserDeletionRequests)

// ===== Processing Restriction (Art. 18 DSGVO) =====
router.post('/restriction', gdprController.requestProcessingRestriction)
router.delete('/restriction/:restrictionId', gdprController.liftProcessingRestriction)
router.get('/restrictions', gdprController.getProcessingRestrictions)

// ===== Privacy Center =====
router.get('/privacy-center', gdprController.getPrivacyCenter)

export default router
