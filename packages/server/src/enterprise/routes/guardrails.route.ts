/**
 * M.A.T.E. Guardrails Routes
 * 
 * API-Routen für Guardrails-Verwaltung und Analytics
 */

import express from 'express'
import { guardrailsController } from '../services/guardrails/guardrails.controller'
import { checkPermission } from '../rbac/PermissionCheck'

const router = express.Router()

// Alle Routen erfordern users:manage Berechtigung
const requireAdminPermission = checkPermission('users:manage')

// ==================== KONFIGURATION ====================

// Alle Konfigurationen abrufen
router.get('/config', 
    requireAdminPermission,
    guardrailsController.getAllConfigs.bind(guardrailsController)
)

// Konfigurationen nach Kategorie abrufen
router.get('/config/:category', 
    requireAdminPermission,
    guardrailsController.getConfigsByCategory.bind(guardrailsController)
)

// Konfiguration erstellen
router.post('/config', 
    requireAdminPermission,
    guardrailsController.createConfig.bind(guardrailsController)
)

// Konfiguration aktualisieren
router.put('/config/:id', 
    requireAdminPermission,
    guardrailsController.updateConfig.bind(guardrailsController)
)

// Konfiguration löschen
router.delete('/config/:id', 
    requireAdminPermission,
    guardrailsController.deleteConfig.bind(guardrailsController)
)

// ==================== STATUS & HEALTH ====================

// Guardrails-Status abrufen
router.get('/status', 
    requireAdminPermission,
    guardrailsController.getStatus.bind(guardrailsController)
)

// Health-Check
router.get('/health', 
    requireAdminPermission,
    guardrailsController.getHealth.bind(guardrailsController)
)

// ==================== STATISTIKEN & AUDIT ====================

// Statistiken abrufen
router.get('/stats', 
    requireAdminPermission,
    guardrailsController.getStatistics.bind(guardrailsController)
)

// Audit-Logs abrufen
router.get('/audit', 
    requireAdminPermission,
    guardrailsController.getAuditLogs.bind(guardrailsController)
)

// ==================== TEST ====================

// Text testen
router.post('/test', 
    requireAdminPermission,
    guardrailsController.testText.bind(guardrailsController)
)

export default router
