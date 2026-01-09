import React from 'react'
import PropTypes from 'prop-types'
import { Box, Typography, Button, Alert } from '@mui/material'
import { IconRefresh } from '@tabler/icons-react'

/**
 * Route-Level Error Boundary
 * Leichtgewichtige Error Boundary für einzelne Routes
 * Verhindert, dass Fehler in einer Route die gesamte App crashen
 */
class RouteErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null
        }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        if (process.env.NODE_ENV === 'development') {
            console.error('RouteErrorBoundary caught an error:', error, errorInfo)
        }

        this.setState({ error })

        if (this.props.onError) {
            this.props.onError(error, errorInfo)
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleReset)
            }

            // Default minimal fallback UI
            return (
                <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Diese Seite konnte nicht geladen werden
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {this.props.errorMessage || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
                        </Typography>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                                {this.state.error.toString()}
                            </Typography>
                        )}
                    </Alert>

                    <Button variant="contained" startIcon={<IconRefresh />} onClick={this.handleReset}>
                        Erneut versuchen
                    </Button>
                </Box>
            )
        }

        return this.props.children
    }
}

RouteErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.func,
    onError: PropTypes.func,
    errorMessage: PropTypes.string
}

export default RouteErrorBoundary
