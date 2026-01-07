/**
 * M.A.T.E. Workflow Auto-Complete Panel
 * 
 * Phase 3.2.2: UI für Auto-Complete Vorschläge
 * 
 * Zeigt intelligente Vorschläge für nächste Workflow-Schritte
 */

import React, { useState, useEffect } from 'react'
import { 
    Box, 
    Paper, 
    Typography, 
    List, 
    ListItem, 
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Chip,
    Collapse,
    Divider,
    IconButton
} from '@mui/material'
import { 
    IconChevronDown, 
    IconChevronUp, 
    IconSparkles,
    IconPlus,
    IconInfoCircle
} from '@tabler/icons'
import { getAutoCompleteSuggestions, formatSuggestionsText } from '@/utils/workflowAutoComplete'
import { getCategoryColor } from '@/themes/nodeCategories'

/**
 * AutoCompletePanel Component
 * 
 * Panel that shows next-node suggestions when a node is selected
 * 
 * @param {Object} props
 * @param {Object} props.selectedNode - Currently selected node
 * @param {Array} props.nodes - All nodes in workflow
 * @param {Array} props.edges - All edges in workflow
 * @param {Array} props.availableNodes - Available node types
 * @param {Function} props.onSuggestionClick - Callback when suggestion is clicked
 * @param {boolean} props.show - Whether to show panel
 */
