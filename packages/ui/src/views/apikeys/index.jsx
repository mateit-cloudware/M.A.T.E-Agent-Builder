import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import moment from 'moment'

// Material-UI
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
    Button,
    Box,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Typography,
    Alert,
    Tooltip,
    IconButton
} from '@mui/material'

// Project imports
import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import AddEditAPIKeyDialog from './AddEditAPIKeyDialog'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// API
import apiKeysApi from '@/api/apikeys'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import useNotifier from '@/utils/useNotifier'

// Icons
import {
    IconTrash,
    IconRefresh,
    IconPlus,
    IconX,
    IconKey,
    IconCheck,
    IconAlertCircle,
    IconShieldCheck,
    IconInfoCircle
} from '@tabler/icons-react'

// Store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    padding: '12px 16px',

    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900],
        fontWeight: 600
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14
    }
}))

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover
    },
    '&:last-child td, &:last-child th': {
        border: 0
    },
    '&:hover': {
        backgroundColor: theme.palette.action.selected
    }
}))

// Provider Icons & Colors
const PROVIDER_CONFIG = {
    openrouter: { icon: '🔄', color: 'primary', label: 'OpenRouter' },
    openai: { icon: '🤖', color: 'success', label: 'OpenAI' },
    anthropic: { icon: '🧠', color: 'secondary', label: 'Anthropic' },
    google: { icon: '🌐', color: 'info', label: 'Google' },
    custom: { icon: '🔧', color: 'default', label: 'Custom' }
}

// Status Colors
const STATUS_CONFIG = {
    active: { color: 'success', label: 'Aktiv', icon: <IconCheck size={16} /> },
    expired: { color: 'error', label: 'Abgelaufen', icon: <IconAlertCircle size={16} /> },
    revoked: { color: 'error', label: 'Widerrufen', icon: <IconAlertCircle size={16} /> },
    suspended: { color: 'warning', label: 'Pausiert', icon: <IconAlertCircle size={16} /> },
    pending_validation: { color: 'warning', label: 'Validierung ausstehend', icon: <IconInfoCircle size={16} /> }
}

/**
 * APIKeys View
 * 
 * BYOK (Bring Your Own Key) Management Interface
 * 
 * Features:
 * - Liste aller gespeicherten API-Keys (verschlüsselt)
 * - Hinzufügen neuer Keys mit Echtzeit-Validierung
 * - Re-Validierung bestehender Keys
 * - Löschen (Soft-Delete)
 */
