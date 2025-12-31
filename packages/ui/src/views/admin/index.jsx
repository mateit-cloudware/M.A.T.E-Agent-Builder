/**
 * M.A.T.E. SuperAdmin Dashboard
 * 
 * Displays system statistics, user wallets, and allows admins
 * to manage user balances and view transaction history.
 * 
 * Requires 'users:manage' permission.
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    IconButton,
    Tooltip,
    Stack,
    Chip,
    TablePagination,
    Tabs,
    Tab,
    InputAdornment
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconUsers,
    IconWallet,
    IconChartLine,
    IconRefresh,
    IconSearch,
    IconPlus,
    IconMinus,
    IconEye,
    IconMicrophone,
    IconBrain,
    IconCoin,
    IconSettings
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import adminApi from '@/api/admin'

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
    REFUND: { label: 'Erstattung', color: 'info' },
    ADJUSTMENT: { label: 'Admin-Anpassung', color: 'secondary' }
}

// Stats Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
    const theme = useTheme()
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography color="textSecondary" variant="subtitle2" sx={{ mb: 1 }}>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: color || theme.palette.primary.light
                        }}
                    >
                        <Icon size={24} color={theme.palette.primary.main} />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    )
}

// Tab Panel Component
const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
)

const AdminDashboard = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [tabValue, setTabValue] = useState(0)
    
    // Stats state
    const [stats, setStats] = useState(null)
    
    // Wallets state
    const [wallets, setWallets] = useState([])
    const [walletsPage, setWalletsPage] = useState(0)
    const [walletsRowsPerPage, setWalletsRowsPerPage] = useState(10)
    const [walletsTotal, setWalletsTotal] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    
    // Transactions state
    const [transactions, setTransactions] = useState([])
    const [transactionsPage, setTransactionsPage] = useState(0)
    const [transactionsRowsPerPage, setTransactionsRowsPerPage] = useState(10)
    const [transactionsTotal, setTransactionsTotal] = useState(0)
    
    // Adjust balance dialog
    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [adjustType, setAdjustType] = useState('add') // 'add' or 'subtract'

    // Fetch system stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await adminApi.getSystemStats()
            if (response.data?.data) {
                setStats(response.data.data)
            }
        } catch (err) {
            console.error('Error fetching stats:', err)
        }
    }, [])

    // Fetch wallets
    const fetchWallets = useCallback(async () => {
        try {
            const response = await adminApi.getAllWallets({
                limit: walletsRowsPerPage,
                offset: walletsPage * walletsRowsPerPage,
                search: searchQuery || undefined
            })
            if (response.data?.data) {
                setWallets(response.data.data.wallets || [])
                setWalletsTotal(response.data.data.total || 0)
            }
        } catch (err) {
            console.error('Error fetching wallets:', err)
        }
    }, [walletsPage, walletsRowsPerPage, searchQuery])

    // Fetch transactions
    const fetchTransactions = useCallback(async () => {
        try {
            const response = await adminApi.getAllTransactions({
                limit: transactionsRowsPerPage,
                offset: transactionsPage * transactionsRowsPerPage
            })
            if (response.data?.data) {
                setTransactions(response.data.data.transactions || [])
                setTransactionsTotal(response.data.data.total || 0)
            }
        } catch (err) {
            console.error('Error fetching transactions:', err)
        }
    }, [transactionsPage, transactionsRowsPerPage])

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await Promise.all([fetchStats(), fetchWallets(), fetchTransactions()])
            setLoading(false)
        }
        loadData()
    }, [fetchStats, fetchWallets, fetchTransactions])

    // Handle wallet search
    const handleSearch = () => {
        setWalletsPage(0)
        fetchWallets()
    }

    // Open adjust balance dialog
    const handleOpenAdjustDialog = (user, type = 'add') => {
        setSelectedUser(user)
        setAdjustType(type)
        setAdjustAmount('')
        setAdjustReason('')
        setAdjustDialogOpen(true)
    }

    // Handle balance adjustment
    const handleAdjustBalance = async () => {
        if (!selectedUser || !adjustAmount || !adjustReason) return

        try {
            const amount = parseFloat(adjustAmount)
            const finalAmount = adjustType === 'subtract' ? -amount : amount
            
            await adminApi.adjustBalance(selectedUser.userId, finalAmount, adjustReason)
            setAdjustDialogOpen(false)
            
            // Refresh data
            await Promise.all([fetchStats(), fetchWallets(), fetchTransactions()])
        } catch (err) {
            console.error('Error adjusting balance:', err)
            setError('Fehler beim Anpassen des Guthabens')
        }
    }

    // Handle refresh
    const handleRefresh = async () => {
        setLoading(true)
        await Promise.all([fetchStats(), fetchWallets(), fetchTransactions()])
        setLoading(false)
    }

    if (loading && !stats) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <MainCard
            title="SuperAdmin Dashboard"
            secondary={
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Plattform-Konfiguration">
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<IconSettings size={18} />}
                            onClick={() => navigate('/admin/config')}
                        >
                            Konfiguration
                        </Button>
                    </Tooltip>
                    <Tooltip title="Aktualisieren">
                        <IconButton onClick={handleRefresh} disabled={loading}>
                            <IconRefresh size={20} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            }
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* System Statistics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Benutzer gesamt"
                        value={stats?.totalUsers || 0}
                        icon={IconUsers}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Aktive Wallets"
                        value={stats?.activeWallets || 0}
                        subtitle={formatEur(stats?.totalBalanceCents)}
                        icon={IconWallet}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Voice-Minuten"
                        value={stats?.monthlyVoiceMinutes?.toFixed(1) || '0'}
                        subtitle="Dieser Monat"
                        icon={IconMicrophone}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="LLM Tokens"
                        value={stats?.monthlyLLMTokens?.toLocaleString() || '0'}
                        subtitle="Dieser Monat"
                        icon={IconBrain}
                    />
                </Grid>
            </Grid>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab label="Benutzer & Wallets" />
                    <Tab label="Transaktionen" />
                </Tabs>
            </Box>

            {/* Wallets Tab */}
            <TabPanel value={tabValue} index={0}>
                {/* Search */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Benutzer suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18} />
                                </InputAdornment>
                            )
                        }}
                        sx={{ minWidth: 300 }}
                    />
                    <Button variant="outlined" onClick={handleSearch}>
                        Suchen
                    </Button>
                </Stack>

                {/* Wallets Table */}
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Benutzer</TableCell>
                                <TableCell>E-Mail</TableCell>
                                <TableCell align="right">Guthaben</TableCell>
                                <TableCell align="right">Voice (Monat)</TableCell>
                                <TableCell align="right">LLM (Monat)</TableCell>
                                <TableCell align="center">Aktionen</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {wallets.map((wallet) => (
                                <TableRow key={wallet.userId}>
                                    <TableCell>{wallet.username || wallet.userId}</TableCell>
                                    <TableCell>{wallet.email || '-'}</TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            color={wallet.balanceCents < 500 ? 'error' : 'inherit'}
                                            fontWeight="bold"
                                        >
                                            {formatEur(wallet.balanceCents)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        {wallet.monthlyVoiceMinutes?.toFixed(1) || '0'} Min
                                    </TableCell>
                                    <TableCell align="right">
                                        {wallet.monthlyLLMTokens?.toLocaleString() || '0'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Tooltip title="Guthaben hinzufügen">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleOpenAdjustDialog(wallet, 'add')}
                                                >
                                                    <IconPlus size={18} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Guthaben abziehen">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleOpenAdjustDialog(wallet, 'subtract')}
                                                >
                                                    <IconMinus size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {wallets.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        Keine Benutzer gefunden
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={walletsTotal}
                        page={walletsPage}
                        onPageChange={(e, p) => setWalletsPage(p)}
                        rowsPerPage={walletsRowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setWalletsRowsPerPage(parseInt(e.target.value, 10))
                            setWalletsPage(0)
                        }}
                        labelRowsPerPage="Zeilen pro Seite:"
                    />
                </TableContainer>
            </TabPanel>

            {/* Transactions Tab */}
            <TabPanel value={tabValue} index={1}>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Datum</TableCell>
                                <TableCell>Benutzer</TableCell>
                                <TableCell>Typ</TableCell>
                                <TableCell align="right">Betrag</TableCell>
                                <TableCell>Beschreibung</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.map((tx) => {
                                const typeInfo = transactionTypeLabels[tx.type] || { label: tx.type, color: 'default' }
                                return (
                                    <TableRow key={tx.id}>
                                        <TableCell>{formatDate(tx.createdAt)}</TableCell>
                                        <TableCell>{tx.username || tx.userId}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={typeInfo.label}
                                                color={typeInfo.color}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography
                                                color={tx.amountCents >= 0 ? 'success.main' : 'error.main'}
                                                fontWeight="bold"
                                            >
                                                {tx.amountCents >= 0 ? '+' : ''}{formatEur(tx.amountCents)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{tx.description || '-'}</TableCell>
                                    </TableRow>
                                )
                            })}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        Keine Transaktionen gefunden
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={transactionsTotal}
                        page={transactionsPage}
                        onPageChange={(e, p) => setTransactionsPage(p)}
                        rowsPerPage={transactionsRowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setTransactionsRowsPerPage(parseInt(e.target.value, 10))
                            setTransactionsPage(0)
                        }}
                        labelRowsPerPage="Zeilen pro Seite:"
                    />
                </TableContainer>
            </TabPanel>

            {/* Adjust Balance Dialog */}
            <Dialog open={adjustDialogOpen} onClose={() => setAdjustDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {adjustType === 'add' ? 'Guthaben hinzufügen' : 'Guthaben abziehen'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                            Benutzer: <strong>{selectedUser?.username || selectedUser?.email}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Aktuelles Guthaben: <strong>{formatEur(selectedUser?.balanceCents)}</strong>
                        </Typography>
                        <TextField
                            label="Betrag (EUR)"
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">€</InputAdornment>
                            }}
                            fullWidth
                        />
                        <TextField
                            label="Grund"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                            placeholder="z.B. Bonus für Feedback, Korrektur Abrechnung, etc."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAdjustDialogOpen(false)}>Abbrechen</Button>
                    <Button
                        variant="contained"
                        color={adjustType === 'add' ? 'success' : 'error'}
                        onClick={handleAdjustBalance}
                        disabled={!adjustAmount || !adjustReason}
                    >
                        {adjustType === 'add' ? 'Hinzufügen' : 'Abziehen'}
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>
    )
}

export default AdminDashboard
