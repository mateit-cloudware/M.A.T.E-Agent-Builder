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

// ===== System Configuration =====

// Get all system configurations grouped by category
const getAllConfigs = () => client.get('/admin/config')

// Get config status (check required configs)
const getConfigStatus = () => client.get('/admin/config/status')

// Get configs by category
const getConfigsByCategory = (category) => client.get(`/admin/config/${category}`)

// Get LLM config summary
const getLLMConfig = () => client.get('/admin/config/llm')

// Get VAPI config summary
const getVAPIConfig = () => client.get('/admin/config/vapi')

// Get pricing config
const getPricingConfig = () => client.get('/admin/config/pricing')

// Get limits config
const getLimitsConfig = () => client.get('/admin/config/limits')

// Update single config
const updateConfig = (key, value) => client.put(`/admin/config/${key}`, { value })

// Batch update configs
const updateConfigs = (configs) => client.put('/admin/config', { configs })

// Initialize default configs
const initializeConfigs = () => client.post('/admin/config/initialize')

// Invalidate config cache
const invalidateConfigCache = () => client.post('/admin/config/cache/invalidate')

export default {
    getSystemStats,
    getAllWallets,
    getWalletByUserId,
    adjustBalance,
    getAllTransactions,
    getAnalytics,
    // Config
    getAllConfigs,
    getConfigStatus,
    getConfigsByCategory,
    getLLMConfig,
    getVAPIConfig,
    getPricingConfig,
    getLimitsConfig,
    updateConfig,
    updateConfigs,
    initializeConfigs,
    invalidateConfigCache
}