export const AutoCompletePanel = ({ 
    selectedNode, 
    nodes, 
    edges, 
    availableNodes,
    onSuggestionClick,
    show = true 
}) => {
    const [suggestions, setSuggestions] = useState([])
    const [expanded, setExpanded] = useState(true)
    
    useEffect(() => {
        if (!selectedNode) {
            setSuggestions([])
            return
        }
        
        const autoCompleteSuggestions = getAutoCompleteSuggestions(
            selectedNode,
            nodes,
            edges,
            availableNodes
        )
        
        setSuggestions(autoCompleteSuggestions)
        
        // Auto-expand when suggestions change
        if (autoCompleteSuggestions.length > 0) {
            setExpanded(true)
        }
    }, [selectedNode, nodes, edges, availableNodes])
    
    if (!show || !selectedNode || suggestions.length === 0) {
        return null
    }
    
    // Group suggestions by type
    const commonSuggestions = suggestions.filter(s => s.priority <= 3)
    const advancedSuggestions = suggestions.filter(s => s.priority > 3)
    
    return (
        <Paper
            elevation={3}
            sx={{
                position: 'absolute',
                right: 20,
                top: 100,
                width: 320,
                maxHeight: '70vh',
                overflow: 'auto',
                zIndex: 1000,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconSparkles size={20} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Nächste Schritte
                    </Typography>
                </Box>
                
                <IconButton 
                    size="small" 
                    onClick={() => setExpanded(!expanded)}
                    sx={{ color: 'white' }}
                >
                    {expanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                </IconButton>
            </Box>
            
            <Collapse in={expanded}>
                <Box sx={{ p: 2 }}>
                    {/* Current Node Info */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Ausgewählter Node:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {selectedNode.data?.label || selectedNode.id}
                        </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Common Suggestions */}
                    {commonSuggestions.length > 0 && (
                        <>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                Empfohlene Nodes
                            </Typography>
                            
                            <List dense sx={{ py: 0 }}>
                                {commonSuggestions.map((suggestion, index) => (
                                    <SuggestionItem
                                        key={`common-${index}`}
                                        suggestion={suggestion}
                                        onClick={() => onSuggestionClick && onSuggestionClick(suggestion)}
                                    />
                                ))}
                            </List>
                        </>
                    )}
                    
                    {/* Advanced Suggestions */}
                    {advancedSuggestions.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                Erweiterte Optionen
                            </Typography>
                            
                            <List dense sx={{ py: 0 }}>
                                {advancedSuggestions.map((suggestion, index) => (
                                    <SuggestionItem
                                        key={`advanced-${index}`}
                                        suggestion={suggestion}
                                        onClick={() => onSuggestionClick && onSuggestionClick(suggestion)}
                                    />
                                ))}
                            </List>
                        </>
                    )}
                </Box>
            </Collapse>
        </Paper>
    )
}

/**
 * Single Suggestion Item Component
 */
const SuggestionItem = ({ suggestion, onClick }) => {
    const categoryColor = getCategoryColor(suggestion.category)
    
    return (
        <ListItem 
            disablePadding 
            sx={{ 
                mb: 1,
                '&:last-child': { mb: 0 }
            }}
        >
            <ListItemButton
                onClick={onClick}
                sx={{
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                        borderColor: categoryColor,
                        backgroundColor: `${categoryColor}10`
                    }
                }}
            >
                <ListItemIcon sx={{ minWidth: 40 }}>
                    <Box
                        sx={{
                            fontSize: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {suggestion.icon}
                    </Box>
                </ListItemIcon>
                
                <ListItemText
                    primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {suggestion.name}
                            </Typography>
                            {suggestion.score >= 8 && (
                                <Chip 
                                    label="Top" 
                                    size="small" 
                                    sx={{ 
                                        height: 18, 
                                        fontSize: '0.65rem',
                                        backgroundColor: categoryColor,
                                        color: 'white'
                                    }} 
                                />
                            )}
                        </Box>
                    }
                    secondary={
                        <Typography variant="caption" color="text.secondary">
                            {suggestion.reason}
                        </Typography>
                    }
                />
                
                <IconPlus size={16} style={{ marginLeft: 8, opacity: 0.5 }} />
            </ListItemButton>
        </ListItem>
    )
}

/**
 * Compact Auto-Complete Tooltip
 * 
 * Shows a small tooltip with top suggestion
 * 
 * @param {Object} props
 * @param {Object} props.selectedNode - Selected node
 * @param {Array} props.nodes - All nodes
 * @param {Array} props.edges - All edges
 * @param {Function} props.onOpen - Callback to open full panel
 */
export const AutoCompleteTooltip = ({ selectedNode, nodes, edges, onOpen }) => {
    const [topSuggestion, setTopSuggestion] = useState(null)
    
    useEffect(() => {
        if (!selectedNode) {
            setTopSuggestion(null)
            return
        }
        
        const suggestions = getAutoCompleteSuggestions(selectedNode, nodes, edges, [])
        if (suggestions.length > 0) {
            setTopSuggestion(suggestions[0])
        } else {
            setTopSuggestion(null)
        }
    }, [selectedNode, nodes, edges])
    
    if (!topSuggestion) return null
    
    const suggestionText = formatSuggestionsText([topSuggestion])
    
    return (
        <Paper
            elevation={2}
            sx={{
                position: 'absolute',
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.main',
                cursor: 'pointer',
                zIndex: 999,
                '&:hover': {
                    boxShadow: 3
                }
            }}
            onClick={onOpen}
        >
            <IconSparkles size={16} color="#8b5cf6" />
            <Typography variant="caption">
                {suggestionText}
            </Typography>
            <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
        </Paper>
    )
}

/**
 * Hook to manage auto-complete state
 */
export function useAutoComplete(selectedNode, nodes, edges, availableNodes) {
    const [suggestions, setSuggestions] = useState([])
    const [showPanel, setShowPanel] = useState(false)
    
    useEffect(() => {
        if (!selectedNode) {
            setSuggestions([])
            setShowPanel(false)
            return
        }
        
        const autoCompleteSuggestions = getAutoCompleteSuggestions(
            selectedNode,
            nodes,
            edges,
            availableNodes
        )
        
        setSuggestions(autoCompleteSuggestions)
        
        // Auto-show panel when node selected with suggestions
        if (autoCompleteSuggestions.length > 0) {
            setShowPanel(true)
        }
    }, [selectedNode, nodes, edges, availableNodes])
    
    return {
        suggestions,
        showPanel,
        setShowPanel
    }
}

export default AutoCompletePanel
