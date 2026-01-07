/**
 * M.A.T.E. Node Icon Component System
 * 
 * Phase 3.1.2: Icon-System für Node-Kategorien
 * Phase 3.1.3: Integrated with centralized color scheme
 * 
 * Renders category-specific icons for workflow nodes
 * Supports emoji and future SVG integration
 */

import React from 'react'
import { Box, useTheme } from '@mui/material'
import { 
    NODE_CATEGORIES, 
    getCategoryColor, 
    getCategoryIcon, 
    getCategoryLabel,
    getCategoryBadgeStyles,
    getAllCategories
} from '@/themes/nodeCategories'

// Icon imports for future SVG support
// import PhoneIcon from '@mui/icons-material/Phone'
// import SmartToyIcon from '@mui/icons-material/SmartToy'
// import BoltIcon from '@mui/icons-material/Bolt'
// import CampaignIcon from '@mui/icons-material/Campaign'
// import DataObjectIcon from '@mui/icons-material/DataObject'
// import BuildIcon from '@mui/icons-material/Build'

/**
 * Size to pixel mapping
 */
const SIZE_MAP = {
    small: 16,
    medium: 24,
    large: 32
}

/**
 * NodeIcon Component
 * 
 * Renders an icon for a workflow node based on category or custom icon
 * 
 * @param {Object} props
 * @param {string} props.category - Category key (trigger, ai, logic, action, data, tool)
 * @param {string} props.icon - Custom icon emoji
 * @param {string} props.size - Icon size (small, medium, large)
 * @param {string} props.color - Custom color
 * @param {Object} props.style - Additional styles
 * 
 * @example
 * <NodeIcon category="ai" size="medium" />
 * <NodeIcon icon="🤖" size="large" />
 */
export const NodeIcon = ({ 
    category, 
    icon, 
    size = 'medium',
    color,
    style 
}) => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'
    
    // Determine which icon to display
    const displayIcon = icon || (category ? getCategoryIcon(category) : '❓')
    const iconSize = SIZE_MAP[size]
    
    // Use category color if provided and no custom color
    const iconColor = color || (category ? getCategoryColor(category, isDarkMode) : 'inherit')
    
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${iconSize}px`,
                width: `${iconSize}px`,
                height: `${iconSize}px`,
                lineHeight: 1,
                color: iconColor,
                ...style
            }}
            aria-label={`${category || 'node'} icon`}
        >
            {displayIcon}
        </Box>
    )
}

/**
 * NodeCategoryBadge
 * 
 * Displays a category badge with icon and label
 * 
 * @param {Object} props
 * @param {string} props.category - Category key
 * @param {string} props.label - Custom label (overrides default)
 * @param {boolean} props.showLabel - Whether to show label text
 * @param {string} props.language - Label language ('en' or 'de')
 */
export const NodeCategoryBadge = ({ 
    category, 
    label,
    showLabel = true,
    language = 'de'
}) => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'
    
    const displayLabel = label || getCategoryLabel(category, language)
    const badgeStyles = getCategoryBadgeStyles(category, isDarkMode)
    
    return (
        <Box sx={badgeStyles}>
            <NodeIcon category={category} size="small" />
            {showLabel && (
                <span>
                    {displayLabel}
                </span>
            )}
        </Box>
    )
}

/**
 * NodeIconLegend
 * 
 * Displays a legend of all category icons
 * 
 * @param {Object} props
 * @param {string} props.language - Label language ('en' or 'de')
 */
export const NodeIconLegend = ({ language = 'de' }) => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'
    const categories = getAllCategories()
    
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                p: 2,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
            }}
        >
            <Box sx={{ fontWeight: 600, mb: 1 }}>
                {language === 'de' ? 'Node-Kategorien' : 'Node Categories'}
            </Box>
            {categories.map(cat => {
                const color = getCategoryColor(cat.key, isDarkMode)
                const label = getCategoryLabel(cat.key, language)
                
                return (
                    <Box
                        key={cat.key}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <NodeIcon category={cat.key} size="small" />
                        <span style={{ color: color, fontSize: '0.875rem' }}>
                            {label}
                        </span>
                    </Box>
                )
            })}
        </Box>
    )
}

/**
 * Hook to get node icon and color
 * 
 * @param {string} category - Category key
 * @returns {Object} Object with icon, color, and config
 */
export function useNodeIcon(category) {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'
    
    return {
        icon: category ? getCategoryIcon(category) : '❓',
        color: category ? getCategoryColor(category, isDarkMode) : '#6b7280',
        config: category ? NODE_CATEGORIES[category] : null
    }
}

export default NodeIcon
