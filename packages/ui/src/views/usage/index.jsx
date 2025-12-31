/**
 * M.A.T.E. Nutzungsübersicht / Usage Overview
 * 
 * Zeigt detaillierte Nutzungsstatistiken für den aktuellen Benutzer:
 * - Monatliche Token-Nutzung (getrennt nach LLM und Voice)
 * - Top-Modelle
 * - Kostenaufschlüsselung
 * - Volumen-Rabatt-Status
 */

import { useEffect, useState, useCallback } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Stack,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconRefresh,
    IconBrain,
    IconMicrophone,
    IconCoin,
    IconTrendingUp,
    IconPercentage,
    IconCalendar,
    IconChartBar
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import walletApi from '@/api/wallet'

// ==================== HELPERS ====================

const formatNumber = (num) => {
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`
    }
    return num.toLocaleString('de-DE')
}

const formatEur = (cents) => {
    return `€${(cents / 100).toFixed(2)}`
}

const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (minutes === 0) return `${secs}s`
    return `${minutes}m ${secs}s`
}

const getMonthName = (month) => {
    const months = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ]
    return months[month - 1]
}

// Volume discount tiers
const TOKEN_DISCOUNT_TIERS = [
    { minTokens: 0, discount: 0 },
    { minTokens: 100_000, discount: 5 },
    { minTokens: 500_000, discount: 10 },
    { minTokens: 1_000_000, discount: 15 },
    { minTokens: 5_000_000, discount: 20 }
]

const VOICE_DISCOUNT_TIERS = [
    { minMinutes: 0, discount: 0 },
    { minMinutes: 60, discount: 5 },
    { minMinutes: 300, discount: 10 },
    { minMinutes: 1000, discount: 15 },
    { minMinutes: 5000, discount: 20 }
]

const getCurrentDiscount = (tokens, type, minutes) => {
    if (type === 'token') {
        let discount = 0
        for (const tier of TOKEN_DISCOUNT_TIERS) {
            if (tokens >= (tier.minTokens || 0)) {
                discount = tier.discount
            }
        }
        return discount
    } else {
        let discount = 0
        for (const tier of VOICE_DISCOUNT_TIERS) {
            if ((minutes || 0) >= (tier.minMinutes || 0)) {
                discount = tier.discount
            }
        }
        return discount
    }
}

const getNextDiscountTier = (tokens, type, minutes) => {
    if (type === 'token') {
        for (const tier of TOKEN_DISCOUNT_TIERS) {
            if (tokens < (tier.minTokens || 0)) {
                return { threshold: tier.minTokens || 0, discount: tier.discount }
            }
        }
    } else {
        for (const tier of VOICE_DISCOUNT_TIERS) {
            if ((minutes || 0) < (tier.minMinutes || 0)) {
                return { threshold: tier.minMinutes || 0, discount: tier.discount }
            }
        }
    }
    return null
}

// ==================== COMPONENTS ====================

const StatCard = ({ title, value, subtitle, icon, color }) => {
    const theme = useTheme()
    
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: `${color}20`,
                            color: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    )
}

const DiscountProgress = ({ current, type, minutes }) => {
    const theme = useTheme()
    const currentDiscount = getCurrentDiscount(current, type, minutes)
    const nextTier = getNextDiscountTier(current, type, minutes)
    
    if (!nextTier) {
        return (
            <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                        {type === 'token' ? 'Token-Rabatt' : 'Voice-Rabatt'}
                    </Typography>
                    <Chip 
                        label={`${currentDiscount}% Rabatt`} 
                        color="success" 
                        size="small"
                        icon={<IconPercentage size={14} />}
                    />
                </Stack>
                <Typography variant="caption" color="success.main">
                    Maximaler Rabatt erreicht!
                </Typography>
            </Box>
        )
    }
    
    const value = type === 'token' ? current : (minutes || 0)
    const progress = (value / nextTier.threshold) * 100
    
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                    {type === 'token' ? 'Token-Rabatt' : 'Voice-Rabatt'}
                </Typography>
                <Chip 
                    label={`${currentDiscount}% → ${nextTier.discount}%`} 
                    color="primary" 
                    size="small"
                    icon={<IconTrendingUp size={14} />}
                />
            </Stack>
            <LinearProgress 
                variant="determinate" 
                value={Math.min(progress, 100)} 
                sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 4
                    }
                }}
            />
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                {formatNumber(value)} / {formatNumber(nextTier.threshold)} {type === 'token' ? 'Tokens' : 'Minuten'}
            </Typography>
        </Box>
    )
}

// ==================== MAIN COMPONENT ====================

const UsageOverview = () => {
    const theme = useTheme()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [usage, setUsage] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return { year: now.getFullYear(), month: now.getMonth() + 1 }
    })

    // Generate month options for last 12 months
    const monthOptions = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        monthOptions.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            label: `${getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`
        })
    }

    const fetchUsage = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await walletApi.getUsageSummary(selectedMonth.year, selectedMonth.month)
            if (response.data?.data) {
                setUsage(response.data.data)
            }
        } catch (err) {
            console.error('Error fetching usage:', err)
            setError('Fehler beim Laden der Nutzungsdaten')
        } finally {
            setLoading(false)
        }
    }, [selectedMonth])

    useEffect(() => {
        fetchUsage()
    }, [fetchUsage])

    if (loading && !usage) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <MainCard
            title="Nutzungsübersicht"
            secondary={
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                            value={`${selectedMonth.year}-${selectedMonth.month}`}
                            onChange={(e) => {
                                const [year, month] = e.target.value.split('-').map(Number)
                                setSelectedMonth({ year, month })
                            }}
                            sx={{ bgcolor: 'background.paper' }}
                        >
                            {monthOptions.map((opt) => (
                                <MenuItem 
                                    key={`${opt.year}-${opt.month}`} 
                                    value={`${opt.year}-${opt.month}`}
                                >
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Tooltip title="Aktualisieren">
                        <IconButton onClick={fetchUsage} disabled={loading}>
                            <IconRefresh size={20} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            }
        >
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="LLM Tokens"
                        value={formatNumber(usage?.tokens.total || 0)}
                        subtitle={formatEur(usage?.tokens.costCents || 0)}
                        icon={<IconBrain size={24} />}
                        color={theme.palette.primary.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Voice-Minuten"
                        value={`${usage?.voice.totalMinutes || 0} min`}
                        subtitle={formatEur(usage?.voice.costCents || 0)}
                        icon={<IconMicrophone size={24} />}
                        color={theme.palette.secondary.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Gesamtkosten"
                        value={formatEur(usage?.total.costCents || 0)}
                        subtitle={`${getMonthName(selectedMonth.month)} ${selectedMonth.year}`}
                        icon={<IconCoin size={24} />}
                        color={theme.palette.success.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Ersparnis"
                        value={formatEur(usage?.total.discountAppliedCents || 0)}
                        subtitle="Durch Volumen-Rabatte"
                        icon={<IconPercentage size={24} />}
                        color={theme.palette.warning.main}
                    />
                </Grid>
            </Grid>

            {/* Volume Discount Progress */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <DiscountProgress 
                                current={usage?.tokens.total || 0}
                                type="token"
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <DiscountProgress 
                                current={0}
                                type="voice"
                                minutes={usage?.voice.totalMinutes || 0}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Top Models */}
            {usage?.topModels && usage.topModels.length > 0 && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <IconChartBar size={20} />
                            <Typography variant="h6">
                                Top-Modelle
                            </Typography>
                        </Stack>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Modell</TableCell>
                                        <TableCell align="right">Tokens</TableCell>
                                        <TableCell align="right">Kosten</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {usage.topModels.map((model, index) => (
                                        <TableRow key={model.model}>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Chip 
                                                        label={index + 1} 
                                                        size="small" 
                                                        sx={{ 
                                                            minWidth: 24, 
                                                            height: 24,
                                                            bgcolor: index === 0 ? 'warning.main' : 'grey.300',
                                                            color: index === 0 ? 'warning.contrastText' : 'text.primary'
                                                        }} 
                                                    />
                                                    <Typography variant="body2">
                                                        {model.model}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatNumber(model.tokens)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatEur(model.costCents)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Usage Details */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" mb={2}>
                                Token-Details
                            </Typography>
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Input-Tokens
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatNumber(usage?.tokens.inputTokens || 0)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Output-Tokens
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatNumber(usage?.tokens.outputTokens || 0)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Gesamt-Tokens
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {formatNumber(usage?.tokens.total || 0)}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" mb={2}>
                                Voice-Details
                            </Typography>
                            <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Gesamtdauer
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDuration(usage?.voice.totalSeconds || 0)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        In Minuten
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {usage?.voice.totalMinutes || 0} min
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">
                                        Kosten
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {formatEur(usage?.voice.costCents || 0)}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </MainCard>
    )
}

export default UsageOverview
