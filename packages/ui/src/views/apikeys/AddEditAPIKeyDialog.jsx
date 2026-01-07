import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

// Material-UI
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    Alert,
    CircularProgress,
    Typography,
    InputAdornment,
    IconButton,
    Chip,
    Stack
} from '@mui/material'
import { IconX, IconCheck, IconAlertCircle, IconEye, IconEyeOff, IconKey } from '@tabler/icons-react'

// API
import apiKeysApi from '@/api/apikeys'

// Store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

const API_PROVIDERS = [
    { value: 'openrouter', label: 'OpenRouter', icon: '🔄' },
    { value: 'openai', label: 'OpenAI', icon: '🤖' },
    { value: 'anthropic', label: 'Anthropic (Claude)', icon: '🧠' },
    { value: 'google', label: 'Google (Gemini)', icon: '🌐' },
    { value: 'custom', label: 'Custom Provider', icon: '🔧' }
]

/**
 * AddEditAPIKeyDialog
 * 
 * Dialog für BYOK (Bring Your Own Key) - API-Key-Eingabe mit Echtzeit-Validierung
 * 
 * Features:
 * - Multi-Provider-Support (OpenRouter, OpenAI, Anthropic, Google, Custom)
 * - Echtzeit-Validierung mit Test-Call zu Provider
 * - Balance-Check und Feedback
 * - AES-256-GCM-Verschlüsselung beim Speichern
 */
const AddEditAPIKeyDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    // Form State
    const [provider, setProvider] = useState('openrouter')
    const [apiKey, setApiKey] = useState('')
    const [keyName, setKeyName] = useState('')
    const [showKey, setShowKey] = useState(false)

    // Validation State
    const [isValidating, setIsValidating] = useState(false)
    const [validationResult, setValidationResult] = useState(null)
    const [validationError, setValidationError] = useState(null)

    // UI State
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (dialogProps?.data) {
            // Edit-Mode
            const data = dialogProps.data
            setProvider(data.provider || 'openrouter')
            setKeyName(data.name || '')
            // API-Key kann nicht geladen werden (verschlüsselt)
            setApiKey('')
        } else {
            // Add-Mode
            resetForm()
        }
    }, [dialogProps])

    const resetForm = () => {
        setProvider('openrouter')
        setApiKey('')
        setKeyName('')
        setShowKey(false)
        setValidationResult(null)
        setValidationError(null)
    }

    const handleValidate = async () => {
        if (!apiKey || apiKey.trim().length < 10) {
            setValidationError('API-Key ist zu kurz')
            return
        }

        setIsValidating(true)
        setValidationResult(null)
        setValidationError(null)

        try {
            const response = await apiKeysApi.validateAPIKey({
                apiKey: apiKey.trim(),
                provider
            })

            if (response.data.valid) {
                setValidationResult(response.data)
                setValidationError(null)
                enqueueSnackbar({
                    message: '✅ API-Key ist gültig und funktionsfähig!',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        autoHideDuration: 3000,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            } else {
                setValidationError(response.data.error || 'API-Key ungültig')
                setValidationResult(null)
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'Validierung fehlgeschlagen'
            setValidationError(errorMsg)
            setValidationResult(null)
            enqueueSnackbar({
                message: `❌ Validierung fehlgeschlagen: ${errorMsg}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setIsValidating(false)
        }
    }

    const handleSave = async () => {
        if (!validationResult || !validationResult.valid) {
            enqueueSnackbar({
                message: '⚠️ Bitte validieren Sie den API-Key zuerst',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'warning'
                }
            })
            return
        }

        setIsSaving(true)

        try {
            const payload = {
                apiKey: apiKey.trim(),
                provider,
                name: keyName || `${provider.toUpperCase()} Key`
            }

            const response = await apiKeysApi.createAPIKey(payload)

            enqueueSnackbar({
                message: '✅ API-Key erfolgreich gespeichert (verschlüsselt)',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    autoHideDuration: 3000,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })

            resetForm()
            onConfirm(response.data)
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'Speichern fehlgeschlagen'
            enqueueSnackbar({
                message: `❌ Fehler beim Speichern: ${errorMsg}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        resetForm()
        onCancel()
    }

    const getProviderIcon = (providerValue) => {
        return API_PROVIDERS.find((p) => p.value === providerValue)?.icon || '🔑'
    }

    return (
        <Dialog open={show} onClose={handleCancel} maxWidth='sm' fullWidth>
            <DialogTitle>
                <Box display='flex' alignItems='center' gap={1}>
                    <IconKey size={24} />
                    <Typography variant='h4'>
                        {dialogProps?.type === 'EDIT' ? 'API-Key bearbeiten' : 'Neuen API-Key hinzufügen'}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    {/* Info Box */}
                    <Alert severity='info' icon={<IconAlertCircle />}>
                        <Typography variant='body2'>
                            <strong>BYOK (Bring Your Own Key):</strong> Verwenden Sie Ihre eigenen LLM-API-Keys.
                            <br />
                            Keys werden mit <strong>AES-256-GCM</strong> verschlüsselt gespeichert.
                        </Typography>
                    </Alert>

                    {/* Provider Selection */}
                    <TextField
                        select
                        fullWidth
                        label='Provider'
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        disabled={dialogProps?.type === 'EDIT'}
                        helperText='Wählen Sie Ihren LLM-Provider'
                    >
                        {API_PROVIDERS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                <Box display='flex' alignItems='center' gap={1}>
                                    <span>{option.icon}</span>
                                    <span>{option.label}</span>
                                </Box>
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* API Key Input */}
                    <TextField
                        fullWidth
                        label='API-Key'
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => {
                            setApiKey(e.target.value)
                            setValidationResult(null)
                            setValidationError(null)
                        }}
                        placeholder={`sk-${provider}-...`}
                        helperText='Ihr API-Key wird verschlüsselt gespeichert und nie im Klartext angezeigt'
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <span>{getProviderIcon(provider)}</span>
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <IconButton onClick={() => setShowKey(!showKey)} edge='end' size='small'>
                                        {showKey ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {/* Validation Button & Status */}
                    <Box>
                        <Button
                            variant='outlined'
                            onClick={handleValidate}
                            disabled={!apiKey || apiKey.trim().length < 10 || isValidating}
                            fullWidth
                            startIcon={isValidating ? <CircularProgress size={16} /> : <IconCheck />}
                        >
                            {isValidating ? 'Validiere...' : 'API-Key validieren'}
                        </Button>

                        {/* Validation Result */}
                        {validationResult && validationResult.valid && (
                            <Alert severity='success' sx={{ mt: 2 }} icon={<IconCheck />}>
                                <Typography variant='body2'>
                                    <strong>✅ Key ist gültig!</strong>
                                    <br />
                                    Provider: {validationResult.provider}
                                    {validationResult.hasBalance && (
                                        <>
                                            <br />
                                            Guthaben: {validationResult.estimatedBalance || '?'} {validationResult.currency || 'USD'}
                                        </>
                                    )}
                                </Typography>
                            </Alert>
                        )}

                        {/* Validation Error */}
                        {validationError && (
                            <Alert severity='error' sx={{ mt: 2 }} icon={<IconAlertCircle />}>
                                <Typography variant='body2'>
                                    <strong>❌ Validierung fehlgeschlagen</strong>
                                    <br />
                                    {validationError}
                                </Typography>
                            </Alert>
                        )}
                    </Box>

                    {/* Optional: Key Name */}
                    <TextField
                        fullWidth
                        label='Name (Optional)'
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder={`Mein ${provider.toUpperCase()} Key`}
                        helperText='Geben Sie dem Key einen aussagekräftigen Namen'
                    />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleCancel} disabled={isSaving}>
                    Abbrechen
                </Button>
                <Button
                    variant='contained'
                    onClick={handleSave}
                    disabled={!validationResult || !validationResult.valid || isSaving}
                    startIcon={isSaving ? <CircularProgress size={16} /> : <IconKey />}
                >
                    {isSaving ? 'Speichere...' : 'Speichern (verschlüsselt)'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

AddEditAPIKeyDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default AddEditAPIKeyDialog
