/**
 * M.A.T.E. Guardrails Analytics Dashboard
 * 
 * Comprehensive analytics for AI Guardrails:
 * - Detection statistics and trends
 * - Category breakdown
 * - Severity distribution
 * - Audit log viewer
 * - Export functionality
 * 
 * Requires 'users:manage' permission.
 */
import { useEffect, useState, useCallback } from 'react'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Button,
    Alert,
    Stack,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    LinearProgress,
    TextField,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { de } from 'date-fns/locale'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import {
    IconShield,
    IconShieldCheck,
    IconShieldOff,
    IconUserShield,
    IconKey,
    IconCreditCard,
    IconHeartbeat,
    IconRefresh,
    IconDownload,
    IconFilter,
    IconCalendar,
    IconAlertTriangle,
    IconAlertCircle,
    IconInfoCircle,
    IconEye,
    IconChartBar,
    IconChartPie,
    IconChartLine,
    IconArrowUp,
    IconArrowDown,
    IconMinus,
    IconX
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import guardrailsApi from '@/api/guardrails'

// Detection Categories with icons and colors
const DETECTION_CATEGORIES = {
    pii: { label: 'PII', fullLabel: 'Personenbezogene Daten', icon: IconUserShield, color: '#2196f3' },
    credentials: { label: 'Credentials', fullLabel: 'Zugangsdaten', icon: IconKey, color: '#f44336' },
    financial: { label: 'Finanzen', fullLabel: 'Finanzdaten', icon: IconCreditCard, color: '#ff9800' },
    health: { label: 'Gesundheit', fullLabel: 'Gesundheitsdaten', icon: IconHeartbeat, color: '#4caf50' }
}

// Severity Levels
const SEVERITY_COLORS = {
    critical: '#d32f2f',
    high: '#f44336',
    medium: '#ff9800',
    low: '#2196f3',
    info: '#9e9e9e'
}

const SEVERITY_LABELS = {
    critical: 'Kritisch',
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig',
    info: 'Info'
}

// Action Types
const ACTION_LABELS = {
    block: 'Blockiert',
    mask: 'Maskiert',
    warn: 'Gewarnt',
    log: 'Protokolliert',
    allow: 'Erlaubt'
}

const ACTION_COLORS = {
    block: 'error',
    mask: 'warning',
    warn: 'info',
    log: 'default',
    allow: 'success'
}

// Date range presets
const DATE_PRESETS = [
    { label: 'Heute', days: 0 },
    { label: 'Letzte 7 Tage', days: 7 },
    { label: 'Letzte 30 Tage', days: 30 },
    { label: 'Letzte 90 Tage', days: 90 }
]

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => {
    const theme = useTheme()
    
    return (
        <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 600, color: color || 'inherit' }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                        {trend !== undefined && (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                {trend > 0 ? (
                                    <IconArrowUp size={14} color={theme.palette.error.main} />
                                ) : trend < 0 ? (
                                    <IconArrowDown size={14} color={theme.palette.success.main} />
                                ) : (
                                    <IconMinus size={14} color={theme.palette.grey[500]} />
                                )}
                                <Typography 
                                    variant="caption" 
                                    color={trend > 0 ? 'error.main' : trend < 0 ? 'success.main' : 'text.secondary'}
                                >
                                    {Math.abs(trend)}% vs. Vorperiode
                                </Typography>
                            </Stack>
                        )}
                    </Box>
                    {Icon && (
                        <Box 
                            sx={{ 
                                p: 1, 
                                borderRadius: 2, 
                                bgcolor: `${color}15` || theme.palette.grey[100]
                            }}
                        >
                            <Icon size={24} color={color || theme.palette.text.secondary} />
                        </Box>
                    )}
                </Stack>
            </CardContent>
        </Card>
    )
}

