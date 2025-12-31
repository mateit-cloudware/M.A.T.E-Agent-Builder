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
const getUsageSummary = (year, month) => {
    const params = new URLSearchParams()
    if (year) params.append('year', year)
    if (month) params.append('month', month)
    return client.get(`/wallet/usage?${params.toString()}`)
}

// Get invoice data for a month
const getInvoice = (year, month) => {
    return client.get(`/wallet/invoice/${year}/${month}`)
}

// Download invoice as PDF
const downloadInvoicePDF = (year, month) => {
    return client.get(`/wallet/invoice/${year}/${month}/pdf`, { responseType: 'blob' })
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
    getInvoice,
    downloadInvoicePDF,
    getPricing,
    estimateCost,
    updateAutoTopup,
    createTopup
}
