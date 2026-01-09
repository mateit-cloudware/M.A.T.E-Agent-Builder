import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Divider, List, Typography } from '@mui/material'

// project imports
import NavItem from '../NavItem'
import NavCollapse from '../NavCollapse'
import { useAuth } from '@/hooks/useAuth'
import { Available } from '@/ui-component/rbac/available'

// ==============================|| SIDEBAR MENU LIST GROUP ||============================== //
// Vereinfachte Version für die neue benutzerfreundliche Menüstruktur

const NavGroup = ({ item }) => {
    const theme = useTheme()
    const { hasPermission, hasDisplay } = useAuth()

    const listItems = (menu, level = 1) => {
        // Filter based on display and permission
        if (!shouldDisplayMenu(menu)) return null

        // Handle item, collapse and group types
        switch (menu.type) {
            case 'collapse':
                return <NavCollapse key={menu.id} menu={menu} level={level} />
            case 'item':
                return <NavItem key={menu.id} item={menu} level={level} navType='MENU' />
            case 'group':
                // Rekursiv Gruppen-Kinder rendern
                return menu.children?.map((child) => listItems(child, level))
            default:
                return (
                    <Typography key={menu.id} variant='h6' color='error' align='center'>
                        Menu Items Error
                    </Typography>
                )
        }
    }

    const shouldDisplayMenu = (menu) => {
        // Handle permission check
        if (menu.permission && !hasPermission(menu.permission)) {
            return false // Do not render if permission is lacking
        }

        // If `display` is defined, check against cloud/enterprise conditions
        if (menu.display) {
            const shouldDisplay = hasDisplay(menu.display)
            return shouldDisplay
        }

        // If `display` is not defined, display by default
        return true
    }

    // Neue vereinfachte Render-Logik:
    // Direkt alle children rendern (collapse, item, oder nested groups)
    const renderMenuItems = () => {
        if (!item.children) return null
        
        // Prüfen ob alte Struktur mit 'primary' Gruppe vorhanden ist (Rückwärtskompatibilität)
        const hasPrimaryGroup = item.children.some((child) => child.id === 'primary' && child.type === 'group')
        
        if (hasPrimaryGroup) {
            // Alte Struktur: primary + andere Gruppen
            return renderLegacyStructure()
        } else {
            // Neue vereinfachte Struktur: direkte children
            return renderSimplifiedStructure()
        }
    }
    
    // Neue vereinfachte Struktur: Alle children direkt rendern
    const renderSimplifiedStructure = () => {
        const filteredItems = item.children.filter((menu) => shouldDisplayMenu(menu))
        return filteredItems.map((menu) => listItems(menu))
    }
    
    // Alte Struktur für Rückwärtskompatibilität
    const renderLegacyStructure = () => {
        const primaryGroup = item.children.find((child) => child.id === 'primary')
        const primaryItems = primaryGroup?.children || []
        
        let nonPrimaryGroups = item.children.filter((child) => child.id !== 'primary')
        // Display children based on permission and display
        nonPrimaryGroups = nonPrimaryGroups.map((group) => {
            const children = group.children?.filter((menu) => shouldDisplayMenu(menu)) || []
            return { ...group, children }
        })
        // Get rid of group with empty children
        nonPrimaryGroups = nonPrimaryGroups.filter((group) => group.children.length > 0)
        
        return (
            <>
                {primaryItems.map((menu) => listItems(menu))}
                {nonPrimaryGroups.map((group) => {
                    const groupPermissions = group.children
                        .map((menu) => menu.permission)
                        .filter((perm) => perm && typeof perm === 'string')
                        .join(',')
                    
                    const permissionToCheck = groupPermissions || undefined
                    
                    return (
                        <Available key={group.id} permission={permissionToCheck}>
                            <>
                                <Divider sx={{ height: '1px', borderColor: theme.palette.grey[900] + 25, my: 0 }} />
                                <List
                                    subheader={
                                        <Typography variant='caption' sx={{ ...theme.typography.subMenuCaption }} display='block' gutterBottom>
                                            {group.title}
                                        </Typography>
                                    }
                                    sx={{ p: '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
                                >
                                    {group.children.map((menu) => listItems(menu))}
                                </List>
                            </>
                        </Available>
                    )
                })}
            </>
        )
    }

    return (
        <List
            subheader={
                item.title && (
                    <Typography variant='caption' sx={{ ...theme.typography.menuCaption }} display='block' gutterBottom>
                        {item.title}
                        {item.caption && (
                            <Typography variant='caption' sx={{ ...theme.typography.subMenuCaption }} display='block' gutterBottom>
                                {item.caption}
                            </Typography>
                        )}
                    </Typography>
                )
            }
            sx={{ p: '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}
        >
            {renderMenuItems()}
        </List>
    )
}

NavGroup.propTypes = {
    item: PropTypes.object
}

export default NavGroup
