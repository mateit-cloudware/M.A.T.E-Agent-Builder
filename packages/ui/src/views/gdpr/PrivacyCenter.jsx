import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// MUI
import {
    Box,
    Container,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Switch,
    Alert,
    AlertTitle,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tabs,
    Tab,
    LinearProgress,
    useTheme
} from '@mui/material'
import {
    IconShieldLock,
    IconDownload,
    IconTrash,
    IconLock,
    IconCheck,
    IconX,
    IconChevronDown,
    IconInfoCircle,
    IconAlertTriangle,
    IconClock,
    IconMail,
    IconFileExport,
    IconUserOff,
    IconSettings
} from '@tabler/icons-react'

// API
import gdprApi from '@/api/gdpr'

// Components
import MainCard from '@/ui-component/cards/MainCard'

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`gdpr-tabpanel-${index}`}
            aria-labelledby={`gdpr-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    )
}

/**
 * Datenschutz-Center
 * 
 * Zentrale Anlaufstelle für alle DSGVO-Rechte:
 * - Einwilligungsverwaltung
 * - Datenexport
 * - Datenlöschung
 * - Verarbeitungseinschränkung
 */
const PrivacyCenter = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    
    const [loading, setLoading] = useState(true)
    const [tabValue, setTabValue] = useState(0)
    const [privacyData, setPrivacyData] = useState(null)
    const [error, setError] = useState(null)
    
    // Dialog States
    const [exportDialog, setExportDialog] = useState(false)
    const [deleteDialog, setDeleteDialog] = useState(false)
    const [restrictionDialog, setRestrictionDialog] = useState(false)
    
    // Action States
    const [actionLoading, setActionLoading] = useState(false)
    const [exportStatus, setExportStatus] = useState(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState('')

    // Daten laden
    useEffect(() => {
        loadPrivacyData()
    }, [])

    const loadPrivacyData = async () => {
        try {
            setLoading(true)
            const response = await gdprApi.getPrivacyCenter()
            setPrivacyData(response.data)
        } catch (err) {
            console.error('Fehler beim Laden:', err)
            setError('Datenschutz-Daten konnten nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    // Consent ändern
    const handleConsentChange = async (consentType, value) => {
        try {
            if (value) {
                await gdprApi.grantConsent(consentType)
            } else {
                await gdprApi.withdrawConsent(consentType)
            }
            await loadPrivacyData()
        } catch (err) {
            console.error('Consent-Fehler:', err)
        }
    }

    // Datenexport anfordern
    const handleRequestExport = async (format = 'zip') => {
        try {
            setActionLoading(true)
            const response = await gdprApi.requestDataExport(format)
            setExportStatus(response.data)
            setExportDialog(false)
            await loadPrivacyData()
        } catch (err) {
            console.error('Export-Fehler:', err)
            setError('Export konnte nicht angefordert werden')
        } finally {
            setActionLoading(false)
        }
    }

    // Löschung anfordern
    const handleRequestDeletion = async () => {
        if (deleteConfirmation.toLowerCase() !== 'löschen') {
            return
        }
        
        try {
            setActionLoading(true)
            await gdprApi.requestDeletion()
            setDeleteDialog(false)
            setDeleteConfirmation('')
            await loadPrivacyData()
        } catch (err) {
            console.error('Lösch-Fehler:', err)
            setError('Löschanfrage konnte nicht erstellt werden')
        } finally {
            setActionLoading(false)
        }
    }

    // Löschung stornieren
    const handleCancelDeletion = async (requestId) => {
        try {
            await gdprApi.cancelDeletion(requestId, 'Benutzer hat storniert')
            await loadPrivacyData()
        } catch (err) {
            console.error('Stornierung fehlgeschlagen:', err)
        }
    }

    // Tab-Wechsel
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue)
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <MainCard title="Datenschutz-Center" icon={<IconShieldLock />}>
            <Box sx={{ width: '100%' }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {exportStatus && (
                    <Alert severity="success" sx={{ mb: 3 }} onClose={() => setExportStatus(null)}>
                        <AlertTitle>Datenexport angefordert</AlertTitle>
                        {exportStatus.message}
                    </Alert>
                )}

                {/* Pending Deletion Warning */}
                {privacyData?.deletion?.pending && (
                    <Alert 
                        severity="warning" 
                        sx={{ mb: 3 }}
                        action={
                            <Button 
                                color="inherit" 
                                size="small"
                                onClick={() => handleCancelDeletion(privacyData.deletion.pending.id)}
                            >
                                Stornieren
                            </Button>
                        }
                    >
                        <AlertTitle>Löschanfrage aktiv</AlertTitle>
                        Ihre Daten werden am {new Date(privacyData.deletion.pending.scheduledAt).toLocaleDateString('de-DE')} gelöscht.
                        Sie können die Anfrage bis dahin stornieren.
                    </Alert>
                )}

                {/* Tabs */}
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Übersicht" icon={<IconShieldLock size={18} />} iconPosition="start" />
                    <Tab label="Einwilligungen" icon={<IconCheck size={18} />} iconPosition="start" />
                    <Tab label="Meine Rechte" icon={<IconInfoCircle size={18} />} iconPosition="start" />
                    <Tab label="Kontakt" icon={<IconMail size={18} />} iconPosition="start" />
                </Tabs>

                {/* Übersicht Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={3}>
                        {/* Datenexport */}
                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <IconDownload size={24} color={theme.palette.primary.main} />
                                        <Typography variant="h6" sx={{ ml: 1 }}>
                                            Datenexport
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Laden Sie alle Ihre gespeicherten Daten in einem gängigen Format herunter (Art. 15 & 20 DSGVO).
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button 
                                        variant="outlined" 
                                        startIcon={<IconFileExport size={18} />}
                                        onClick={() => setExportDialog(true)}
                                    >
                                        Export anfordern
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>

                        {/* Datenlöschung */}
                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <IconTrash size={24} color={theme.palette.error.main} />
                                        <Typography variant="h6" sx={{ ml: 1 }}>
                                            Datenlöschung
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Beantragen Sie die Löschung Ihrer personenbezogenen Daten (Art. 17 DSGVO - Recht auf Vergessenwerden).
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button 
                                        variant="outlined" 
                                        color="error"
                                        startIcon={<IconUserOff size={18} />}
                                        onClick={() => setDeleteDialog(true)}
                                        disabled={!!privacyData?.deletion?.pending}
                                    >
                                        Löschung beantragen
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>

                        {/* Einschränkung */}
                        <Grid item xs={12} md={4}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <IconLock size={24} color={theme.palette.warning.main} />
                                        <Typography variant="h6" sx={{ ml: 1 }}>
                                            Einschränkung
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Schränken Sie die Verarbeitung Ihrer Daten ein (Art. 18 DSGVO).
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button 
                                        variant="outlined" 
                                        color="warning"
                                        startIcon={<IconSettings size={18} />}
                                        onClick={() => setRestrictionDialog(true)}
                                    >
                                        Verarbeitung einschränken
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>

                        {/* Aktive Einschränkungen */}
                        {privacyData?.restrictions?.active?.length > 0 && (
                            <Grid item xs={12}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Aktive Einschränkungen
                                    </Typography>
                                    <List>
                                        {privacyData.restrictions.active.map((restriction) => (
                                            <ListItem key={restriction.id}>
                                                <ListItemIcon>
                                                    <IconLock color={theme.palette.warning.main} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={restriction.type}
                                                    secondary={`Seit ${new Date(restriction.startDate).toLocaleDateString('de-DE')}`}
                                                />
                                                <ListItemSecondaryAction>
                                                    <Button 
                                                        size="small"
                                                        onClick={() => gdprApi.liftRestriction(restriction.id).then(loadPrivacyData)}
                                                    >
                                                        Aufheben
                                                    </Button>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </Grid>
                        )}

                        {/* Aufbewahrungsfristen */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Aufbewahrungsfristen
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" color="primary">
                                                {privacyData?.retentionInfo?.standard || '365 Tage'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Standard-Aufbewahrung
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" color="primary">
                                                {privacyData?.retentionInfo?.billing || '10 Jahre'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Abrechnungsdaten (gesetzlich)
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ textAlign: 'center', p: 2 }}>
                                            <Typography variant="h4" color="primary">
                                                {privacyData?.retentionInfo?.consents || '365 Tage'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Einwilligungen
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Einwilligungen Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Typography variant="body1" gutterBottom>
                        Verwalten Sie hier Ihre Einwilligungen zur Datenverarbeitung. Essentielle Cookies können nicht deaktiviert werden.
                    </Typography>
                    
                    <List sx={{ mt: 2 }}>
                        {privacyData?.consents?.history && Object.entries(
                            privacyData.consents.history.reduce((acc, c) => {
                                if (!acc[c.consentType] || new Date(c.updatedAt) > new Date(acc[c.consentType].updatedAt)) {
                                    acc[c.consentType] = c
                                }
                                return acc
                            }, {})
                        ).map(([type, consent]) => (
                            <Paper key={type} sx={{ mb: 2, p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={500}>
                                            {getConsentTypeName(type)}
                                            {type === 'essential' && (
                                                <Chip label="Erforderlich" size="small" sx={{ ml: 1 }} />
                                            )}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {getConsentTypeDescription(type)}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={privacyData.consents.current[type] || false}
                                        onChange={(e) => handleConsentChange(type, e.target.checked)}
                                        disabled={type === 'essential'}
                                        color="primary"
                                    />
                                </Box>
                            </Paper>
                        ))}
                    </List>
                </TabPanel>

                {/* Meine Rechte Tab */}
                <TabPanel value={tabValue} index={2}>
                    {privacyData?.rights?.map((right, index) => (
                        <Accordion key={index} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<IconChevronDown />}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={500}>
                                        {right.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {right.article}
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" paragraph>
                                    {right.description}
                                </Typography>
                                {right.action && (
                                    <Button variant="outlined" size="small">
                                        {right.action}
                                    </Button>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </TabPanel>

                {/* Kontakt Tab */}
                <TabPanel value={tabValue} index={3}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Verantwortlicher
                        </Typography>
                        <Typography variant="body1" paragraph>
                            {privacyData?.dataController?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {privacyData?.dataController?.address}
                        </Typography>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Typography variant="h6" gutterBottom>
                            Datenschutz-Kontakt
                        </Typography>
                        <Typography variant="body2">
                            E-Mail: <a href={`mailto:${privacyData?.dataController?.email}`}>
                                {privacyData?.dataController?.email}
                            </a>
                        </Typography>
                        <Typography variant="body2">
                            {privacyData?.dataController?.dpo}
                        </Typography>
                    </Paper>
                </TabPanel>
            </Box>

            {/* Export Dialog */}
            <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
                <DialogTitle>Datenexport anfordern</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Wählen Sie das Format für Ihren Datenexport. Der Export wird in Kürze vorbereitet 
                        und Sie erhalten einen Download-Link.
                    </DialogContentText>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button 
                            variant="outlined"
                            onClick={() => handleRequestExport('json')}
                            disabled={actionLoading}
                        >
                            JSON
                        </Button>
                        <Button 
                            variant="outlined"
                            onClick={() => handleRequestExport('csv')}
                            disabled={actionLoading}
                        >
                            CSV
                        </Button>
                        <Button 
                            variant="contained"
                            onClick={() => handleRequestExport('zip')}
                            disabled={actionLoading}
                        >
                            ZIP (Empfohlen)
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExportDialog(false)}>Abbrechen</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
                <DialogTitle sx={{ color: 'error.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconAlertTriangle />
                        Konto löschen
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden.
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 2 }}>
                        Nach einer Wartefrist von 30 Tagen werden alle Ihre personenbezogenen Daten 
                        unwiderruflich gelöscht. Abrechnungsdaten müssen aufgrund gesetzlicher 
                        Aufbewahrungspflichten 10 Jahre aufbewahrt werden.
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 2 }}>
                        Geben Sie <strong>LÖSCHEN</strong> ein, um fortzufahren:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        fullWidth
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="LÖSCHEN"
                        error={deleteConfirmation.length > 0 && deleteConfirmation.toLowerCase() !== 'löschen'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog(false)}>Abbrechen</Button>
                    <Button 
                        onClick={handleRequestDeletion}
                        color="error"
                        variant="contained"
                        disabled={deleteConfirmation.toLowerCase() !== 'löschen' || actionLoading}
                    >
                        {actionLoading ? <CircularProgress size={24} /> : 'Löschung beantragen'}
                    </Button>
                </DialogActions>
            </Dialog>
        </MainCard>
    )
}

// Helper Funktionen
function getConsentTypeName(type) {
    const names = {
        essential: 'Essentiell',
        analytics: 'Analysen',
        marketing: 'Marketing',
        third_party: 'Drittanbieter',
        ai_training: 'KI-Training',
        data_sharing: 'Datenfreigabe',
        personalization: 'Personalisierung'
    }
    return names[type] || type
}

function getConsentTypeDescription(type) {
    const descriptions = {
        essential: 'Erforderlich für den Betrieb der Plattform.',
        analytics: 'Nutzungsanalysen zur Produktverbesserung.',
        marketing: 'Personalisierte Werbung und Newsletter.',
        third_party: 'Integration mit Drittanbieterdiensten.',
        ai_training: 'Nutzung Ihrer Daten zur KI-Verbesserung.',
        data_sharing: 'Anonymisierte Datenfreigabe.',
        personalization: 'Personalisierte Erfahrungen.'
    }
    return descriptions[type] || ''
}

export default PrivacyCenter
