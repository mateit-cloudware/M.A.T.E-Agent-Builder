/**
 * M.A.T.E. Admin API Client
 * 
 * Provides methods to interact with the admin API endpoints.
 * Requires 'users:manage' permission.
 */
import client from '@/api/client'

// Get system-wide statistics
const getSystemStats = () => client.get('/admin/stats')

// Get all wallets (paginated)
const getAllWallets = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    if (params.search) queryParams.append('search', params.search)
    if (params.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    
    const queryString = queryParams.toString()
    return client.get(`/admin/wallets${queryString ? `?${queryString}` : ''}`)
}

// Get specific wallet by user ID
const getWalletByUserId = (userId) => client.get(`/admin/wallets/${userId}`)

// Adjust wallet balance (admin action)
const adjustBalance = (userId, amountEur, reason) => 
    client.post(`/admin/wallets/${userId}/adjust`, { amountEur, reason })

// Get all transactions (paginated)
const getAllTransactions = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit)
    if (params.offset) queryParams.append('offset', params.offset)
    if (params.userId) queryParams.append('userId', params.userId)
    if (params.type) queryParams.append('type', params.type)
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    
    const queryString = queryParams.toString()
    return client.get(`/admin/transactions${queryString ? `?${queryString}` : ''}`)
}

// Get analytics data
const getAnalytics = (params = {}) => {
    const queryParams = new URLSearchParams()
    if (params.startDate) queryParams.append('startDate', params.startDate)
    if (params.endDate) queryParams.append('endDate', params.endDate)
    if (params.groupBy) queryParams.append('groupBy', params.groupBy)
    
    const queryString = queryParams.toString()
    return client.get(`/admin/analytics${queryString ? `?${queryString}` : ''}`)
}

export default {
    getSystemStats,
    getAllWallets,
    getWalletByUserId,
    adjustBalance,
    getAllTransactions,
    getAnalytics
}