const APIKeys = () => {
    const dispatch = useDispatch()
    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [apiKeys, setApiKeys] = useState([])
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const { confirm } = useConfirm()
    const getAllAPIKeysApi = useApi(apiKeysApi.getAllAPIKeys)

    useEffect(() => {
        loadAPIKeys()
    }, [])

    const loadAPIKeys = async () => {
        setLoading(true)
        try {
            const response = await getAllAPIKeysApi.request()
            if (response.data) {
                setApiKeys(response.data)
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Fehler beim Laden: ${error.message}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleAddNew = () => {
        setDialogProps({ type: 'ADD' })
        setShowDialog(true)
    }

    const handleDialogConfirm = () => {
        setShowDialog(false)
        loadAPIKeys()
    }

    const handleRevalidate = async (apiKey) => {
        try {
            const response = await apiKeysApi.revalidateAPIKey(apiKey.id)
            enqueueSnackbar({
                message: response.data.valid ? '✅ Key ist noch gültig' : '❌ Key ist ungültig',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: response.data.valid ? 'success' : 'error',
                    autoHideDuration: 3000,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            loadAPIKeys()
        } catch (error) {
            enqueueSnackbar({
                message: `Fehler bei Re-Validierung: ${error.message}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const handleDelete = async (apiKey) => {
        const confirmPayload = {
            title: `API-Key löschen`,
            description: `Möchten Sie den API-Key "${apiKey.name}" wirklich löschen?`,
            confirmButtonName: 'Löschen',
            cancelButtonName: 'Abbrechen'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await apiKeysApi.deleteAPIKey(apiKey.id)
                enqueueSnackbar({
                    message: '🗑️ API-Key gelöscht',
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
                loadAPIKeys()
            } catch (error) {
                enqueueSnackbar({
                    message: `Fehler beim Löschen: ${error.message}`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        }
    }

    const getProviderConfig = (provider) => PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.custom
    const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending_validation

    return (
        <>
            <MainCard>
                <ViewHeader
                    isBackButton={false}
                    search={false}
                    title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconKey size={28} />
                            <Typography variant='h3'>BYOK API-Keys</Typography>
                        </Box>
                    }
                    onSearchChange={() => {}}
                >
                    <Button variant='contained' color='primary' onClick={handleAddNew} startIcon={<IconPlus />}>
                        Neuen Key hinzufügen
                    </Button>
                </ViewHeader>

                {/* Info Alert */}
                <Box sx={{ mb: 3 }}>
                    <Alert severity='info' icon={<IconShieldCheck />}>
                        <Typography variant='body2'>
                            <strong>BYOK (Bring Your Own Key):</strong> Verwenden Sie Ihre eigenen LLM-API-Keys für maximale
                            Kontrolle und Flexibilität.
                            <br />
                            Alle Keys werden mit <strong>AES-256-GCM</strong> verschlüsselt gespeichert und nie im Klartext
                            angezeigt.
                        </Typography>
                    </Alert>
                </Box>

                {/* Loading State */}
                {isLoading && (
                    <Stack spacing={2}>
                        {[1, 2, 3].map((idx) => (
                            <Skeleton key={idx} variant='rectangular' height={60} />
                        ))}
                    </Stack>
                )}

                {/* Empty State */}
                {!isLoading && apiKeys.length === 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 400,
                            gap: 2
                        }}
                    >
                        <IconKey size={64} stroke={1} style={{ opacity: 0.3 }} />
                        <Typography variant='h4' color='textSecondary'>
                            Keine API-Keys vorhanden
                        </Typography>
                        <Typography variant='body2' color='textSecondary'>
                            Fügen Sie Ihren ersten LLM-API-Key hinzu
                        </Typography>
                        <Button variant='contained' color='primary' onClick={handleAddNew} startIcon={<IconPlus />} sx={{ mt: 2 }}>
                            Ersten Key hinzufügen
                        </Button>
                    </Box>
                )}

                {/* Table */}
                {!isLoading && apiKeys.length > 0 && (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <StyledTableCell>Provider</StyledTableCell>
                                    <StyledTableCell>Name</StyledTableCell>
                                    <StyledTableCell>Status</StyledTableCell>
                                    <StyledTableCell>Letzte Validierung</StyledTableCell>
                                    <StyledTableCell>Erstellt</StyledTableCell>
                                    <StyledTableCell align='right'>Aktionen</StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {apiKeys.map((apiKey) => {
                                    const providerConfig = getProviderConfig(apiKey.provider)
                                    const statusConfig = getStatusConfig(apiKey.status)

                                    return (
                                        <StyledTableRow key={apiKey.id}>
                                            <StyledTableCell>
                                                <Chip
                                                    icon={<span style={{ fontSize: 16 }}>{providerConfig.icon}</span>}
                                                    label={providerConfig.label}
                                                    color={providerConfig.color}
                                                    size='small'
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant='body2' fontWeight={500}>
                                                    {apiKey.name}
                                                </Typography>
                                                <Typography variant='caption' color='textSecondary'>
                                                    {apiKey.keyMask || '••••••••'}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Chip
                                                    icon={statusConfig.icon}
                                                    label={statusConfig.label}
                                                    color={statusConfig.color}
                                                    size='small'
                                                    variant='outlined'
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant='body2'>
                                                    {apiKey.lastValidated
                                                        ? moment(apiKey.lastValidated).format('DD.MM.YYYY HH:mm')
                                                        : 'Nie'}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant='body2'>
                                                    {moment(apiKey.createdAt).format('DD.MM.YYYY')}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell align='right'>
                                                <Stack direction='row' spacing={1} justifyContent='flex-end'>
                                                    <Tooltip title='Re-validieren'>
                                                        <IconButton
                                                            size='small'
                                                            color='primary'
                                                            onClick={() => handleRevalidate(apiKey)}
                                                        >
                                                            <IconRefresh size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title='Löschen'>
                                                        <IconButton size='small' color='error' onClick={() => handleDelete(apiKey)}>
                                                            <IconTrash size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </StyledTableCell>
                                        </StyledTableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </MainCard>

            {/* Add/Edit Dialog */}
            <AddEditAPIKeyDialog show={showDialog} dialogProps={dialogProps} onCancel={() => setShowDialog(false)} onConfirm={handleDialogConfirm} />

            {/* Confirm Dialog */}
            <ConfirmDialog />
        </>
    )
}

export default function APIKeysWrapper() {
    return (
        <ErrorBoundary>
            <APIKeys />
        </ErrorBoundary>
    )
}
