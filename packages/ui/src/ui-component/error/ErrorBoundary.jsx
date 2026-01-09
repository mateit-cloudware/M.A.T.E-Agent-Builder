import React from 'react'
import PropTypes from 'prop-types'
import { Box, Typography, Button, Paper, Container } from '@mui/material'
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

/**
 * Root-Level Error Boundary
 * Fängt alle unbehandelten Fehler in der gesamten Anwendung ab
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0
        }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo)
        }

        // Update state with error details
        this.setState((prevState) => ({
            error,
            errorInfo,
            errorCount: prevState.errorCount + 1
        }))

        // Optional: Send error to backend monitoring service
        if (this.props.onError) {
            this.props.onError(error, errorInfo)
        }

        // Optional: Send error report to backend
        this.reportErrorToBackend(error, errorInfo)
    }

    reportErrorToBackend = async (error, errorInfo) => {
        try {
            const errorReport = {
                message: error.toString(),
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            }

            // Only log to console in development
            // In production, this could send to a monitoring service
            if (process.env.NODE_ENV === 'development') {
                console.log('Error Report:', errorReport)
            }

            // TODO: Implement actual error reporting to backend
            // await fetch('/api/v1/errors', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorReport)
            // })
        } catch (reportError) {
            console.error('Failed to report error:', reportError)
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleReset)
            }

            // Default fallback UI
            return (
                <ErrorFallbackUI
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    errorCount={this.state.errorCount}
                    onReset={this.handleReset}
                    level={this.props.level || 'root'}
                />
            )
        }

        return this.props.children
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.func,
    onError: PropTypes.func,
    level: PropTypes.oneOf(['root', 'route', 'component'])
}

/**
 * Default Error Fallback UI
 */
const ErrorFallbackUI = ({ error, errorInfo, errorCount, onReset, level }) => {
    const navigate = useNavigate()

    const handleGoHome = () => {
        onReset()
        navigate('/')
    }

    const handleReload = () => {
        window.location.reload()
    }

    const isRootLevel = level === 'root'
    const showDetails = process.env.NODE_ENV === 'development'

    return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    textAlign: 'center',
                    backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#1a1a1a' : '#fff')
                }}
            >
                <Box sx={{ mb: 3 }}>
                    <IconAlertTriangle size={64} color="#f44336" />
                </Box>

                <Typography variant="h3" gutterBottom>
                    {isRootLevel ? 'Etwas ist schiefgelaufen' : 'Fehler in dieser Komponente'}
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {isRootLevel
                        ? 'Die Anwendung hat einen unerwarteten Fehler festgestellt. Wir entschuldigen uns für die Unannehmlichkeiten.'
                        : 'Diese Komponente konnte nicht geladen werden. Die restliche Anwendung funktioniert weiterhin.'}
                </Typography>

                {errorCount > 1 && (
                    <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                        Dieser Fehler ist bereits {errorCount} Mal aufgetreten.
                    </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
                    <Button variant="contained" color="primary" startIcon={<IconRefresh />} onClick={onReset}>
                        Erneut versuchen
                    </Button>

                    {isRootLevel && (
                        <>
                            <Button variant="outlined" color="primary" startIcon={<IconHome />} onClick={handleGoHome}>
                                Zur Startseite
                            </Button>

                            <Button variant="outlined" onClick={handleReload}>
                                Seite neu laden
                            </Button>
                        </>
                    )}
                </Box>

                {showDetails && error && (
                    <Box sx={{ mt: 4, textAlign: 'left' }}>
                        <Typography variant="h6" gutterBottom color="error">
                            Fehlerdetails (nur im Entwicklungsmodus sichtbar):
                        </Typography>

                        <Paper
                            sx={{
                                p: 2,
                                backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5'),
                                overflow: 'auto',
                                maxHeight: 300
                            }}
                        >
                            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                <strong>Fehlermeldung:</strong>
                                {'\n'}
                                {error.toString()}
                                {'\n\n'}
                                <strong>Stack Trace:</strong>
                                {'\n'}
                                {error.stack}
                                {errorInfo && errorInfo.componentStack && (
                                    <>
                                        {'\n\n'}
                                        <strong>Komponenten-Stack:</strong>
                                        {'\n'}
                                        {errorInfo.componentStack}
                                    </>
                                )}
                            </Typography>
                        </Paper>
                    </Box>
                )}

                {!showDetails && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        Fehler-ID: {new Date().getTime()}
                    </Typography>
                )}
            </Paper>
        </Container>
    )
}

ErrorFallbackUI.propTypes = {
    error: PropTypes.object,
    errorInfo: PropTypes.object,
    errorCount: PropTypes.number,
    onReset: PropTypes.func.isRequired,
    level: PropTypes.string
}

export default ErrorBoundary
