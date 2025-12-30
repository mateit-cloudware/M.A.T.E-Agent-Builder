import PropTypes from 'prop-types'
import { useAuth } from '@/hooks/useAuth'

export const Available = ({ permission, children }) => {
    const { hasPermission } = useAuth()
    
    // M.A.T.E.: If no permission is specified, always render children
    // This handles menu items without permission requirements
    if (!permission || permission === '') {
        return children
    }
    
    if (hasPermission(permission)) {
        return children
    }
    
    return null
}

Available.propTypes = {
    permission: PropTypes.string,
    children: PropTypes.element
}