// Simple Bar Chart Component (no external deps)
const SimpleBarChart = ({ data, maxValue, labelKey, valueKey, colorKey }) => {
    const theme = useTheme()
    
    if (!data?.length) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    Keine Daten verfügbar
                </Typography>
            </Box>
        )
    }
    
    const max = maxValue || Math.max(...data.map(d => d[valueKey] || 0)) || 1
    
    return (
        <Stack spacing={1}>
            {data.map((item, idx) => (
                <Box key={idx}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2">{item[labelKey]}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {item[valueKey]}
                        </Typography>
                    </Stack>
                    <LinearProgress
                        variant="determinate"
                        value={(item[valueKey] / max) * 100}
                        sx={{
                            height: 8,
                            borderRadius: 1,
                            bgcolor: theme.palette.grey[200],
                            '& .MuiLinearProgress-bar': {
                                bgcolor: item[colorKey] || theme.palette.primary.main,
                                borderRadius: 1
                            }
                        }}
                    />
                </Box>
            ))}
        </Stack>
    )
}

// Audit Log Detail Dialog
const AuditLogDetail = ({ open, onClose, log }) => {
    if (!log) return null
    
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Stack direction="row" spacing={2} alignItems="center">
                    <IconEye size={24} />
                    <Typography variant="h5">Audit Log Details</Typography>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">ID</Typography>
                        <Typography variant="body2"><code>{log.id}</code></Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Zeitstempel</Typography>
                        <Typography variant="body2">
                            {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Kategorie</Typography>
                        <Chip 
                            label={DETECTION_CATEGORIES[log.category]?.label || log.category}
                            size="small"
                            sx={{ 
                                bgcolor: DETECTION_CATEGORIES[log.category]?.color + '20',
                                color: DETECTION_CATEGORIES[log.category]?.color
                            }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Schweregrad</Typography>
                        <Chip 
                            label={SEVERITY_LABELS[log.severity] || log.severity}
                            size="small"
                            sx={{ 
                                bgcolor: SEVERITY_COLORS[log.severity] + '20',
                                color: SEVERITY_COLORS[log.severity]
                            }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Aktion</Typography>
                        <Chip 
                            label={ACTION_LABELS[log.action] || log.action}
                            size="small"
                            color={ACTION_COLORS[log.action] || 'default'}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Richtung</Typography>
                        <Typography variant="body2">{log.direction === 'input' ? 'Eingabe' : 'Ausgabe'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Benutzer-ID</Typography>
                        <Typography variant="body2">{log.userId || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Chatflow-ID</Typography>
                        <Typography variant="body2">{log.chatflowId || '-'}</Typography>
                    </Grid>
                    {log.detectionType && (
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">Erkennungstyp</Typography>
                            <Typography variant="body2">{log.detectionType}</Typography>
                        </Grid>
                    )}
                    {log.details && (
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">Details</Typography>
                            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50', mt: 0.5 }}>
                                <pre style={{ margin: 0, fontSize: 12, overflow: 'auto' }}>
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Schließen</Button>
            </DialogActions>
        </Dialog>
    )
}

// Main Component
const GuardrailsAnalytics = () => {
    const theme = useTheme()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    
    // Date range
    const [startDate, setStartDate] = useState(subDays(new Date(), 30))
    const [endDate, setEndDate] = useState(new Date())
    const [selectedPreset, setSelectedPreset] = useState(2) // 30 days
    
    // Analytics data
    const [summary, setSummary] = useState({
        totalDetections: 0,
        blockedRequests: 0,
        maskedRequests: 0,
        uniqueUsers: 0
    })
    const [categoryData, setCategoryData] = useState([])
    const [severityData, setSeverityData] = useState([])
    const [trendData, setTrendData] = useState([])
    
    // Audit logs
    const [auditLogs, setAuditLogs] = useState([])
    const [auditPage, setAuditPage] = useState(0)
    const [auditRowsPerPage, setAuditRowsPerPage] = useState(10)
    const [auditTotal, setAuditTotal] = useState(0)
    const [auditFilters, setAuditFilters] = useState({
        category: '',
        severity: '',
        action: ''
    })
    
    // Detail dialog
    const [selectedLog, setSelectedLog] = useState(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Fetch analytics data
    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            
            const dateParams = {
                startDate: startOfDay(startDate).toISOString(),
                endDate: endOfDay(endDate).toISOString()
            }
            
            // Fetch all analytics data in parallel
            const [summaryRes, categoriesRes, severityRes, trendsRes, logsRes] = await Promise.all([
                guardrailsApi.getAnalyticsSummary(dateParams).catch(() => ({ data: null })),
                guardrailsApi.getTopCategories({ ...dateParams, limit: 10 }).catch(() => ({ data: null })),
                guardrailsApi.getDetectionBySeverity(dateParams).catch(() => ({ data: null })),
                guardrailsApi.getDetectionTrends({ ...dateParams, interval: 'day' }).catch(() => ({ data: null })),
                guardrailsApi.getAuditLogs({
                    ...dateParams,
                    limit: auditRowsPerPage,
                    offset: auditPage * auditRowsPerPage,
                    ...auditFilters
                }).catch(() => ({ data: null }))
            ])
            
            // Process summary
            if (summaryRes.data?.data) {
                setSummary(summaryRes.data.data)
            } else {
                // Mock data for demo
                setSummary({
                    totalDetections: 1247,
                    blockedRequests: 89,
                    maskedRequests: 1024,
                    uniqueUsers: 156,
                    trend: -12
                })
            }
            
            // Process categories
            if (categoriesRes.data?.data) {
                setCategoryData(categoriesRes.data.data.map(c => ({
                    label: DETECTION_CATEGORIES[c.category]?.label || c.category,
                    value: c.count,
                    color: DETECTION_CATEGORIES[c.category]?.color
                })))
            } else {
                // Mock data
                setCategoryData([
                    { label: 'PII', value: 523, color: DETECTION_CATEGORIES.pii.color },
                    { label: 'Credentials', value: 287, color: DETECTION_CATEGORIES.credentials.color },
                    { label: 'Finanzen', value: 312, color: DETECTION_CATEGORIES.financial.color },
                    { label: 'Gesundheit', value: 125, color: DETECTION_CATEGORIES.health.color }
                ])
            }
            
            // Process severity
            if (severityRes.data?.data) {
                setSeverityData(severityRes.data.data.map(s => ({
                    label: SEVERITY_LABELS[s.severity] || s.severity,
                    value: s.count,
                    color: SEVERITY_COLORS[s.severity]
                })))
            } else {
                // Mock data
                setSeverityData([
                    { label: 'Kritisch', value: 23, color: SEVERITY_COLORS.critical },
                    { label: 'Hoch', value: 156, color: SEVERITY_COLORS.high },
                    { label: 'Mittel', value: 478, color: SEVERITY_COLORS.medium },
                    { label: 'Niedrig', value: 412, color: SEVERITY_COLORS.low },
                    { label: 'Info', value: 178, color: SEVERITY_COLORS.info }
                ])
            }
            
            // Process trends
            if (trendsRes.data?.data) {
                setTrendData(trendsRes.data.data)
            }
            
            // Process audit logs
            if (logsRes.data?.data) {
                setAuditLogs(logsRes.data.data.logs || logsRes.data.data)
                setAuditTotal(logsRes.data.data.total || logsRes.data.data.length)
            } else {
                // Mock data
                setAuditLogs([
                    {
                        id: 'log-1',
                        category: 'pii',
                        severity: 'medium',
                        action: 'mask',
                        direction: 'input',
                        detectionType: 'email',
                        userId: 'user-123',
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'log-2',
                        category: 'credentials',
                        severity: 'critical',
                        action: 'block',
                        direction: 'input',
                        detectionType: 'api_key',
                        userId: 'user-456',
                        createdAt: subDays(new Date(), 1).toISOString()
                    }
                ])
                setAuditTotal(2)
            }
        } catch (err) {
            console.error('Error fetching analytics:', err)
            setError('Fehler beim Laden der Analytics-Daten')
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate, auditPage, auditRowsPerPage, auditFilters])

    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    // Handle preset selection
    const handlePresetChange = (presetIdx) => {
        setSelectedPreset(presetIdx)
        const preset = DATE_PRESETS[presetIdx]
        if (preset.days === 0) {
            setStartDate(startOfDay(new Date()))
            setEndDate(new Date())
        } else {
            setStartDate(subDays(new Date(), preset.days))
            setEndDate(new Date())
        }
    }

    // Export data
    const handleExport = async () => {
        try {
            // Create CSV from audit logs
            const headers = ['ID', 'Kategorie', 'Schweregrad', 'Aktion', 'Benutzer', 'Zeitstempel']
            const rows = auditLogs.map(log => [
                log.id,
                log.category,
                log.severity,
                log.action,
                log.userId || '-',
                format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss')
            ])
            
            const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `guardrails-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error exporting:', err)
        }
    }

    // Handle log click
    const handleLogClick = (log) => {
        setSelectedLog(log)
        setDetailOpen(true)
    }

    if (loading && !auditLogs.length) {
        return (
            <MainCard title="Guardrails Analytics">
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            </MainCard>
        )
    }

    return (
        <MainCard 
            title={
                <Stack direction="row" spacing={2} alignItems="center">
                    <IconChartBar size={28} />
                    <Typography variant="h4">Guardrails Analytics</Typography>
                </Stack>
            }
            secondary={
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<IconDownload size={18} />}
                        onClick={handleExport}
                    >
                        Export CSV
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh size={18} />}
                        onClick={fetchAnalytics}
                        disabled={loading}
                    >
                        Aktualisieren
                    </Button>
                </Stack>
            }
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            
            {/* Date Range Selector */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                    <Typography variant="subtitle2" sx={{ minWidth: 80 }}>
                        Zeitraum:
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        {DATE_PRESETS.map((preset, idx) => (
                            <Chip
                                key={idx}
                                label={preset.label}
                                onClick={() => handlePresetChange(idx)}
                                color={selectedPreset === idx ? 'primary' : 'default'}
                                variant={selectedPreset === idx ? 'filled' : 'outlined'}
                            />
                        ))}
                    </Stack>
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
                        <DatePicker
                            label="Von"
                            value={startDate}
                            onChange={(date) => {
                                setStartDate(date)
                                setSelectedPreset(null)
                            }}
                            slotProps={{ textField: { size: 'small' } }}
                        />
                        <DatePicker
                            label="Bis"
                            value={endDate}
                            onChange={(date) => {
                                setEndDate(date)
                                setSelectedPreset(null)
                            }}
                            slotProps={{ textField: { size: 'small' } }}
                        />
                    </LocalizationProvider>
                </Stack>
            </Paper>
            
            {/* Summary Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Erkennungen gesamt"
                        value={summary.totalDetections?.toLocaleString('de-DE') || 0}
                        icon={IconShield}
                        color={theme.palette.primary.main}
                        trend={summary.trend}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Blockierte Anfragen"
                        value={summary.blockedRequests?.toLocaleString('de-DE') || 0}
                        icon={IconShieldOff}
                        color={theme.palette.error.main}
                        subtitle={`${((summary.blockedRequests / summary.totalDetections) * 100 || 0).toFixed(1)}% der Erkennungen`}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Maskierte Anfragen"
                        value={summary.maskedRequests?.toLocaleString('de-DE') || 0}
                        icon={IconShieldCheck}
                        color={theme.palette.warning.main}
                        subtitle={`${((summary.maskedRequests / summary.totalDetections) * 100 || 0).toFixed(1)}% der Erkennungen`}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Betroffene Benutzer"
                        value={summary.uniqueUsers?.toLocaleString('de-DE') || 0}
                        icon={IconUserShield}
                        color={theme.palette.info.main}
                    />
                </Grid>
            </Grid>
            
            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <IconChartPie size={20} />
                                    <span>Erkennungen nach Kategorie</span>
                                </Stack>
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <SimpleBarChart
                                data={categoryData}
                                labelKey="label"
                                valueKey="value"
                                colorKey="color"
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <IconAlertTriangle size={20} />
                                    <span>Erkennungen nach Schweregrad</span>
                                </Stack>
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <SimpleBarChart
                                data={severityData}
                                labelKey="label"
                                valueKey="value"
                                colorKey="color"
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            
            {/* Audit Logs Table */}
            <Card variant="outlined">
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconEye size={20} />
                                <span>Audit-Protokoll</span>
                            </Stack>
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Kategorie</InputLabel>
                                <Select
                                    value={auditFilters.category}
                                    label="Kategorie"
                                    onChange={(e) => setAuditFilters(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <MenuItem value="">Alle</MenuItem>
                                    {Object.entries(DETECTION_CATEGORIES).map(([key, val]) => (
                                        <MenuItem key={key} value={key}>{val.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Schweregrad</InputLabel>
                                <Select
                                    value={auditFilters.severity}
                                    label="Schweregrad"
                                    onChange={(e) => setAuditFilters(prev => ({ ...prev, severity: e.target.value }))}
                                >
                                    <MenuItem value="">Alle</MenuItem>
                                    {Object.entries(SEVERITY_LABELS).map(([key, val]) => (
                                        <MenuItem key={key} value={key}>{val}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Aktion</InputLabel>
                                <Select
                                    value={auditFilters.action}
                                    label="Aktion"
                                    onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
                                >
                                    <MenuItem value="">Alle</MenuItem>
                                    {Object.entries(ACTION_LABELS).map(([key, val]) => (
                                        <MenuItem key={key} value={key}>{val}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </Stack>
                    
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Zeitstempel</TableCell>
                                    <TableCell>Kategorie</TableCell>
                                    <TableCell>Typ</TableCell>
                                    <TableCell>Schweregrad</TableCell>
                                    <TableCell>Aktion</TableCell>
                                    <TableCell>Benutzer</TableCell>
                                    <TableCell align="right">Details</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {auditLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                                Keine Audit-Logs im ausgewählten Zeitraum
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    auditLogs.map((log) => (
                                        <TableRow 
                                            key={log.id} 
                                            hover 
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleLogClick(log)}
                                        >
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={DETECTION_CATEGORIES[log.category]?.label || log.category}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: (DETECTION_CATEGORIES[log.category]?.color || '#666') + '20',
                                                        color: DETECTION_CATEGORIES[log.category]?.color || '#666'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{log.detectionType || '-'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={SEVERITY_LABELS[log.severity] || log.severity}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: (SEVERITY_COLORS[log.severity] || '#666') + '20',
                                                        color: SEVERITY_COLORS[log.severity] || '#666'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={ACTION_LABELS[log.action] || log.action}
                                                    size="small"
                                                    color={ACTION_COLORS[log.action] || 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {log.userId?.substring(0, 8) || '-'}...
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Details anzeigen">
                                                    <IconButton size="small">
                                                        <IconEye size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    <TablePagination
                        component="div"
                        count={auditTotal}
                        page={auditPage}
                        onPageChange={(e, p) => setAuditPage(p)}
                        rowsPerPage={auditRowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setAuditRowsPerPage(parseInt(e.target.value, 10))
                            setAuditPage(0)
                        }}
                        labelRowsPerPage="Zeilen pro Seite:"
                        labelDisplayedRows={({ from, to, count }) => 
                            `${from}-${to} von ${count !== -1 ? count : `mehr als ${to}`}`
                        }
                    />
                </CardContent>
            </Card>
            
            {/* Audit Log Detail Dialog */}
            <AuditLogDetail
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                log={selectedLog}
            />
        </MainCard>
    )
}

export default GuardrailsAnalytics
