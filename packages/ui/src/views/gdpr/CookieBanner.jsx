import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// MUI
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Switch,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Paper,
    Divider,
    IconButton,
    useTheme
} from '@mui/material'
import { IconChevronDown, IconX, IconCookie, IconShieldLock } from '@tabler/icons-react'

// API
import gdprApi from '@/api/gdpr'

// Consent-Typen mit Beschreibungen
const CONSENT_TYPES = {
    essential: {
        name: 'Essentiell',
        description: 'Erforderlich für den Betrieb der Plattform. Diese Cookies können nicht deaktiviert werden.',
        required: true,
        cookies: ['Session-ID', 'CSRF-Token', 'Authentifizierung']
    },
    analytics: {
        name: 'Analysen',
        description: 'Helfen uns zu verstehen, wie Sie die Plattform nutzen, um sie zu verbessern.',
        required: false,
        cookies: ['Nutzungsstatistiken', 'Performance-Metriken']
    },
    marketing: {
        name: 'Marketing',
        description: 'Ermöglichen personalisierte Werbung und Newsletter basierend auf Ihren Interessen.',
        required: false,
        cookies: ['Werbe-Tracking', 'Newsletter-Präferenzen']
    },
    third_party: {
        name: 'Drittanbieter',
        description: 'Ermöglichen Integrationen mit externen Diensten wie Zahlungsanbietern.',
        required: false,
        cookies: ['Stripe', 'OpenRouter', 'VAPI']
    },
    ai_training: {
        name: 'KI-Training',
        description: 'Erlauben die Nutzung Ihrer Interaktionen zur Verbesserung unserer KI-Modelle.',
        required: false,
        cookies: ['Gesprächsanalyse', 'Modell-Feedback']
    },
    personalization: {
        name: 'Personalisierung',
        description: 'Ermöglichen personalisierte Erfahrungen und Empfehlungen.',
        required: false,
        cookies: ['Präferenzen', 'Verlauf']
    }
}

/**
 * Cookie Banner Komponente
 * 
 * DSGVO-konformes Cookie-Banner mit:
 * - Granularer Einwilligungsverwaltung
 * - Detaillierten Informationen zu jedem Cookie-Typ
 * - Opt-in für alle nicht-essentiellen Cookies
 * - Speicherung der Einwilligungen im Backend
 */
