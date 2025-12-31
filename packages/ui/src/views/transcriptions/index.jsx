/**
 * M.A.T.E. Transkriptionen View
 * 
 * Zeigt alle Anruf-Transkripte mit KI-Zusammenfassungen, 
 * Statistiken und Filtermöglichkeiten.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    InputAdornment,
    Chip,
    IconButton,
    Tooltip,
    Card,
    CardContent,
    Grid,
    Skeleton,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Stack,
    useTheme
} from '@mui/material'
import {
    IconSearch,
    IconPhone,
    IconPhoneIncoming,
    IconPhoneOutgoing,
    IconClock,
    IconCurrencyEuro,
    IconMoodSmile,
    IconMoodSad,
    IconMoodEmpty,
    IconRefresh,
    IconEye,
    IconTrash,
    IconSparkles,
    IconChartBar,
    IconCalendar
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import transcriptionsApi from '@/api/transcriptions'

// Sentiment-Icon basierend auf dem Wert
const SentimentIcon = ({ sentiment }) => {
    switch (sentiment) {
        case 'positive':
            return <IconMoodSmile size={20} color="#4caf50" />
        case 'negative':
            return <IconMoodSad size={20} color="#f44336" />
        default:
            return <IconMoodEmpty size={20} color="#9e9e9e" />
    }
}

// Status-Chip mit Farbe
const StatusChip = ({ status }) => {
    const statusConfig = {
        completed: { color: 'success', label: 'Abgeschlossen' },
        'in-progress': { color: 'warning', label: 'Läuft' },
        failed: { color: 'error', label: 'Fehlgeschlagen' },
        missed: { color: 'default', label: 'Verpasst' }
    }
    
    const config = statusConfig[status] || { color: 'default', label: status }
    return <Chip size="small" color={config.color} label={config.label} />
}

// Statistik-Karte
const StatCard = ({ title, value, icon: Icon, color, loading }) => {
    const theme = useTheme()
    
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: `${color}15`,
                            color: color
                        }}
                    >
                        <Icon size={24} />
                    </Box>
                    <Box>
                        <Typography variant="body2" color="textSecondary">
                            {title}
                        </Typography>
                        {loading ? (
                            <Skeleton width={80} height={32} />
                        ) : (
                            <Typography variant="h4" fontWeight="bold">
                                {value}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    )
}

const TranscriptionsView = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    
    // State
    const [transcriptions, setTranscriptions] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [statsLoading, setStatsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [total, setTotal] = useState(0)
    const [selectedTranscription, setSelectedTranscription] = useState(null)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [transcriptionToDelete, setTranscriptionToDelete] = useState(null)
    
    // Daten laden
    const fetchTranscriptions = useCallback(async () => {
        try {
            setLoading(true)
            const response = await transcriptionsApi.getTranscriptions({
                limit: rowsPerPage,
                offset: page * rowsPerPage,
                search: searchQuery || undefined
            })
            
            if (response.data?.success) {
                setTranscriptions(response.data.data.transcriptions || [])
                setTotal(response.data.data.total || 0)
            }
        } catch (err) {
            console.error('Fehler beim Laden der Transkripte:', err)
            setError('Transkripte konnten nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }, [page, rowsPerPage, searchQuery])
    
    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true)
            const response = await transcriptionsApi.getStats()
            
            if (response.data?.success) {
                setStats(response.data.data)
            }
        } catch (err) {
            console.error('Fehler beim Laden der Statistiken:', err)
        } finally {
            setStatsLoading(false)
        }
    }, [])
    
    useEffect(() => {
        fetchTranscriptions()
    }, [fetchTranscriptions])
    
    useEffect(() => {
        fetchStats()
    }, [fetchStats])
    
    // Handler
    const handleSearch = (event) => {
        setSearchQuery(event.target.value)
        setPage(0)
    }
    
    const handleChangePage = (event, newPage) => {
        setPage(newPage)
    }
    
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }
    
    const handleViewTranscription = async (transcription) => {
        try {
            const response = await transcriptionsApi.getTranscription(transcription.id)
            if (response.data?.success) {
                setSelectedTranscription(response.data.data)
                setDetailDialogOpen(true)
            }
        } catch (err) {
            console.error('Fehler beim Laden des Transkripts:', err)
        }
    }
    
    const handleDeleteClick = (transcription) => {
        setTranscriptionToDelete(transcription)
        setDeleteDialogOpen(true)
    }
    
    const handleDeleteConfirm = async () => {
        if (!transcriptionToDelete) return
        
        try {
            await transcriptionsApi.deleteTranscription(transcriptionToDelete.id)
            fetchTranscriptions()
            fetchStats()
        } catch (err) {
            console.error('Fehler beim Löschen:', err)
        } finally {
            setDeleteDialogOpen(false)
            setTranscriptionToDelete(null)
        }
    }
    
    const handleRegenerateSummary = async (id) => {
        try {
            await transcriptionsApi.regenerateSummary(id)
            // Refresh nach kurzer Verzögerung
            setTimeout(() => {
                if (selectedTranscription?.id === id) {
                    handleViewTranscription({ id })
                }
            }, 2000)
        } catch (err) {
            console.error('Fehler bei der Zusammenfassung:', err)
        }
    }
    
    return (
        <MainCard title="Anruf-Transkripte">
            {/* Statistik-Karten */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Gesamte Anrufe"
                        value={stats?.totalCalls || 0}
                        icon={IconPhone}
                        color={theme.palette.primary.main}
                        loading={statsLoading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Gesprächszeit"
                        value={stats?.avgDurationFormatted || '0m'}
                        icon={IconClock}
                        color={theme.palette.info.main}
                        loading={statsLoading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Erfolgsrate"
                        value={`${stats?.successRate || 0}%`}
                        icon={IconChartBar}
                        color={theme.palette.success.main}
                        loading={statsLoading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Gesamtkosten"
                        value={stats?.totalCostFormatted || '€0.00'}
                        icon={IconCurrencyEuro}
                        color={theme.palette.warning.main}
                        loading={statsLoading}
                    />
                </Grid>
            </Grid>
            
            {/* Suchfeld und Aktionen */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TextField
                    placeholder="Suche nach Anrufer, Agent oder Inhalt..."
                    value={searchQuery}
                    onChange={handleSearch}
                    sx={{ width: 400 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconSearch size={20} />
                            </InputAdornment>
                        )
                    }}
                />
                <Tooltip title="Aktualisieren">
                    <IconButton onClick={() => { fetchTranscriptions(); fetchStats(); }}>
                        <IconRefresh size={20} />
                    </IconButton>
                </Tooltip>
            </Box>
            
            {/* Fehleranzeige */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            
            {/* Tabelle */}
            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Richtung</TableCell>
                            <TableCell>Anrufer</TableCell>
                            <TableCell>Agent</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Dauer</TableCell>
                            <TableCell>Stimmung</TableCell>
                            <TableCell>Kosten</TableCell>
                            <TableCell>Datum</TableCell>
                            <TableCell align="right">Aktionen</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    {Array(9).fill(0).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : transcriptions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    <Box py={4}>
                                        <IconPhone size={48} color="#ccc" />
                                        <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                                            Noch keine Transkripte vorhanden
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Transkripte werden automatisch nach VAPI-Anrufen erstellt
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            transcriptions.map((t) => (
                                <TableRow key={t.id} hover>
                                    <TableCell>
                                        {t.callDirection === 'inbound' ? (
                                            <IconPhoneIncoming size={20} color="#4caf50" />
                                        ) : (
                                            <IconPhoneOutgoing size={20} color="#2196f3" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {t.callerName || 'Unbekannt'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {t.callerPhone || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{t.agentName || '-'}</TableCell>
                                    <TableCell>
                                        <StatusChip status={t.callStatus} />
                                    </TableCell>
                                    <TableCell>{t.durationFormatted || '-'}</TableCell>
                                    <TableCell>
                                        <SentimentIcon sentiment={t.sentiment} />
                                    </TableCell>
                                    <TableCell>€{t.costEur || '0.00'}</TableCell>
                                    <TableCell>
                                        {t.callStartedAt ? new Date(t.callStartedAt).toLocaleDateString('de-DE', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Details anzeigen">
                                            <IconButton size="small" onClick={() => handleViewTranscription(t)}>
                                                <IconEye size={18} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Löschen">
                                            <IconButton size="small" color="error" onClick={() => handleDeleteClick(t)}>
                                                <IconTrash size={18} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Zeilen pro Seite:"
                />
            </TableContainer>
            
            {/* Detail-Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedTranscription && (
                    <>
                        <DialogTitle>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h5">
                                        Anruf mit {selectedTranscription.callerName || 'Unbekannt'}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {selectedTranscription.callerPhone} • {selectedTranscription.durationFormatted}
                                    </Typography>
                                </Box>
                                <SentimentIcon sentiment={selectedTranscription.sentiment} />
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            {/* Zusammenfassung */}
                            {selectedTranscription.summary && (
                                <Box mb={3}>
                                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                        <IconSparkles size={18} />
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            KI-Zusammenfassung
                                        </Typography>
                                        <Tooltip title="Neu generieren">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleRegenerateSummary(selectedTranscription.id)}
                                            >
                                                <IconRefresh size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                                        <Typography variant="body2">
                                            {selectedTranscription.summary}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}
                            
                            {/* Tags */}
                            {selectedTranscription.tags?.length > 0 && (
                                <Box mb={3}>
                                    <Typography variant="subtitle2" color="textSecondary" mb={1}>
                                        Tags
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {selectedTranscription.tags.map((tag, i) => (
                                            <Chip key={i} label={tag} size="small" />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                            
                            <Divider sx={{ my: 2 }} />
                            
                            {/* Transkript */}
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                                Transkript
                            </Typography>
                            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {selectedTranscription.messages?.map((msg, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            mb: 2,
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: msg.role === 'user' ? 'action.hover' : 'primary.light',
                                            color: msg.role === 'user' ? 'text.primary' : 'primary.contrastText',
                                            ml: msg.role === 'user' ? 0 : 4,
                                            mr: msg.role === 'user' ? 4 : 0
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                                            {msg.role === 'user' ? 'Anrufer' : 'Agent'}
                                        </Typography>
                                        <Typography variant="body2">
                                            {msg.content}
                                        </Typography>
                                    </Box>
                                )) || (
                                    <Typography variant="body2" color="textSecondary">
                                        {selectedTranscription.transcript || 'Kein Transkript verfügbar'}
                                    </Typography>
                                )}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDetailDialogOpen(false)}>
                                Schließen
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
            
            {/* Lösch-Bestätigung */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Transkript löschen?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Möchten Sie dieses Transkript wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Abbrechen
                    </Button>
                    <Button color="error" onClick={handleDeleteConfirm}>
                        Löschen
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>
    )
}

export default TranscriptionsView
