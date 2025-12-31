/**
 * M.A.T.E. Guardrails Configuration
 * 
 * Admin interface for managing AI Guardrails:
 * - Scanner configuration (PII, Credentials, Financial, Health)
 * - Masking rules and styles
 * - Policy settings (Block/Mask/Warn)
 * - Audit settings
 * - Real-time testing
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
    TextField,
    Button,
    Alert,
    IconButton,
    Tooltip,
    Stack,
    Chip,
    Tabs,
    Tab,
    Divider,
    Switch,
    FormControlLabel,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconShield,
    IconShieldCheck,
    IconShieldOff,
    IconUserShield,
    IconKey,
    IconCreditCard,
    IconHeartbeat,
    IconMask,
    IconRefresh,
    IconCheck,
    IconAlertCircle,
    IconDeviceFloppy,
    IconTestPipe,
    IconChevronDown,
    IconSettings,
    IconEye,
    IconEyeOff,
    IconInfoCircle,
    IconTrash,
    IconPlus
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import guardrailsApi from '@/api/guardrails'

// Detection Categories
const DETECTION_CATEGORIES = {
    pii: { label: 'Personenbezogene Daten (PII)', icon: IconUserShield, color: 'primary' },
    credentials: { label: 'Zugangsdaten & Secrets', icon: IconKey, color: 'error' },
    financial: { label: 'Finanzdaten', icon: IconCreditCard, color: 'warning' },
    health: { label: 'Gesundheitsdaten', icon: IconHeartbeat, color: 'success' }
}

// Severity Levels
const SEVERITY_LEVELS = [
    { value: 'critical', label: 'Kritisch', color: 'error' },
    { value: 'high', label: 'Hoch', color: 'error' },
    { value: 'medium', label: 'Mittel', color: 'warning' },
    { value: 'low', label: 'Niedrig', color: 'info' },
    { value: 'info', label: 'Info', color: 'default' }
]

// Action Types
const ACTION_TYPES = [
    { value: 'block', label: 'Blockieren', description: 'Anfrage vollständig blockieren' },
    { value: 'mask', label: 'Maskieren', description: 'Sensible Daten maskieren und fortfahren' },
    { value: 'warn', label: 'Warnen', description: 'Warnung protokollieren, aber fortfahren' },
    { value: 'log', label: 'Protokollieren', description: 'Nur protokollieren, keine Aktion' },
    { value: 'allow', label: 'Erlauben', description: 'Keine Aktion, Scanner deaktiviert' }
]

// Masking Styles
const MASKING_STYLES = [
    { value: 'asterisk', label: 'Sternchen', example: 'j***@example.com' },
    { value: 'redact', label: 'Schwärzen', example: '[REDACTED]' },
    { value: 'hash', label: 'Hash', example: 'email_abc123' },
    { value: 'partial', label: 'Teilweise', example: 'j***e@e***.com' },
    { value: 'placeholder', label: 'Platzhalter', example: '[EMAIL_REMOVED]' }
]

// Tab Panel Component
const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
)

// Status Badge Component
const StatusBadge = ({ enabled, label }) => {
    if (enabled) {
        return <Chip label={label || 'Aktiv'} color="success" size="small" icon={<IconShieldCheck size={14} />} />
    }
    return <Chip label={label || 'Inaktiv'} color="default" size="small" icon={<IconShieldOff size={14} />} />
}

// Scanner Card Component
const ScannerCard = ({ category, config, onToggle, onConfigChange, onTest }) => {
    const theme = useTheme()
    const CategoryIcon = DETECTION_CATEGORIES[category]?.icon || IconShield
    const categoryInfo = DETECTION_CATEGORIES[category] || { label: category, color: 'default' }
    
    return (
        <Card 
            variant="outlined"
            sx={{ 
                height: '100%',
                borderColor: config?.enabled ? theme.palette.success.light : theme.palette.divider,
                transition: 'border-color 0.3s ease'
            }}
        >
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CategoryIcon size={24} color={theme.palette[categoryInfo.color]?.main} />
                        <Typography variant="h6">{categoryInfo.label}</Typography>
                    </Stack>
                    <Switch 
                        checked={config?.enabled ?? false}
                        onChange={(e) => onToggle(category, e.target.checked)}
                        color="success"
                    />
                </Stack>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Aktion bei Erkennung</InputLabel>
                            <Select
                                value={config?.action || 'mask'}
                                label="Aktion bei Erkennung"
                                onChange={(e) => onConfigChange(category, 'action', e.target.value)}
                                disabled={!config?.enabled}
                            >
                                {ACTION_TYPES.map((action) => (
                                    <MenuItem key={action.value} value={action.value}>
                                        <Stack>
                                            <Typography>{action.label}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {action.description}
                                            </Typography>
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Mindest-Schweregrad</InputLabel>
                            <Select
                                value={config?.minSeverity || 'low'}
                                label="Mindest-Schweregrad"
                                onChange={(e) => onConfigChange(category, 'minSeverity', e.target.value)}
                                disabled={!config?.enabled}
                            >
                                {SEVERITY_LEVELS.map((level) => (
                                    <MenuItem key={level.value} value={level.value}>
                                        <Chip 
                                            label={level.label} 
                                            size="small" 
                                            color={level.color}
                                            sx={{ mr: 1 }}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    {config?.action === 'mask' && (
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Maskierungsstil</InputLabel>
                                <Select
                                    value={config?.maskingStyle || 'asterisk'}
                                    label="Maskierungsstil"
                                    onChange={(e) => onConfigChange(category, 'maskingStyle', e.target.value)}
                                    disabled={!config?.enabled}
                                >
                                    {MASKING_STYLES.map((style) => (
                                        <MenuItem key={style.value} value={style.value}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Typography>{style.label}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {style.example}
                                                </Typography>
                                            </Stack>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        size="small"
                        startIcon={<IconTestPipe size={16} />}
                        onClick={() => onTest(category)}
                        disabled={!config?.enabled}
                    >
                        Testen
                    </Button>
                </Box>
            </CardContent>
        </Card>
    )
}

// Test Dialog Component
const TestDialog = ({ open, onClose, onTest, category, results }) => {
    const [testText, setTestText] = useState('')
    const [testing, setTesting] = useState(false)
    
    const handleTest = async () => {
        setTesting(true)
        await onTest(testText)
        setTesting(false)
    }
    
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Stack direction="row" spacing={1} alignItems="center">
                    <IconTestPipe size={24} />
                    <Typography variant="h5">
                        Guardrails Test {category && `- ${DETECTION_CATEGORIES[category]?.label || category}`}
                    </Typography>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Text zum Testen"
                        placeholder="Geben Sie hier Text mit sensiblen Daten ein, z.B. E-Mail-Adressen, Telefonnummern, Kreditkartennummern..."
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setTestText('Meine E-Mail ist max.mustermann@example.com und meine Telefonnummer ist +49 170 1234567.')}
                        >
                            PII Beispiel
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setTestText('Der API-Key lautet sk-abc123xyz456 und das Passwort ist geheim123!')}
                        >
                            Credentials Beispiel
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setTestText('Kreditkarte: 4111-1111-1111-1111, IBAN: DE89370400440532013000')}
                        >
                            Finanzdaten Beispiel
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setTestText('Diagnose: J45.0 (Asthma), verordnetes Medikament: Ibuprofen 400mg')}
                        >
                            Gesundheit Beispiel
                        </Button>
                    </Box>
                    
                    {results && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Ergebnis:</Typography>
                            
                            {results.isBlocked ? (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    Text wurde blockiert! {results.detections?.length || 0} Erkennungen.
                                </Alert>
                            ) : results.detections?.length > 0 ? (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    {results.detections.length} Erkennung(en) gefunden und verarbeitet.
                                </Alert>
                            ) : (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    Keine sensiblen Daten erkannt.
                                </Alert>
                            )}
                            
                            {results.processedText && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2">Verarbeiteter Text:</Typography>
                                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {results.processedText}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}
                            
                            {results.detections?.length > 0 && (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Kategorie</TableCell>
                                                <TableCell>Typ</TableCell>
                                                <TableCell>Schwere</TableCell>
                                                <TableCell>Original</TableCell>
                                                <TableCell>Maskiert</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {results.detections.map((detection, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>
                                                        <Chip 
                                                            label={DETECTION_CATEGORIES[detection.category]?.label || detection.category}
                                                            size="small"
                                                            color={DETECTION_CATEGORIES[detection.category]?.color || 'default'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{detection.type}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={detection.severity}
                                                            size="small"
                                                            color={SEVERITY_LEVELS.find(s => s.value === detection.severity)?.color || 'default'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <code>{detection.value?.substring(0, 20)}...</code>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code>{detection.maskedValue}</code>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Paper>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Schließen</Button>
                <Button 
                    variant="contained" 
                    onClick={handleTest}
                    disabled={!testText || testing}
                    startIcon={testing ? <CircularProgress size={16} /> : <IconTestPipe size={16} />}
                >
                    {testing ? 'Teste...' : 'Testen'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

// Main Component
const GuardrailsConfig = () => {
    const theme = useTheme()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [tabValue, setTabValue] = useState(0)
    
    // Global Guardrails state
    const [guardrailsEnabled, setGuardrailsEnabled] = useState(true)
    const [guardrailsMode, setGuardrailsMode] = useState('standard')
    
    // Scanner configs
    const [scannerConfigs, setScannerConfigs] = useState({
        pii: { enabled: true, action: 'mask', minSeverity: 'low', maskingStyle: 'asterisk' },
        credentials: { enabled: true, action: 'block', minSeverity: 'low', maskingStyle: 'redact' },
        financial: { enabled: true, action: 'mask', minSeverity: 'medium', maskingStyle: 'partial' },
        health: { enabled: true, action: 'mask', minSeverity: 'low', maskingStyle: 'placeholder' }
    })
    
    // Audit settings
    const [auditSettings, setAuditSettings] = useState({
        enabled: true,
        logAllRequests: false,
        retentionDays: 90,
        includeOriginalText: false
    })
    
    // Test dialog
    const [testDialogOpen, setTestDialogOpen] = useState(false)
    const [testCategory, setTestCategory] = useState(null)
    const [testResults, setTestResults] = useState(null)

    // Fetch configurations
    const fetchConfigs = useCallback(async () => {
        try {
            setLoading(true)
            const [statusResponse, configResponse] = await Promise.all([
                guardrailsApi.getStatus().catch(() => ({ data: null })),
                guardrailsApi.getAllConfigs().catch(() => ({ data: null }))
            ])
            
            if (statusResponse.data?.data) {
                setGuardrailsEnabled(statusResponse.data.data.enabled ?? true)
                setGuardrailsMode(statusResponse.data.data.mode ?? 'standard')
            }
            
            if (configResponse.data?.data) {
                // Parse scanner configs from response
                const configs = configResponse.data.data
                if (configs.scanners) {
                    setScannerConfigs(prev => ({ ...prev, ...configs.scanners }))
                }
                if (configs.audit) {
                    setAuditSettings(prev => ({ ...prev, ...configs.audit }))
                }
            }
        } catch (err) {
            console.error('Error fetching guardrails config:', err)
            setError('Fehler beim Laden der Guardrails-Konfiguration')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConfigs()
    }, [fetchConfigs])

    // Toggle global guardrails
    const handleToggleGuardrails = async (enabled) => {
        try {
            setGuardrailsEnabled(enabled)
            await guardrailsApi.toggleGuardrails(enabled)
            setSuccess(enabled ? 'Guardrails aktiviert' : 'Guardrails deaktiviert')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            console.error('Error toggling guardrails:', err)
            setError('Fehler beim Aktivieren/Deaktivieren der Guardrails')
            setGuardrailsEnabled(!enabled)
        }
    }

    // Toggle individual scanner
    const handleToggleScanner = async (category, enabled) => {
        setScannerConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], enabled }
        }))
    }

    // Update scanner config
    const handleScannerConfigChange = (category, field, value) => {
        setScannerConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: value }
        }))
    }

    // Open test dialog
    const handleOpenTest = (category = null) => {
        setTestCategory(category)
        setTestResults(null)
        setTestDialogOpen(true)
    }

    // Run test
    const handleRunTest = async (text) => {
        try {
            const response = await guardrailsApi.quickTest(text, 'input')
            if (response.data?.data) {
                setTestResults(response.data.data)
            }
        } catch (err) {
            console.error('Error running test:', err)
            setTestResults({
                error: true,
                message: 'Fehler beim Ausführen des Tests'
            })
        }
    }

    // Save all configurations
    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)
            
            // Build config object
            const configs = {
                enabled: guardrailsEnabled,
                mode: guardrailsMode,
                scanners: scannerConfigs,
                audit: auditSettings
            }
            
            await guardrailsApi.bulkUpdateConfigs(configs)
            
            setSuccess('Konfiguration erfolgreich gespeichert')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            console.error('Error saving config:', err)
            setError('Fehler beim Speichern der Konfiguration')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <MainCard title="AI Guardrails">
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
                    <IconShield size={28} />
                    <Typography variant="h4">AI Guardrails</Typography>
                    <StatusBadge enabled={guardrailsEnabled} />
                </Stack>
            }
            secondary={
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<IconTestPipe size={18} />}
                        onClick={() => handleOpenTest()}
                    >
                        Schnelltest
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<IconRefresh size={18} />}
                        onClick={fetchConfigs}
                    >
                        Aktualisieren
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <IconDeviceFloppy size={18} />}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Speichern...' : 'Speichern'}
                    </Button>
                </Stack>
            }
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}
            
            {/* Global Settings */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={guardrailsEnabled}
                                    onChange={(e) => handleToggleGuardrails(e.target.checked)}
                                    color="success"
                                />
                            }
                            label={
                                <Stack>
                                    <Typography variant="subtitle1">Guardrails Global</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Aktiviert/deaktiviert alle Sicherheitsprüfungen
                                    </Typography>
                                </Stack>
                            }
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small" disabled={!guardrailsEnabled}>
                            <InputLabel>Modus</InputLabel>
                            <Select
                                value={guardrailsMode}
                                label="Modus"
                                onChange={(e) => setGuardrailsMode(e.target.value)}
                            >
                                <MenuItem value="strict">
                                    <Stack>
                                        <Typography>Strikt</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Maximale Sicherheit, blockiert bei jedem Verdacht
                                        </Typography>
                                    </Stack>
                                </MenuItem>
                                <MenuItem value="standard">
                                    <Stack>
                                        <Typography>Standard</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Ausgewogener Schutz mit Maskierung
                                        </Typography>
                                    </Stack>
                                </MenuItem>
                                <MenuItem value="permissive">
                                    <Stack>
                                        <Typography>Permissiv</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Nur Protokollierung, keine Blockierung
                                        </Typography>
                                    </Stack>
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Tooltip title="Informationen zu Guardrails">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconInfoCircle size={20} color={theme.palette.info.main} />
                                <Typography variant="body2" color="text.secondary">
                                    Guardrails schützen vor sensiblen Daten in AI-Interaktionen
                                </Typography>
                            </Stack>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Paper>
            
            {/* Tabs */}
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="Scanner" icon={<IconShield size={18} />} iconPosition="start" />
                <Tab label="Maskierung" icon={<IconMask size={18} />} iconPosition="start" />
                <Tab label="Audit" icon={<IconEye size={18} />} iconPosition="start" />
            </Tabs>
            
            {/* Scanner Tab */}
            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    {Object.keys(DETECTION_CATEGORIES).map((category) => (
                        <Grid item xs={12} md={6} key={category}>
                            <ScannerCard
                                category={category}
                                config={scannerConfigs[category]}
                                onToggle={handleToggleScanner}
                                onConfigChange={handleScannerConfigChange}
                                onTest={handleOpenTest}
                            />
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>
            
            {/* Masking Tab */}
            <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>Maskierungsstile</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Definieren Sie, wie sensible Daten maskiert werden sollen.
                        </Typography>
                    </Grid>
                    
                    {MASKING_STYLES.map((style) => (
                        <Grid item xs={12} md={6} lg={4} key={style.value}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={1}>
                                    <Typography variant="subtitle1">{style.label}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Beispiel: <code>{style.example}</code>
                                    </Typography>
                                </Stack>
                            </Paper>
                        </Grid>
                    ))}
                    
                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>Erweiterte Maskierungsregeln</Typography>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Benutzerdefinierte Maskierungsregeln können für spezifische Anwendungsfälle definiert werden.
                        </Alert>
                        <Button 
                            variant="outlined" 
                            startIcon={<IconPlus size={18} />}
                            disabled
                        >
                            Neue Regel hinzufügen (Demnächst)
                        </Button>
                    </Grid>
                </Grid>
            </TabPanel>
            
            {/* Audit Tab */}
            <TabPanel value={tabValue} index={2}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <IconEye size={20} />
                                        <span>Audit-Einstellungen</span>
                                    </Stack>
                                </Typography>
                                
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={auditSettings.enabled}
                                                onChange={(e) => setAuditSettings(prev => ({ 
                                                    ...prev, 
                                                    enabled: e.target.checked 
                                                }))}
                                                color="success"
                                            />
                                        }
                                        label="Audit aktivieren"
                                    />
                                    
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={auditSettings.logAllRequests}
                                                onChange={(e) => setAuditSettings(prev => ({ 
                                                    ...prev, 
                                                    logAllRequests: e.target.checked 
                                                }))}
                                                disabled={!auditSettings.enabled}
                                            />
                                        }
                                        label="Alle Anfragen protokollieren (nicht nur Erkennungen)"
                                    />
                                    
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={auditSettings.includeOriginalText}
                                                onChange={(e) => setAuditSettings(prev => ({ 
                                                    ...prev, 
                                                    includeOriginalText: e.target.checked 
                                                }))}
                                                disabled={!auditSettings.enabled}
                                            />
                                        }
                                        label="Originaltext speichern (Datenschutz beachten!)"
                                    />
                                    
                                    <TextField
                                        type="number"
                                        label="Aufbewahrungsdauer (Tage)"
                                        value={auditSettings.retentionDays}
                                        onChange={(e) => setAuditSettings(prev => ({ 
                                            ...prev, 
                                            retentionDays: parseInt(e.target.value) || 90 
                                        }))}
                                        disabled={!auditSettings.enabled}
                                        size="small"
                                        inputProps={{ min: 1, max: 365 }}
                                        helperText="1-365 Tage"
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <IconInfoCircle size={20} />
                                        <span>Hinweise</span>
                                    </Stack>
                                </Typography>
                                
                                <Stack spacing={1} sx={{ mt: 2 }}>
                                    <Alert severity="warning">
                                        Das Speichern von Originaltexten kann datenschutzrechtliche Implikationen haben.
                                    </Alert>
                                    <Alert severity="info">
                                        Audit-Logs werden automatisch nach der Aufbewahrungsdauer gelöscht.
                                    </Alert>
                                    <Alert severity="info">
                                        Sie können Audit-Logs im Analytics Dashboard einsehen und exportieren.
                                    </Alert>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>
            
            {/* Test Dialog */}
            <TestDialog
                open={testDialogOpen}
                onClose={() => setTestDialogOpen(false)}
                onTest={handleRunTest}
                category={testCategory}
                results={testResults}
            />
        </MainCard>
    )
}

export default GuardrailsConfig