const CookieBanner = ({ onClose }) => {
    const theme = useTheme()
    const [open, setOpen] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [consents, setConsents] = useState({
        essential: true,
        analytics: false,
        marketing: false,
        third_party: false,
        ai_training: false,
        personalization: false
    })
    const [loading, setLoading] = useState(false)
    const [expandedPanel, setExpandedPanel] = useState(false)

    // Prüfen ob Banner angezeigt werden soll
    useEffect(() => {
        const hasConsent = localStorage.getItem('mate_cookie_consent')
        if (!hasConsent) {
            setOpen(true)
        }
    }, [])

    // Bestehende Einwilligungen laden
    useEffect(() => {
        const loadConsents = async () => {
            try {
                const stored = localStorage.getItem('mate_consents')
                if (stored) {
                    const parsed = JSON.parse(stored)
                    setConsents({ ...consents, ...parsed })
                }
            } catch (error) {
                console.error('Fehler beim Laden der Einwilligungen:', error)
            }
        }
        loadConsents()
    }, [])

    // Einwilligung für einzelnen Typ ändern
    const handleConsentChange = (type) => (event) => {
        if (type === 'essential') return // Essential kann nicht geändert werden
        setConsents({
            ...consents,
            [type]: event.target.checked
        })
    }

    // Alle akzeptieren
    const handleAcceptAll = async () => {
        const allConsents = Object.keys(CONSENT_TYPES).reduce((acc, key) => {
            acc[key] = true
            return acc
        }, {})
        
        await saveConsents(allConsents)
    }

    // Nur essentiell
    const handleRejectAll = async () => {
        const minimalConsents = Object.keys(CONSENT_TYPES).reduce((acc, key) => {
            acc[key] = CONSENT_TYPES[key].required
            return acc
        }, {})
        
        await saveConsents(minimalConsents)
    }

    // Auswahl speichern
    const handleSaveSelection = async () => {
        await saveConsents(consents)
    }

    // Einwilligungen speichern
    const saveConsents = async (consentData) => {
        setLoading(true)
        try {
            // Lokal speichern
            localStorage.setItem('mate_cookie_consent', 'true')
            localStorage.setItem('mate_consents', JSON.stringify(consentData))
            localStorage.setItem('mate_consent_date', new Date().toISOString())

            // An Backend senden (falls authentifiziert)
            try {
                await gdprApi.updateAllConsents(consentData)
            } catch (error) {
                // Nicht authentifiziert - nur lokal speichern
                console.log('Consent lokal gespeichert (nicht authentifiziert)')
            }

            setOpen(false)
            if (onClose) onClose(consentData)

        } catch (error) {
            console.error('Fehler beim Speichern der Einwilligungen:', error)
        } finally {
            setLoading(false)
        }
    }

    // Panel-Accordion
    const handlePanelChange = (panel) => (event, isExpanded) => {
        setExpandedPanel(isExpanded ? panel : false)
    }

    if (!open) return null

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                borderRadius: '16px 16px 0 0',
                maxHeight: '90vh',
                overflow: 'auto'
            }}
        >
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconCookie size={28} color={theme.palette.primary.main} />
                        <Typography variant="h5" fontWeight={600}>
                            Cookie-Einstellungen
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setOpen(false)} size="small">
                        <IconX size={20} />
                    </IconButton>
                </Box>

                {/* Einführungstext */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Wir verwenden Cookies und ähnliche Technologien, um Ihnen die bestmögliche Erfahrung zu bieten.
                    Einige sind für den Betrieb der Plattform erforderlich, andere helfen uns, unsere Dienste zu verbessern.
                    Sie können Ihre Einstellungen jederzeit in den Datenschutz-Einstellungen ändern.
                </Typography>

                {/* Schnellauswahl */}
                {!showDetails && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAcceptAll}
                            disabled={loading}
                            sx={{ flex: 1, minWidth: 150 }}
                        >
                            Alle akzeptieren
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleRejectAll}
                            disabled={loading}
                            sx={{ flex: 1, minWidth: 150 }}
                        >
                            Nur erforderliche
                        </Button>
                        <Button
                            variant="text"
                            onClick={() => setShowDetails(true)}
                            sx={{ flex: 1, minWidth: 150 }}
                        >
                            Einstellungen anpassen
                        </Button>
                    </Box>
                )}

                {/* Detailansicht */}
                {showDetails && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        
                        {Object.entries(CONSENT_TYPES).map(([key, config]) => (
                            <Accordion
                                key={key}
                                expanded={expandedPanel === key}
                                onChange={handlePanelChange(key)}
                                sx={{ mb: 1 }}
                            >
                                <AccordionSummary
                                    expandIcon={<IconChevronDown size={20} />}
                                    sx={{ minHeight: 56 }}
                                >
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        pr: 2
                                    }}>
                                        <Box>
                                            <Typography fontWeight={500}>
                                                {config.name}
                                                {config.required && (
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{ ml: 1, color: 'text.secondary' }}
                                                    >
                                                        (erforderlich)
                                                    </Typography>
                                                )}
                                            </Typography>
                                        </Box>
                                        <Switch
                                            checked={consents[key]}
                                            onChange={handleConsentChange(key)}
                                            disabled={config.required}
                                            onClick={(e) => e.stopPropagation()}
                                            color="primary"
                                        />
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {config.description}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        <strong>Verwendete Cookies:</strong> {config.cookies.join(', ')}
                                    </Typography>
                                </AccordionDetails>
                            </Accordion>
                        ))}

                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSaveSelection}
                                disabled={loading}
                                fullWidth
                            >
                                Auswahl speichern
                            </Button>
                            <Button
                                variant="text"
                                onClick={() => setShowDetails(false)}
                            >
                                Zurück
                            </Button>
                        </Box>
                    </>
                )}

                {/* Footer mit Links */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Typography
                        variant="caption"
                        component="a"
                        href="/datenschutz"
                        sx={{ 
                            color: 'primary.main', 
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' }
                        }}
                    >
                        Datenschutzerklärung
                    </Typography>
                    <Typography variant="caption" color="text.secondary">|</Typography>
                    <Typography
                        variant="caption"
                        component="a"
                        href="/impressum"
                        sx={{ 
                            color: 'primary.main', 
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' }
                        }}
                    >
                        Impressum
                    </Typography>
                </Box>
            </Box>
        </Paper>
    )
}

CookieBanner.propTypes = {
    onClose: PropTypes.func
}

export default CookieBanner
