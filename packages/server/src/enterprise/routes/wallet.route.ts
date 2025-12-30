/**
 * M.A.T.E. Wallet Routes
 * 
 * API endpoints for wallet management:
 * - GET /wallet - Get wallet details
 * - GET /wallet/balance - Get balance only
 * - GET /wallet/transactions - Get transaction history
 * - GET /wallet/usage - Get usage summary
 * - GET /wallet/pricing - Get pricing info
 * - PUT /wallet/auto-topup - Update auto-topup settings
 * - POST /wallet/topup - Create top-up session
 * - POST /wallet/estimate - Estimate cost
 * - POST /wallet/webhook/stripe - Stripe webhook
 */

import express from 'express'
import { WalletController } from '../controllers/wallet.controller'

const router = express.Router()
const walletController = new WalletController()

// Public endpoint - pricing info
router.get('/pricing', walletController.getPricing)

// Public endpoint - cost estimation
router.post('/estimate', walletController.estimateCost)

// Protected endpoints - require authentication
// Note: Auth middleware is applied at the app level

// Get wallet details with usage summary
router.get('/', walletController.getWallet)

// Get balance only (lightweight)
router.get('/balance', walletController.getBalance)

// Get transaction history
router.get('/transactions', walletController.getTransactions)

// Get usage summary for a period
router.get('/usage', walletController.getUsageSummary)

// Update auto-topup settings
router.put('/auto-topup', walletController.updateAutoTopup)

// Create top-up session (initiates Stripe checkout)
router.post('/topup', walletController.createTopup)

// Stripe webhook (no auth - uses Stripe signature verification)
router.post('/webhook/stripe', walletController.handleStripeWebhook)

export default router
