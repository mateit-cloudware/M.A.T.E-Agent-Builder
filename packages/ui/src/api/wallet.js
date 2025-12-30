/**
 * M.A.T.E. Wallet API Client
 * 
 * Provides methods to interact with the wallet API endpoints.
 */
import client from '@/api/client'

// Get full wallet details with usage summary
const getWallet = () => client.get('/wallet')

// Get balance only (lightweight)
const getBalance = () => client.get('/wallet/balance')

// Get transaction history
const getTransactions = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    if (params.usageType) queryParams.append('usageType', params.usageType)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    
    const queryString = queryParams.toString()
    return client.get(`/wallet/transactions${queryString ? `?${queryString}` : ''}`)
}

// Get usage summary for a period
const getUsageSummary = (startDate, endDate) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return client.get(`/wallet/usage?${params.toString()}`)
}

// Get pricing information
const getPricing = () => client.get('/wallet/pricing')

// Estimate cost for an operation
const estimateCost = (body) => client.post('/wallet/estimate', body)

// Update auto-topup settings
const updateAutoTopup = (body) => client.put('/wallet/auto-topup', body)

// Create top-up session
const createTopup = (body) => client.post('/wallet/topup', body)

export default {
    getWallet,
    getBalance,
    getTransactions,
    getUsageSummary,
    getPricing,
    estimateCost,
    updateAutoTopup,
    createTopup
}
