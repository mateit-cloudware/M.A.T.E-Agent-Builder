/**
 * M.A.T.E. Wallet View
 * 
 * Displays wallet balance, usage statistics, and transaction history.
 * Allows users to top up their balance and manage auto-topup settings.
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    CircularProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Divider,
    Switch,
    FormControlLabel,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    IconButton,
    Tooltip,
    Stack
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconWallet,
    IconCoin,
    IconChartLine,
    IconMicrophone,
    IconBrain,
    IconRefresh,
    IconPlus,
    IconSettings,
    IconHistory
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import walletApi from '@/api/wallet'

// Helper to format currency
const formatEur = (cents) => {
    if (cents === undefined || cents === null) return '€0.00'
    return `€${(cents / 100).toFixed(2)}`
}

// Helper to format date
const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Transaction type labels
const transactionTypeLabels = {
    TOPUP: { label: 'Aufladung', color: 'success' },
    AUTO_TOPUP: { label: 'Auto-Aufladung', color: 'success' },
    USAGE: { label: 'Nutzung', color: 'warning' },
    REFUND: { label: 'Erstattung', color: 'info' }
}

// Usage type labels
const usageTypeLabels = {
    VOICE: { label: 'Voice', icon: IconMicrophone },
    LLM: { label: 'LLM', icon: IconBrain }
}

const Wallet = () => {
    const theme = useTheme()
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [wallet, setWallet] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [pricing, setPricing] = useState(null)
    const [topupDialogOpen, setTopupDialogOpen] = useState(false)
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
    const [topupAmount, setTopupAmount] = useState('25')
    const [autoTopupEnabled, setAutoTopupEnabled] = useState(false)
    const [autoTopupThreshold, setAutoTopupThreshold] = useState('5')
    const [autoTopupAmount, setAutoTopupAmount] = useState('25')

    // Fetch wallet data
    const fetchWalletData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const [walletRes, transactionsRes, pricingRes] = await Promise.all([
                walletApi.getWallet(),
                walletApi.getTransactions({ limit: 10 }),
                walletApi.getPricing()
            ])

            if (walletRes.data?.data) {
                const walletData = walletRes.data.data
                setWallet(walletData)
                setAutoTopupEnabled(walletData.wallet?.autoTopupEnabled || false)
                setAutoTopupThreshold((walletData.wallet?.autoTopupThresholdEur || '5').toString())
                setAutoTopupAmount((walletData.wallet?.autoTopupAmountEur || '25').toString())
            }

            if (transactionsRes.data?.data?.transactions) {
                setTransactions(transactionsRes.data.data.transactions)
            }

            if (pricingRes.data?.data) {
                setPricing(pricingRes.data.data)
            }
        } catch (err) {
            console.error('Error fetching wallet data:', err)
            setError('Fehler beim Laden der Wallet-Daten')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchWalletData()
    }, [fetchWalletData])

    // Handle top-up
    const handleTopup = async () => {
        try {
            const response = await walletApi.createTopup({ amountEur: parseFloat(topupAmount) })
            if (response.data?.data?.checkoutUrl) {
                // In production, redirect to Stripe checkout
                window.location.href = response.data.data.checkoutUrl
            }
            setTopupDialogOpen(false)
        } catch (err) {
            console.error('Error creating topup:', err)
            setError('Fehler beim Erstellen der Aufladung')
        }
    }

    // Handle auto-topup settings
    const handleSaveAutoTopup = async () => {
        try {
            await walletApi.updateAutoTopup({
                enabled: autoTopupEnabled,
                thresholdEur: parseFloat(autoTopupThreshold),
                amountEur: parseFloat(autoTopupAmount)
            })
            setSettingsDialogOpen(false)
            fetchWalletData()
        } catch (err) {
            console.error('Error updating auto-topup:', err)
            setError('Fehler beim Speichern der Einstellungen')
        }
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <MainCard title="Wallet & Abrechnung">
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Balance Card */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ 
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'white'
                    }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <IconWallet size={24} />
                                <Typography variant="h6">Guthaben</Typography>
                            </Stack>
                            <Typography variant="h2" fontWeight="bold">
                                {formatEur(wallet?.wallet?.balanceCents || 0)}
                            </Typography>
                            <Box mt={2}>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<IconPlus size={18} />}
                                    onClick={() => setTopupDialogOpen(true)}
                                    sx={{ mr: 1 }}
                                >
                                    Aufladen
                                </Button>
                                <IconButton
                                    color="inherit"
                                    onClick={() => setSettingsDialogOpen(true)}
                                >
                                    <IconSettings size={20} />
                                </IconButton>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Voice Usage Card */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <IconMicrophone size={24} color={theme.palette.primary.main} />
                                <Typography variant="h6">Voice-Nutzung (Monat)</Typography>
                            </Stack>
                            <Typography variant="h3" color="primary">
                                {wallet?.thisMonth?.totalVoiceMinutes || 0} Min
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Kosten: {formatEur(parseFloat(wallet?.thisMonth?.totalVoiceCostEur || 0) * 100)}
                            </Typography>
                            {pricing && (
                                <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                                    Preis: {pricing.voice?.eurPerMinute}/Minute
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* LLM Usage Card */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <IconBrain size={24} color={theme.palette.secondary.main} />
                                <Typography variant="h6">LLM-Nutzung (Monat)</Typography>
                            </Stack>
                            <Typography variant="h3" color="secondary">
                                {(wallet?.thisMonth?.totalTokens || 0).toLocaleString('de-DE')} Tokens
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Kosten: {formatEur(parseFloat(wallet?.thisMonth?.totalLLMCostEur || 0) * 100)}
                            </Typography>
                            {pricing && (
                                <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                                    Preis: {pricing.llm?.eurPer1kTokens}/1.000 Tokens
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Transaction History */}
            <Box mt={4}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconHistory size={24} />
                        <Typography variant="h5">Transaktionsverlauf</Typography>
                    </Stack>
                    <Tooltip title="Aktualisieren">
                        <IconButton onClick={fetchWalletData}>
                            <IconRefresh size={20} />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Datum</TableCell>
                                <TableCell>Typ</TableCell>
                                <TableCell>Beschreibung</TableCell>
                                <TableCell align="right">Betrag</TableCell>
                                <TableCell align="right">Guthaben</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="textSecondary">
                                            Keine Transaktionen vorhanden
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => {
                                    const typeInfo = transactionTypeLabels[tx.type] || { label: tx.type, color: 'default' }
                                    const UsageIcon = tx.usageType ? usageTypeLabels[tx.usageType]?.icon : null

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{formatDate(tx.createdAt)}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Chip 
                                                        label={typeInfo.label} 
                                                        color={typeInfo.color} 
                                                        size="small" 
                                                    />
                                                    {UsageIcon && <UsageIcon size={16} />}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>{tx.description || '-'}</TableCell>
                                            <TableCell align="right">
                                                <Typography
                                                    color={tx.isCredit ? 'success.main' : 'error.main'}
                                                    fontWeight="medium"
                                                >
                                                    {tx.isCredit ? '+' : '-'}{tx.amountEur}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {tx.balanceAfterEur}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            {/* Top-up Dialog */}
            <Dialog open={topupDialogOpen} onClose={() => setTopupDialogOpen(false)}>
                <DialogTitle>Guthaben aufladen</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                        Mindestbetrag: {pricing?.topup?.minimumEur || '€10.00'}
                    </Typography>
                    <Grid container spacing={2} mb={2}>
                        {['10', '25', '50', '100'].map((amount) => (
                            <Grid item xs={3} key={amount}>
                                <Button
                                    variant={topupAmount === amount ? 'contained' : 'outlined'}
                                    fullWidth
                                    onClick={() => setTopupAmount(amount)}
                                >
                                    €{amount}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                    <TextField
                        label="Benutzerdefinierter Betrag (€)"
                        type="number"
                        fullWidth
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        inputProps={{ min: 10, step: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTopupDialogOpen(false)}>Abbrechen</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleTopup}
                        disabled={parseFloat(topupAmount) < 10}
                    >
                        €{topupAmount} aufladen
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Auto-Topup Settings Dialog */}
            <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)}>
                <DialogTitle>Auto-Aufladung Einstellungen</DialogTitle>
                <DialogContent>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoTopupEnabled}
                                onChange={(e) => setAutoTopupEnabled(e.target.checked)}
                            />
                        }
                        label="Auto-Aufladung aktivieren"
                    />
                    <Typography variant="body2" color="textSecondary" mb={2}>
                        Automatisch aufladen, wenn das Guthaben unter einen bestimmten Betrag fällt.
                    </Typography>
                    <TextField
                        label="Schwellenwert (€)"
                        type="number"
                        fullWidth
                        value={autoTopupThreshold}
                        onChange={(e) => setAutoTopupThreshold(e.target.value)}
                        disabled={!autoTopupEnabled}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Aufladebetrag (€)"
                        type="number"
                        fullWidth
                        value={autoTopupAmount}
                        onChange={(e) => setAutoTopupAmount(e.target.value)}
                        disabled={!autoTopupEnabled}
                        inputProps={{ min: 10 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsDialogOpen(false)}>Abbrechen</Button>
                    <Button variant="contained" onClick={handleSaveAutoTopup}>
                        Speichern
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>
    )
}

export default Wallet
