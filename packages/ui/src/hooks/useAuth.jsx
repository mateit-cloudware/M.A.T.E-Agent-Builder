import { useSelector } from 'react-redux'
import { useConfig } from '@/store/context/ConfigContext'

export const useAuth = () => {
    const { isOpenSource, isEnterpriseLicensed } = useConfig()
    const permissions = useSelector((state) => state.auth.permissions)
    const features = useSelector((state) => state.auth.features)
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const currentUser = useSelector((state) => state.auth.user)

    // M.A.T.E.: Check if user is effectively an admin
    // This includes:
    // 1. isGlobal flag (set from isOrganizationAdmin)
    // 2. User has 'owner' role in their assigned workspaces (backup check)
    // 3. User has isOrganizationAdmin property set to true
    const isEffectiveAdmin = () => {
        if (isGlobal) return true
        if (currentUser?.isOrganizationAdmin) return true
        // Check if user has owner role in any workspace
        if (currentUser?.assignedWorkspaces) {
            return currentUser.assignedWorkspaces.some(ws => ws.role === 'owner')
        }
        return false
    }

    const hasPermission = (permissionId) => {
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
