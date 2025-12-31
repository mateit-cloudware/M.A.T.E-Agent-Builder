// assets
import {
    IconList,
    IconUsersGroup,
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconChartHistogram,
    IconUserEdit,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock,
    IconListCheck,
    IconWallet,
    IconDashboard,
    IconWand,
    IconPhone
} from '@tabler/icons-react'

// constant
const icons = {
    IconHierarchy,
    IconUsersGroup,
    IconBuildingStore,
    IconList,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconUserEdit,
    IconChartHistogram,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock,
    IconListCheck,
    IconWallet,
    IconDashboard,
    IconWand,
    IconPhone
}

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        // ==============================|| AGENTEN ||============================== //
        {
            id: 'agents',
            title: 'Agenten',
            type: 'group',
            children: [
                {
                    id: 'wizard',
                    title: 'Agent erstellen',
                    type: 'item',
                    url: '/wizard',
                    icon: icons.IconWand,
                    breadcrumbs: true,
                    chip: {
                        label: 'NEU',
                        color: 'primary',
                        size: 'small'
                    }
                },
                {
                    id: 'chatflows',
                    title: 'Chat-Agenten',
                    type: 'item',
                    url: '/chatflows',
                    icon: icons.IconHierarchy,
                    breadcrumbs: true,
                    permission: 'chatflows:view'
                },
                {
                    id: 'agentflows',
                    title: 'Multi-Agenten',
                    type: 'item',
                    url: '/agentflows',
                    icon: icons.IconUsersGroup,
                    breadcrumbs: true,
                    permission: 'agentflows:view'
                },
                {
                    id: 'assistants',
                    title: 'Assistenten',
                    type: 'item',
                    url: '/assistants',
                    icon: icons.IconRobot,
                    breadcrumbs: true,
                    permission: 'assistants:view'
                },
                {
                    id: 'marketplaces',
                    title: 'Vorlagen',
                    type: 'item',
                    url: '/marketplaces',
                    icon: icons.IconBuildingStore,
                    breadcrumbs: true,
                    permission: 'templates:marketplace,templates:custom'
                }
            ]
        },
        // ==============================|| VOICE ||============================== //
        {
            id: 'voice',
            title: 'Voice',
            type: 'group',
            children: [
                {
                    id: 'transcriptions',
                    title: 'Anrufe & Transkripte',
                    type: 'item',
                    url: '/transcriptions',
                    icon: icons.IconPhone,
                    breadcrumbs: true
                },
                {
                    id: 'executions',
                    title: 'Ausführungen',
                    type: 'item',
                    url: '/executions',
                    icon: icons.IconListCheck,
                    breadcrumbs: true,
                    permission: 'executions:view'
                }
            ]
        },
        // ==============================|| RESSOURCEN ||============================== //
        {
            id: 'resources',
            title: 'Ressourcen',
            type: 'group',
            children: [
                {
                    id: 'tools',
                    title: 'Werkzeuge',
                    type: 'item',
                    url: '/tools',
                    icon: icons.IconTool,
                    breadcrumbs: true,
                    permission: 'tools:view'
                },
                {
                    id: 'credentials',
                    title: 'Zugangsdaten',
                    type: 'item',
                    url: '/credentials',
                    icon: icons.IconLock,
                    breadcrumbs: true,
                    permission: 'credentials:view'
                },
                {
                    id: 'variables',
                    title: 'Variablen',
                    type: 'item',
                    url: '/variables',
                    icon: icons.IconVariable,
                    breadcrumbs: true,
                    permission: 'variables:view'
                },
                {
                    id: 'apikey',
                    title: 'API-Schlüssel',
                    type: 'item',
                    url: '/apikey',
                    icon: icons.IconKey,
                    breadcrumbs: true,
                    permission: 'apikeys:view'
                },
                {
                    id: 'document-stores',
                    title: 'Dokumentenspeicher',
                    type: 'item',
                    url: '/document-stores',
                    icon: icons.IconFiles,
                    breadcrumbs: true,
                    permission: 'documentStores:view'
                }
            ]
        },
        // ==============================|| QUALITÄTSSICHERUNG ||============================== //
        {
            id: 'evaluations',
            title: 'Qualitätssicherung',
            type: 'group',
            children: [
                {
                    id: 'datasets',
                    title: 'Datensätze',
                    type: 'item',
                    url: '/datasets',
                    icon: icons.IconDatabase,
                    breadcrumbs: true,
                    display: 'feat:datasets',
                    permission: 'datasets:view'
                },
                {
                    id: 'evaluators',
                    title: 'Evaluatoren',
                    type: 'item',
                    url: '/evaluators',
                    icon: icons.IconTestPipe,
                    breadcrumbs: true,
                    display: 'feat:evaluators',
                    permission: 'evaluators:view'
                },
                {
                    id: 'evaluations',
                    title: 'Auswertungen',
                    type: 'item',
                    url: '/evaluations',
                    icon: icons.IconChartHistogram,
                    breadcrumbs: true,
                    display: 'feat:evaluations',
                    permission: 'evaluations:view'
                }
            ]
        },
        // ==============================|| ADMINISTRATION ||============================== //
        {
            id: 'management',
            title: 'Administration',
            type: 'group',
            children: [
                {
                    id: 'admin-dashboard',
                    title: 'Admin-Übersicht',
                    type: 'item',
                    url: '/admin',
                    icon: icons.IconDashboard,
                    breadcrumbs: true,
                    permission: 'users:manage'
                },
                {
                    id: 'users',
                    title: 'Benutzer',
                    type: 'item',
                    url: '/users',
                    icon: icons.IconUsers,
                    breadcrumbs: true,
                    permission: 'users:manage'
                },
                {
                    id: 'roles',
                    title: 'Rollen',
                    type: 'item',
                    url: '/roles',
                    icon: icons.IconLockCheck,
                    breadcrumbs: true,
                    permission: 'roles:manage'
                },
                {
                    id: 'workspaces',
                    title: 'Arbeitsbereiche',
                    type: 'item',
                    url: '/workspaces',
                    icon: icons.IconStack2,
                    breadcrumbs: true,
                    permission: 'workspace:view'
                },
                {
                    id: 'sso',
                    title: 'SSO-Konfiguration',
                    type: 'item',
                    url: '/sso-config',
                    icon: icons.IconShieldLock,
                    breadcrumbs: true,
                    permission: 'sso:manage'
                },
                {
                    id: 'login-activity',
                    title: 'Anmeldeaktivität',
                    type: 'item',
                    url: '/login-activity',
                    icon: icons.IconClipboardList,
                    breadcrumbs: true,
                    permission: 'loginActivity:view'
                },
                {
                    id: 'logs',
                    title: 'System-Logs',
                    type: 'item',
                    url: '/logs',
                    icon: icons.IconList,
                    breadcrumbs: true,
                    permission: 'logs:view'
                }
            ]
        },
        // ==============================|| EINSTELLUNGEN ||============================== //
        {
            id: 'settings',
            title: 'Einstellungen',
            type: 'group',
            children: [
                {
                    id: 'wallet',
                    title: 'Guthaben & Abrechnung',
                    type: 'item',
                    url: '/wallet',
                    icon: icons.IconWallet,
                    breadcrumbs: true
                },
                {
                    id: 'account',
                    title: 'Konto-Einstellungen',
                    type: 'item',
                    url: '/account',
                    icon: icons.IconSettings,
                    breadcrumbs: true
                }
            ]
        }
    ]
}

export default dashboard
