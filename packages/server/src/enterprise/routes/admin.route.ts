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
 * 
 * All endpoints require 'users:manage' permission (SuperAdmin)
 */

import express from 'express'
import { AdminController } from '../controllers/admin.controller'
import { checkPermission } from '../rbac/PermissionCheck'

const router = express.Router()
const adminController = new AdminController()

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

export default router
