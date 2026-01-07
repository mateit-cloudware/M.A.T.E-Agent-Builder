/**
 * M.A.T.E. Node Category Configuration
 * 
 * Phase 3.1.3: Centralized Color Scheme for Node Categories
 * 
 * Defines consistent colors, icons, and labels for all node categories
 * Used across: Canvas, Node Palette, Legend, Property Panels
 */

/**
 * Main node category configuration
 * 
 * Category keys: 'trigger' | 'ai' | 'logic' | 'action' | 'data' | 'tool'
 * 
 * Color scheme:
 * - Blue (#3b82f6): Triggers - Entry points for workflows
 * - Purple (#8b5cf6): AI - LLM and AI models
 * - Yellow (#eab308): Logic - Conditional logic and routing
 * - Green (#22c55e): Actions - Output actions (SMS, email, etc.)
 * - Orange (#f97316): Data - Data operations and storage
 * - Gray (#6b7280): Tools - Utilities and helpers
 */
export const NODE_CATEGORIES = {
    trigger: {
        key: 'trigger',
        label: 'Trigger',
        labelDe: 'Auslöser',
        icon: '📞',
        color: '#3b82f6', // Blue 500
        colorDark: '#60a5fa', // Blue 400
        description: 'Workflow entry points',
        descriptionDe: 'Workflow-Startpunkte (Anruf, Webhook, etc.)'
    },
    ai: {
        key: 'ai',
        label: 'AI Model',
        labelDe: 'KI-Modell',
        icon: '🤖',
        color: '#8b5cf6', // Purple 500
        colorDark: '#a78bfa', // Purple 400
        description: 'LLM and AI models',
        descriptionDe: 'KI-Assistenten und LLM-Modelle'
    },
    logic: {
        key: 'logic',
        label: 'Logic',
        labelDe: 'Logik',
        icon: '⚡',
        color: '#eab308', // Yellow 500
        colorDark: '#fbbf24', // Yellow 400
        description: 'Conditional logic and routing',
        descriptionDe: 'Verzweigungen und Bedingungen'
    },
    action: {
        key: 'action',
        label: 'Action',
        labelDe: 'Aktion',
        icon: '🗣️',
        color: '#22c55e', // Green 500
        colorDark: '#4ade80', // Green 400
        description: 'Output actions',
        descriptionDe: 'Ausgabe-Aktionen (SMS, Anruf, E-Mail)'
    },
    data: {
        key: 'data',
        label: 'Data',
        labelDe: 'Daten',
        icon: '📊',
        color: '#f97316', // Orange 500
        colorDark: '#fb923c', // Orange 400
        description: 'Data operations and storage',
        descriptionDe: 'Datenverarbeitung und Speicherung'
    },
    tool: {
        key: 'tool',
        label: 'Tool',
        labelDe: 'Werkzeug',
        icon: '🔧',
        color: '#6b7280', // Gray 500
        colorDark: '#9ca3af', // Gray 400
        description: 'Utilities and helpers',
        descriptionDe: 'Hilfswerkzeuge und Utilities'
    }
}

/**
 * Get category configuration by key
 * @param {string} category - Category key
 * @returns {Object} Category configuration object
 */
export function getCategoryConfig(category) {
    return NODE_CATEGORIES[category]
}

/**
 * Get category color (supports dark mode)
 * @param {string} category - Category key
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @returns {string} Color hex code
 */
export function getCategoryColor(category, isDarkMode = false) {
    const config = NODE_CATEGORIES[category]
    return isDarkMode ? config.colorDark : config.color
}

/**
 * Get category icon
 * @param {string} category - Category key
 * @returns {string} Icon emoji
 */
export function getCategoryIcon(category) {
    return NODE_CATEGORIES[category].icon
}

/**
 * Get category label (supports German)
 * @param {string} category - Category key
 * @param {string} language - Language code ('en' or 'de')
 * @returns {string} Localized label
 */
export function getCategoryLabel(category, language = 'de') {
    const config = NODE_CATEGORIES[category]
    return language === 'de' ? config.labelDe : config.label
}

/**
 * Get all categories as array (for iteration)
 * @returns {Array} Array of category configuration objects
 */
export function getAllCategories() {
    return Object.values(NODE_CATEGORIES)
}

/**
 * Color palette with semantic names for use in components
 */
export const NODE_CATEGORY_COLORS = {
    trigger: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
        contrast: '#ffffff'
    },
    ai: {
        main: '#8b5cf6',
        light: '#a78bfa',
        dark: '#7c3aed',
        contrast: '#ffffff'
    },
    logic: {
        main: '#eab308',
        light: '#fbbf24',
        dark: '#ca8a04',
        contrast: '#000000'
    },
    action: {
        main: '#22c55e',
        light: '#4ade80',
        dark: '#16a34a',
        contrast: '#ffffff'
    },
    data: {
        main: '#f97316',
        light: '#fb923c',
        dark: '#ea580c',
        contrast: '#ffffff'
    },
    tool: {
        main: '#6b7280',
        light: '#9ca3af',
        dark: '#4b5563',
        contrast: '#ffffff'
    }
}

/**
 * CSS-in-JS styles for category badges
 * @param {string} category - Category key
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @returns {Object} Style object
 */
export function getCategoryBadgeStyles(category, isDarkMode = false) {
    const color = getCategoryColor(category, isDarkMode)
    
    return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: `${color}20`, // 20% opacity
        border: `1px solid ${color}`,
        color: color,
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.2
    }
}

/**
 * Get contrasting text color for a category background
 * @param {string} category - Category key
 * @returns {string} Contrast color hex code
 */
export function getCategoryContrastColor(category) {
    return NODE_CATEGORY_COLORS[category].contrast
}

export default NODE_CATEGORIES
