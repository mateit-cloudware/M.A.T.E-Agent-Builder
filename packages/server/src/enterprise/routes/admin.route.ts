/**
 * M.A.T.E. SuperAdmin Routes
 * 
 * API endpoints for system-wide administration:
 * - GET /admin/stats - System statistics and metrics
 * - GET /admin/wallets - List all user wallets
 * - GET /admin/wallets/:userId - Get specific user wallet details
 * - POST /admin/wallets/:userId/adjust - Adjust user balance
 * - GET /admin/transactions - List all transactions
 * - GET /admin/analytics - Usage analytics
 * - GET /admin/config - All system configurations
 * - PUT /admin/config/:key - Update single config
 * - PUT /admin/config - Batch update configs
 * - GET /admin/audit-logs - List audit logs
 * - GET /admin/audit-logs/stats - Audit log statistics
 * - POST /admin/audit-logs/verify-integrity - Verify hash chain
 * - POST /admin/audit-logs/export - Export logs (CSV/JSON)
 * 
 * All endpoints require 'users:manage' permission (SuperAdmin)
 */

import express from 'express'
import { AdminController } from '../controllers/admin.controller'
import { SystemConfigController } from '../controllers/system-config.controller'
import auditLogController from '../controllers/audit-log.controller'
import { checkPermission } from '../rbac/PermissionCheck'

const router = express.Router()
const adminController = new AdminController()
const configController = new SystemConfigController()

// All admin routes require users:manage permission
const requireAdminPermission = checkPermission('users:manage')

// System statistics
router.get('/stats', requireAdminPermission, adminController.getSystemStats)

// Wallet management
router.get('/wallets', requireAdminPermission, adminController.getAllWallets)
router.get('/wallets/:userId', requireAdminPermission, adminController.getWalletByUserId)
router.post('/wallets/:userId/adjust', requireAdminPermission, adminController.adjustBalance)

// Transaction audit
router.get('/transactions', requireAdminPermission, adminController.getAllTransactions)

// Analytics
router.get('/analytics', requireAdminPermission, adminController.getAnalytics)

// ===== System Configuration Routes =====
// Get all configs grouped by category
router.get('/config', requireAdminPermission, configController.getAllConfigs)

// Get config status (required configs check)
router.get('/config/status', requireAdminPermission, configController.getConfigStatus)

// Get specific category configs
router.get('/config/llm', requireAdminPermission, configController.getLLMConfig)
router.get('/config/vapi', requireAdminPermission, configController.getVAPIConfig)
router.get('/config/pricing', requireAdminPermission, configController.getPricingConfig)
router.get('/config/limits', requireAdminPermission, configController.getLimitsConfig)
router.get('/config/:category', requireAdminPermission, configController.getConfigsByCategory)

// Update configs
router.put('/config', requireAdminPermission, configController.updateConfigs) // Batch update
router.put('/config/:key', requireAdminPermission, configController.updateConfig) // Single update

// Admin utilities
router.post('/config/initialize', requireAdminPermission, configController.initializeDefaults)
router.post('/config/cache/invalidate', requireAdminPermission, configController.invalidateCache)

// ===== Audit Log Routes (S1.4) =====
router.get('/audit-logs', requireAdminPermission, auditLogController.listAuditLogs)
router.get('/audit-logs/stats', requireAdminPermission, auditLogController.getAuditLogStats)
router.get('/audit-logs/filter-options', requireAdminPermission, auditLogController.getFilterOptions)
router.get('/audit-logs/:id', requireAdminPermission, auditLogController.getAuditLog)
router.post('/audit-logs/verify-integrity', requireAdminPermission, auditLogController.verifyIntegrity)
router.post('/audit-logs/export', requireAdminPermission, auditLogController.exportAuditLogs)
router.post('/audit-logs/run-retention', requireAdminPermission, auditLogController.runRetentionPolicy)

export default router
