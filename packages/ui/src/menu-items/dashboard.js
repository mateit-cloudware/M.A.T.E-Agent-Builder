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
    IconPhone,
    IconShield,
    IconChartBar,
    IconSparkles,
    IconMessage,
    IconPhoneCall,
    IconTemplate,
    IconLayoutGrid,
    IconAdjustments,
    IconMessageChatbot,
    IconHeadset,
    IconUsersPlus,
    IconPlaylistAdd,
    IconHistory,
    IconChartDots,
    IconUser,
    IconCreditCard,
    IconLockSquare,
    IconUserCog,
    IconBriefcase
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
    IconPhone,
    IconShield,
    IconChartBar,
    // Neue Icons für vereinfachte Navigation
    IconSparkles,
    IconMessage,
    IconPhoneCall,
    IconTemplate,
    IconLayoutGrid,
    IconAdjustments,
    IconMessageChatbot,
    IconHeadset,
    IconUsersPlus,
    IconPlaylistAdd,
    IconHistory,
    IconChartDots,
    IconUser,
    IconCreditCard,
    IconLockSquare,
    IconUserCog,
    IconBriefcase
}

// ==============================|| DASHBOARD MENU ITEMS ||============================== //
// Vereinfachte, benutzerfreundliche Menüstruktur gemäß Design-Dokument
// Ziel: Intuitive Navigation für Nutzer ohne technische Vorkenntnisse

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        // ==============================|| AGENTEN ERSTELLEN ||============================== //
        // Schnellstart für neue Agenten - prominentester Menüpunkt
        {
            id: 'create-agent',
            title: 'Agent erstellen',
            type: 'collapse',
            icon: icons.IconSparkles,
            children: [
                {
                    id: 'wizard',
                    title: 'Geführte Erstellung',
                    type: 'item',
                    url: '/wizard',
                    icon: icons.IconWand,
                    breadcrumbs: true,
                    caption: 'Schritt für Schritt zum ersten Agent'
                },
                {
                    id: 'from-template',
                    title: 'Mit Vorlage starten',
                    type: 'item',
                    url: '/marketplaces',
                    icon: icons.IconTemplate,
                    breadcrumbs: true,
                    caption: 'Fertige Lösungen anpassen',
                    permission: 'templates:marketplace,templates:custom'
                },
                {
                    id: 'canvas-create',
                    title: 'Selbst aufbauen',
                    type: 'item',
                    url: '/canvas',
                    icon: icons.IconLayoutGrid,
                    breadcrumbs: true,
                    caption: 'Freier Editor für Experten'
                }
            ]
        },
        // ==============================|| MEINE AGENTEN ||============================== //
        // Übersicht aller erstellten Agenten mit Filterung nach Typ
        {
            id: 'my-agents',
            title: 'Meine Agenten',
            type: 'collapse',
            icon: icons.IconRobot,
            children: [
                {
                    id: 'chatflows',
                    title: 'Chat-Agenten',
                    type: 'item',
                    url: '/chatflows',
                    icon: icons.IconMessageChatbot,
                    breadcrumbs: true,
                    caption: 'Agenten für Text-Konversationen',
                    permission: 'chatflows:view'
                },
                {
                    id: 'voice-agents',
                    title: 'Voice-Agenten',
                    type: 'item',
                    url: '/assistants',
                    icon: icons.IconHeadset,
                    breadcrumbs: true,
                    caption: 'Agenten für Telefon-Anrufe',
                    permission: 'assistants:view'
                },
                {
                    id: 'agentflows',
                    title: 'Team-Agenten',
                    type: 'item',
                    url: '/agentflows',
                    icon: icons.IconUsersPlus,
                    breadcrumbs: true,
                    caption: 'Mehrere Agenten zusammenarbeiten lassen',
                    permission: 'agentflows:view'
                }
            ]
        },
        // ==============================|| VORLAGEN ||============================== //
        // Direkter Zugang zu vorgefertigten Lösungen
        {
            id: 'templates',
            title: 'Vorlagen',
            type: 'item',
            url: '/marketplaces',
            icon: icons.IconBuildingStore,
            breadcrumbs: true,
            caption: 'Fertige Agenten-Vorlagen entdecken',
            permission: 'templates:marketplace,templates:custom'
        },
        // ==============================|| ANRUFE ||============================== //
        // Voice-Agent-Anrufe und Transkripte
        {
            id: 'calls',
            title: 'Anrufe',
            type: 'collapse',
            icon: icons.IconPhoneCall,
            children: [
                {
                    id: 'transcriptions',
                    title: 'Gesprächsverlauf',
                    type: 'item',
                    url: '/transcriptions',
                    icon: icons.IconHistory,
                    breadcrumbs: true,
                    caption: 'Alle Anrufe und Transkripte ansehen'
                },
                {
                    id: 'call-analytics',
                    title: 'Statistik',
                    type: 'item',
                    url: '/executions',
                    icon: icons.IconChartDots,
                    breadcrumbs: true,
                    caption: 'Auswertungen und Übersichten',
                    permission: 'executions:view'
                }
            ]
        },
        // ==============================|| ERWEITERT ||============================== //
        // Technische Funktionen für fortgeschrittene Nutzer (zusammengefasst)
        {
            id: 'advanced',
            title: 'Erweitert',
            type: 'collapse',
            icon: icons.IconAdjustments,
            children: [
                // Ressourcen
                {
                    id: 'tools',
                    title: 'Werkzeuge',
                    type: 'item',
                    url: '/tools',
                    icon: icons.IconTool,
                    breadcrumbs: true,
                    caption: 'Aktionen und Integrationen verwalten',
                    permission: 'tools:view'
                },
                {
                    id: 'credentials',
                    title: 'Zugangsdaten',
                    type: 'item',
                    url: '/credentials',
                    icon: icons.IconLock,
                    breadcrumbs: true,
                    caption: 'API-Schlüssel und Verbindungen',
                    permission: 'credentials:view'
                },
                {
                    id: 'document-stores',
                    title: 'Wissensquellen',
                    type: 'item',
                    url: '/document-stores',
                    icon: icons.IconFiles,
                    breadcrumbs: true,
                    caption: 'Dokumente für Agenten bereitstellen',
                    permission: 'documentStores:view'
                },
                {
                    id: 'variables',
                    title: 'Variablen',
                    type: 'item',
                    url: '/variables',
                    icon: icons.IconVariable,
                    breadcrumbs: true,
                    caption: 'Wiederverwendbare Werte speichern',
                    permission: 'variables:view'
                },
                {
                    id: 'apikey',
                    title: 'API-Zugang',
                    type: 'item',
                    url: '/apikey',
                    icon: icons.IconKey,
                    breadcrumbs: true,
                    caption: 'Schlüssel für externe Zugriffe',
                    permission: 'apikeys:view'
                },
                // Qualitätssicherung
                {
                    id: 'datasets',
                    title: 'Testdaten',
                    type: 'item',
                    url: '/datasets',
                    icon: icons.IconDatabase,
                    breadcrumbs: true,
                    caption: 'Daten für Agent-Tests',
                    display: 'feat:datasets',
                    permission: 'datasets:view'
                },
                {
                    id: 'evaluators',
                    title: 'Qualitätsprüfung',
                    type: 'item',
                    url: '/evaluators',
                    icon: icons.IconTestPipe,
                    breadcrumbs: true,
                    caption: 'Agenten-Antworten bewerten',
                    display: 'feat:evaluators',
                    permission: 'evaluators:view'
                },
                {
                    id: 'evaluations-view',
                    title: 'Auswertungen',
                    type: 'item',
                    url: '/evaluations',
                    icon: icons.IconChartHistogram,
                    breadcrumbs: true,
                    caption: 'Ergebnisse der Qualitätsprüfung',
                    display: 'feat:evaluations',
                    permission: 'evaluations:view'
                }
            ]
        },
        // ==============================|| EINSTELLUNGEN ||============================== //
        // Konto, Guthaben und Admin-Funktionen
        {
            id: 'settings',
            title: 'Einstellungen',
            type: 'collapse',
            icon: icons.IconSettings,
            children: [
                {
                    id: 'account',
                    title: 'Mein Konto',
                    type: 'item',
                    url: '/account',
                    icon: icons.IconUser,
                    breadcrumbs: true,
                    caption: 'Profil und Benachrichtigungen'
                },
                {
                    id: 'wallet',
                    title: 'Guthaben',
                    type: 'item',
                    url: '/wallet',
                    icon: icons.IconCreditCard,
                    breadcrumbs: true,
                    caption: 'Kontostand und Abrechnung'
                },
                {
                    id: 'privacy',
                    title: 'Datenschutz',
                    type: 'item',
                    url: '/privacy',
                    icon: icons.IconLockSquare,
                    breadcrumbs: true,
                    caption: 'Privatsphäre-Einstellungen'
                },
                // Administration (nur für Admins sichtbar)
                {
                    id: 'admin-section',
                    title: 'Administration',
                    type: 'collapse',
                    icon: icons.IconUserCog,
                    permission: 'users:manage',
                    children: [
                        {
                            id: 'admin-dashboard',
                            title: 'Übersicht',
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
                            icon: icons.IconBriefcase,
                            breadcrumbs: true,
                            permission: 'workspace:view'
                        },
                        {
                            id: 'sso',
                            title: 'Single Sign-On',
                            type: 'item',
                            url: '/sso-config',
                            icon: icons.IconShieldLock,
                            breadcrumbs: true,
                            permission: 'sso:manage'
                        },
                        {
                            id: 'login-activity',
                            title: 'Anmeldungen',
                            type: 'item',
                            url: '/login-activity',
                            icon: icons.IconClipboardList,
                            breadcrumbs: true,
                            permission: 'loginActivity:view'
                        },
                        {
                            id: 'guardrails',
                            title: 'Sicherheitsregeln',
                            type: 'item',
                            url: '/admin/guardrails',
                            icon: icons.IconShield,
                            breadcrumbs: true,
                            permission: 'users:manage'
                        },
                        {
                            id: 'guardrails-analytics',
                            title: 'Sicherheits-Statistik',
                            type: 'item',
                            url: '/admin/guardrails/analytics',
                            icon: icons.IconChartBar,
                            breadcrumbs: true,
                            permission: 'users:manage'
                        },
                        {
                            id: 'audit-logs',
                            title: 'Aktivitätsprotokoll',
                            type: 'item',
                            url: '/admin/audit-logs',
                            icon: icons.IconFileDatabase,
                            breadcrumbs: true,
                            permission: 'users:manage'
                        },
                        {
                            id: 'logs',
                            title: 'System-Protokolle',
                            type: 'item',
                            url: '/logs',
                            icon: icons.IconList,
                            breadcrumbs: true,
                            permission: 'logs:view'
                        }
                    ]
                }
            ]
        }
    ]
}

export default dashboard
