/**
 * M.A.T.E. Platform Configuration
 * 
 * SuperAdmin interface for managing:
 * - LLM Provider (OpenRouter API-Key, Models)
 * - VAPI Integration (API-Key, Webhook-Secret)
 * - Pricing Configuration (Margins, Voice prices)
 * - Limits & Volume Discounts
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
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Paper
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconBrain,
    IconMicrophone,
    IconCoin,
    IconSettings,
    IconRefresh,
    IconCheck,
    IconAlertCircle,
    IconEye,
    IconEyeOff,
    IconDeviceFloppy
} from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import adminApi from '@/api/admin'

// Available LLM Models
const LLM_MODELS = [
    { value: 'moonshotai/kimi-k2', label: 'Kimi K2 (Moonshot)' },
    { value: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 Instruct' },
    { value: 'qwen/qwen3-max', label: 'Qwen3 Max (Alibaba)' },
    { value: 'openai/gpt-4o', label: 'GPT-4o (OpenAI)' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenAI)' },
    { value: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
    { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' }
]

// Tab Panel Component
const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
)

// Config Status Badge
const StatusBadge = ({ isConfigured, isRequired }) => {
    if (isConfigured) {
        return <Chip label="Konfiguriert" color="success" size="small" icon={<IconCheck size={14} />} />
    }
    if (isRequired) {
        return <Chip label="Erforderlich" color="error" size="small" icon={<IconAlertCircle size={14} />} />
    }
    return <Chip label="Optional" color="default" size="small" />
}

// Secret Input Field with visibility toggle
const SecretField = ({ label, value, onChange, placeholder, helperText }) => {
    const [showSecret, setShowSecret] = useState(false)
    
    return (
        <TextField
            fullWidth
            label={label}
            type={showSecret ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            helperText={helperText}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton onClick={() => setShowSecret(!showSecret)} edge="end">
                            {showSecret ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </IconButton>
                    </InputAdornment>
                )
            }}
        />
    )
}

const PlatformConfig = () => {
    const theme = useTheme()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [tabValue, setTabValue] = useState(0)
    
    // Config data grouped by category
    const [configData, setConfigData] = useState([])
    const [configStatus, setConfigStatus] = useState(null)
    
    // Form state for each category
    const [llmForm, setLlmForm] = useState({
        openrouter_api_key: '',
        openrouter_base_url: 'https://openrouter.ai/api/v1',
        default_model: 'moonshotai/kimi-k2',
        fallback_model: 'qwen/qwen3-max',
        max_retries: '3',
        timeout_ms: '30000'
    })
    
    const [vapiForm, setVapiForm] = useState({
        vapi_api_key: '',
        vapi_webhook_secret: '',
        vapi_default_voice: 'minimax'
    })
    
    const [pricingForm, setPricingForm] = useState({
        token_margin_percent: '40',
        voice_margin_percent: '30',
        voice_inbound_price: '0.08',
        voice_outbound_price: '0.12',
        phone_number_monthly: '5.00'
    })
    
    const [limitsForm, setLimitsForm] = useState({
        initial_credits: '1000',
        rate_limit_requests: '100',
        rate_limit_window_ms: '60000'
    })

    // Fetch all configs
    const fetchConfigs = useCallback(async () => {
        try {
            setLoading(true)
            const [configsResponse, statusResponse] = await Promise.all([
                adminApi.getAllConfigs(),
                adminApi.getConfigStatus()
            ])
            
            if (configsResponse.data?.data) {
                setConfigData(configsResponse.data.data)
                
                // Populate forms from config data
                configsResponse.data.data.forEach(category => {
                    category.configs.forEach(config => {
                        const value = typeof config.value === 'object' 
                            ? JSON.stringify(config.value) 
                            : String(config.value || '')
                        
                        // Only update if not a masked secret value
                        if (config.valueType !== 'secret' || !value.startsWith('••••')) {
                            if (llmForm.hasOwnProperty(config.key)) {
                                setLlmForm(prev => ({ ...prev, [config.key]: value }))
                            } else if (vapiForm.hasOwnProperty(config.key)) {
                                setVapiForm(prev => ({ ...prev, [config.key]: value }))
                            } else if (pricingForm.hasOwnProperty(config.key)) {
                                setPricingForm(prev => ({ ...prev, [config.key]: value }))
                            } else if (limitsForm.hasOwnProperty(config.key)) {
                                setLimitsForm(prev => ({ ...prev, [config.key]: value }))
                            }
                        }
                    })
                })
            }
            
            if (statusResponse.data?.data) {
                setConfigStatus(statusResponse.data.data)
            }
        } catch (err) {
            console.error('Error fetching configs:', err)
            setError('Fehler beim Laden der Konfiguration')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConfigs()
    }, [fetchConfigs])

    // Save configs for a category
    const saveCategory = async (category, formData) => {
        try {
            setSaving(true)
            setError(null)
            
            const configs = Object.entries(formData)
                .filter(([key, value]) => {
                    // Don't send masked secret values
                    if (typeof value === 'string' && value.startsWith('••••')) return false
                    return true
                })
                .map(([key, value]) => ({ key, value }))
            
            if (configs.length === 0) {
                setSuccess('Keine Änderungen zum Speichern')
                return
            }
            
            await adminApi.updateConfigs(configs)
            setSuccess(`${category}-Konfiguration gespeichert`)
            await fetchConfigs()
        } catch (err) {
            console.error('Error saving configs:', err)
            setError('Fehler beim Speichern der Konfiguration')
        } finally {
            setSaving(false)
        }
    }

    // Get category completion
    const getCategoryCompletion = (categoryName) => {
        const category = configData.find(c => c.category === categoryName)
        return category?.completionPercent || 0
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <MainCard
            title="Plattform-Konfiguration"
            secondary={
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Aktualisieren">
                        <IconButton onClick={fetchConfigs} disabled={loading}>
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
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Config Status Overview */}
            {configStatus && !configStatus.isComplete && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Erforderliche Konfigurationen fehlen:</Typography>
                    <Typography variant="body2">
                        {configStatus.missing.map(k => k.replace(/_/g, ' ')).join(', ')}
                    </Typography>
                </Alert>
            )}

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={(e, v) => setTabValue(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab 
                        icon={<IconBrain size={18} />} 
                        iconPosition="start" 
                        label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <span>LLM-Provider</span>
                                <Chip 
                                    size="small" 
                                    label={`${getCategoryCompletion('llm')}%`}
                                    color={getCategoryCompletion('llm') === 100 ? 'success' : 'warning'}
                                />
                            </Stack>
                        } 
                    />
                    <Tab 
                        icon={<IconMicrophone size={18} />} 
                        iconPosition="start" 
                        label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <span>VAPI Voice</span>
                                <Chip 
                                    size="small" 
                                    label={`${getCategoryCompletion('vapi')}%`}
                                    color={getCategoryCompletion('vapi') === 100 ? 'success' : 'warning'}
                                />
                            </Stack>
                        } 
                    />
                    <Tab 
                        icon={<IconCoin size={18} />} 
                        iconPosition="start" 
                        label="Preise & Margen"
                    />
                    <Tab 
                        icon={<IconSettings size={18} />} 
                        iconPosition="start" 
                        label="Limits & Rabatte"
                    />
                </Tabs>
            </Box>

            {/* LLM Provider Tab */}
            <TabPanel value={tabValue} index={0}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Konfigurieren Sie die OpenRouter-Integration für LLM-Anfragen.
                    Der API-Key wird verschlüsselt gespeichert.
                </Typography>
                
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <SecretField
                            label="OpenRouter API Key"
                            value={llmForm.openrouter_api_key}
                            onChange={(e) => setLlmForm({ ...llmForm, openrouter_api_key: e.target.value })}
                            placeholder="sk-or-v1-..."
                            helperText="API-Schlüssel von openrouter.ai"
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="API Base URL"
                            value={llmForm.openrouter_base_url}
                            onChange={(e) => setLlmForm({ ...llmForm, openrouter_base_url: e.target.value })}
                            helperText="Standard: https://openrouter.ai/api/v1"
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Standard-Modell</InputLabel>
                            <Select
                                value={llmForm.default_model}
                                label="Standard-Modell"
                                onChange={(e) => setLlmForm({ ...llmForm, default_model: e.target.value })}
                            >
                                {LLM_MODELS.map(model => (
                                    <MenuItem key={model.value} value={model.value}>
                                        {model.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Fallback-Modell</InputLabel>
                            <Select
                                value={llmForm.fallback_model}
                                label="Fallback-Modell"
                                onChange={(e) => setLlmForm({ ...llmForm, fallback_model: e.target.value })}
                            >
                                {LLM_MODELS.map(model => (
                                    <MenuItem key={model.value} value={model.value}>
                                        {model.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            label="Max. Wiederholungen"
                            type="number"
                            value={llmForm.max_retries}
                            onChange={(e) => setLlmForm({ ...llmForm, max_retries: e.target.value })}
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            label="Timeout (ms)"
                            type="number"
                            value={llmForm.timeout_ms}
                            onChange={(e) => setLlmForm({ ...llmForm, timeout_ms: e.target.value })}
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            startIcon={<IconDeviceFloppy size={18} />}
                            onClick={() => saveCategory('LLM', llmForm)}
                            disabled={saving}
                        >
                            {saving ? 'Speichern...' : 'LLM-Konfiguration speichern'}
                        </Button>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* VAPI Tab */}
            <TabPanel value={tabValue} index={1}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Konfigurieren Sie die VAPI-Integration für Voice-Agenten.
                    Der API-Key und Webhook-Secret werden verschlüsselt gespeichert.
                </Typography>
                
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <SecretField
                            label="VAPI API Key"
                            value={vapiForm.vapi_api_key}
                            onChange={(e) => setVapiForm({ ...vapiForm, vapi_api_key: e.target.value })}
                            placeholder="vapi_..."
                            helperText="API-Schlüssel von vapi.ai"
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <SecretField
                            label="Webhook Secret"
                            value={vapiForm.vapi_webhook_secret}
                            onChange={(e) => setVapiForm({ ...vapiForm, vapi_webhook_secret: e.target.value })}
                            placeholder="whsec_..."
                            helperText="Optional: Zur Validierung eingehender Webhooks"
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Standard-Stimme"
                            value={vapiForm.vapi_default_voice}
                            onChange={(e) => setVapiForm({ ...vapiForm, vapi_default_voice: e.target.value })}
                            helperText="z.B. minimax, openai, playht"
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            startIcon={<IconDeviceFloppy size={18} />}
                            onClick={() => saveCategory('VAPI', vapiForm)}
                            disabled={saving}
                        >
                            {saving ? 'Speichern...' : 'VAPI-Konfiguration speichern'}
                        </Button>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Pricing Tab */}
            <TabPanel value={tabValue} index={2}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Konfigurieren Sie die Preise und Margen für Token- und Voice-Abrechnung.
                </Typography>
                
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                            Margen
                        </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Token-Marge"
                            type="number"
                            value={pricingForm.token_margin_percent}
                            onChange={(e) => setPricingForm({ ...pricingForm, token_margin_percent: e.target.value })}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>
                            }}
                            helperText="Aufschlag auf LLM-Token-Kosten"
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Voice-Marge"
                            type="number"
                            value={pricingForm.voice_margin_percent}
                            onChange={(e) => setPricingForm({ ...pricingForm, voice_margin_percent: e.target.value })}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>
                            }}
                            helperText="Aufschlag auf Voice-Kosten"
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                            Voice-Preise (pro Minute)
                        </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Eingehende Anrufe"
                            type="number"
                            value={pricingForm.voice_inbound_price}
                            onChange={(e) => setPricingForm({ ...pricingForm, voice_inbound_price: e.target.value })}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">€</InputAdornment>,
                                endAdornment: <InputAdornment position="end">/Min</InputAdornment>
                            }}
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Ausgehende Anrufe"
                            type="number"
                            value={pricingForm.voice_outbound_price}
                            onChange={(e) => setPricingForm({ ...pricingForm, voice_outbound_price: e.target.value })}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">€</InputAdornment>,
                                endAdornment: <InputAdornment position="end">/Min</InputAdornment>
                            }}
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Telefonnummer (monatlich)"
                            type="number"
                            value={pricingForm.phone_number_monthly}
                            onChange={(e) => setPricingForm({ ...pricingForm, phone_number_monthly: e.target.value })}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">€</InputAdornment>,
                                endAdornment: <InputAdornment position="end">/Monat</InputAdornment>
                            }}
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            startIcon={<IconDeviceFloppy size={18} />}
                            onClick={() => saveCategory('Pricing', pricingForm)}
                            disabled={saving}
                        >
                            {saving ? 'Speichern...' : 'Pricing-Konfiguration speichern'}
                        </Button>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Limits Tab */}
            <TabPanel value={tabValue} index={3}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Konfigurieren Sie Nutzungslimits und das initiale Guthaben für neue Benutzer.
                </Typography>
                
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Start-Guthaben"
                            type="number"
                            value={limitsForm.initial_credits}
                            onChange={(e) => setLimitsForm({ ...limitsForm, initial_credits: e.target.value })}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">Cents</InputAdornment>
                            }}
                            helperText={`= €${(parseInt(limitsForm.initial_credits) / 100).toFixed(2)}`}
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Rate-Limit (Anfragen)"
                            type="number"
                            value={limitsForm.rate_limit_requests}
                            onChange={(e) => setLimitsForm({ ...limitsForm, rate_limit_requests: e.target.value })}
                            helperText="Max. Anfragen pro Zeitfenster"
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Rate-Limit Zeitfenster"
                            type="number"
                            value={limitsForm.rate_limit_window_ms}
                            onChange={(e) => setLimitsForm({ ...limitsForm, rate_limit_window_ms: e.target.value })}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">ms</InputAdornment>
                            }}
                            helperText={`= ${(parseInt(limitsForm.rate_limit_window_ms) / 1000).toFixed(0)} Sekunden`}
                        />
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                            Volumen-Rabatte
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                            Die Volumen-Rabatte werden automatisch basierend auf der monatlichen Nutzung angewendet:
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Token-Rabatte</Typography>
                                    <Stack spacing={0.5}>
                                        <Typography variant="body2">0 - 100K Tokens: 0%</Typography>
                                        <Typography variant="body2">100K - 500K Tokens: 5%</Typography>
                                        <Typography variant="body2">500K - 1M Tokens: 10%</Typography>
                                        <Typography variant="body2">1M - 5M Tokens: 15%</Typography>
                                        <Typography variant="body2">5M+ Tokens: 20%</Typography>
                                    </Stack>
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Voice-Rabatte</Typography>
                                    <Stack spacing={0.5}>
                                        <Typography variant="body2">0 - 60 Min: 0%</Typography>
                                        <Typography variant="body2">60 - 300 Min: 5%</Typography>
                                        <Typography variant="body2">300 - 1000 Min: 10%</Typography>
                                        <Typography variant="body2">1000 - 5000 Min: 15%</Typography>
                                        <Typography variant="body2">5000+ Min: 20%</Typography>
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            startIcon={<IconDeviceFloppy size={18} />}
                            onClick={() => saveCategory('Limits', limitsForm)}
                            disabled={saving}
                        >
                            {saving ? 'Speichern...' : 'Limits-Konfiguration speichern'}
                        </Button>
                    </Grid>
                </Grid>
            </TabPanel>
        </MainCard>
    )
}

export default PlatformConfig
