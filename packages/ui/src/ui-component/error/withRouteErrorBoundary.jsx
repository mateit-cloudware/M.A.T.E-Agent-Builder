import React from 'react'
import PropTypes from 'prop-types'
import { RouteErrorBoundary } from '@/ui-component/error'

/**
 * Higher-Order Component für Route-Error-Boundaries
 * Wraps jede Route in eine Error Boundary um Fehler zu isolieren
 */
export const withRouteErrorBoundary = (Component, errorMessage) => {
    const WrappedComponent = (props) => (
        <RouteErrorBoundary errorMessage={errorMessage}>
            <Component {...props} />
        </RouteErrorBoundary>
    )

    WrappedComponent.displayName = `withRouteErrorBoundary(${Component.displayName || Component.name || 'Component'})`
    
    return WrappedComponent
}

withRouteErrorBoundary.propTypes = {
    Component: PropTypes.elementType.isRequired,
    errorMessage: PropTypes.string
}
