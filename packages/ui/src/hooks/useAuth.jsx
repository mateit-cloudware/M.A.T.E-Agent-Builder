import { useSelector } from 'react-redux'
import { useConfig } from '@/store/context/ConfigContext'

export const useAuth = () => {
    const { isOpenSource, isEnterpriseLicensed } = useConfig()
    const permissions = useSelector((state) => state.auth.permissions)
    const features = useSelector((state) => state.auth.features)
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const currentUser = useSelector((state) => state.auth.user)

    // M.A.T.E.: Check if user is effectively an admin
    // Multiple fallback checks for robustness:
    // 1. isGlobal flag from Redux (set from isOrganizationAdmin on login)
    // 2. isOrganizationAdmin property on user object (direct check)
    // 3. User has 'owner' role in any assigned workspace (case-insensitive)
    // 4. User role name is 'owner' (case-insensitive backup)
    const isEffectiveAdmin = () => {
        // Check 1: Redux isGlobal flag
        if (isGlobal === true || isGlobal === 'true') return true
        
        // Check 2: User property isOrganizationAdmin
        if (currentUser?.isOrganizationAdmin === true || currentUser?.isOrganizationAdmin === 'true') return true
        
        // Check 3: User has owner role in assignedWorkspaces (case-insensitive)
        if (currentUser?.assignedWorkspaces && Array.isArray(currentUser.assignedWorkspaces)) {
            const hasOwnerRole = currentUser.assignedWorkspaces.some(ws => {
                if (!ws?.role) return false
                return ws.role.toLowerCase() === 'owner'
            })
            if (hasOwnerRole) return true
        }
        
        // Check 4: User's current role is owner (case-insensitive)
        if (currentUser?.role && typeof currentUser.role === 'string') {
            if (currentUser.role.toLowerCase() === 'owner') return true
        }
        
        return false
    }

    const hasPermission = (permissionId) => {
        // M.A.T.E.: Effective admins bypass all permission checks
        if (isOpenSource || isEffectiveAdmin()) {
            return true
        }
        if (!permissionId) return false
        const permissionIds = permissionId.split(',')
        if (permissions && permissions.length) {
            return permissionIds.some((permissionId) => permissions.includes(permissionId))
        }
        return false
    }

    const hasAssignedWorkspace = (workspaceId) => {
        if (isOpenSource || isEffectiveAdmin()) {
            return true
        }
        const activeWorkspaceId = currentUser?.activeWorkspaceId || ''
        if (workspaceId === activeWorkspaceId) {
            return true
        }
        return false
    }

    const hasDisplay = (display) => {
        if (!display) {
            return true
        }

        // M.A.T.E.: Effective admins (Organization Owners) should see all features
        // This uses the robust isEffectiveAdmin check for consistency
        if (isEffectiveAdmin()) {
            return true
        }

        // if it has display flag, but user has no features, then it should not be displayed
        if (!features || Array.isArray(features) || Object.keys(features).length === 0) {
            return false
        }

        // check if the display flag is in the features
        if (Object.hasOwnProperty.call(features, display)) {
            const flag = features[display] === 'true' || features[display] === true
            return flag
        }

        return false
    }

    return { hasPermission, hasAssignedWorkspace, hasDisplay }
}
