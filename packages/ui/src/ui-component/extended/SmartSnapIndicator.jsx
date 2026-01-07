/**
 * M.A.T.E. Smart Snap Indicator Component
 * 
 * Phase 3.2.1: Visual feedback for Smart-Snap suggestions
 * 
 * Displays animated indicators when nodes are close enough to auto-connect
 */

import React, { useState, useEffect } from 'react'
import { Box, Tooltip, Typography } from '@mui/material'
import { IconPlugConnected } from '@tabler/icons'
import { 
    findSnapSuggestions, 
    getSnapIndicatorStyle,
    SNAP_HIGHLIGHT_COLOR 
} from '@/utils/smartSnap'

/**
 * SmartSnapIndicator Component
 * 
 * Shows visual hints when a node can auto-connect to nearby nodes
 * 
 * @param {Object} props
 * @param {Object} props.draggedNode - The node currently being dragged
 * @param {Array} props.nodes - All nodes on canvas
 * @param {Array} props.edges - All edges on canvas
 * @param {Function} props.onSnapSuggestionClick - Callback when user clicks to accept suggestion
 */
export const SmartSnapIndicator = ({ draggedNode, nodes, edges, onSnapSuggestionClick }) => {
    const [suggestions, setSuggestions] = useState([])
    
    useEffect(() => {
        if (!draggedNode) {
            setSuggestions([])
            return
        }
        
        const snapSuggestions = findSnapSuggestions(draggedNode, nodes, edges)
        setSuggestions(snapSuggestions)
    }, [draggedNode, nodes, edges])
    
    if (!draggedNode || suggestions.length === 0) {
        return null
    }
    
    return (
        <>
            {suggestions.map((suggestion, index) => {
                const style = getSnapIndicatorStyle(suggestion)
                const { sourceNode, targetNode, direction } = suggestion
                
                const tooltipText = direction === 'incoming' 
                    ? `Verbinde ${sourceNode.data.label || sourceNode.id} → ${targetNode.data.label || targetNode.id}`
                    : `Verbinde ${sourceNode.data.label || sourceNode.id} → ${targetNode.data.label || targetNode.id}`
                
                return (
                    <Tooltip 
                        key={`snap-${index}`} 
                        title={tooltipText}
                        placement="top"
                        arrow
                    >
                        <Box
                            sx={style}
                            onClick={() => onSnapSuggestionClick && onSnapSuggestionClick(suggestion)}
                        />
                    </Tooltip>
                )
            })}
            
            {/* CSS Animation for pulse effect */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1);
                        }
                        50% {
                            opacity: 0.5;
                            transform: translate(-50%, -50%) scale(1.3);
                        }
                    }
                `}
            </style>
        </>
    )
}

/**
 * SmartSnapBanner Component
 * 
 * Shows a banner notification when snap suggestions are available
 * 
 * @param {Object} props
 * @param {Array} props.suggestions - Array of snap suggestions
 * @param {Function} props.onAccept - Callback when user accepts top suggestion
 * @param {Function} props.onDismiss - Callback when user dismisses banner
 */
export const SmartSnapBanner = ({ suggestions, onAccept, onDismiss }) => {
    if (!suggestions || suggestions.length === 0) {
        return null
    }
    
    const topSuggestion = suggestions[0]
    const { sourceNode, targetNode, direction } = topSuggestion
    
    const message = direction === 'incoming'
        ? `${sourceNode.data.label || sourceNode.id} mit ${targetNode.data.label || targetNode.id} verbinden?`
        : `${sourceNode.data.label || sourceNode.id} mit ${targetNode.data.label || targetNode.id} verbinden?`
    
    return (
        <Box
            sx={{
                position: 'absolute',
                top: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                backgroundColor: 'background.paper',
                border: `2px solid ${SNAP_HIGHLIGHT_COLOR}`,
                borderRadius: 2,
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: 'slideDown 0.3s ease-out'
            }}
        >
            <IconPlugConnected size={20} color={SNAP_HIGHLIGHT_COLOR} />
            
            <Typography variant="body2">
                {message}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
                <button
                    onClick={() => onAccept(topSuggestion)}
                    style={{
                        padding: '4px 12px',
                        backgroundColor: SNAP_HIGHLIGHT_COLOR,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500
                    }}
                >
                    Verbinden
                </button>
                
                <button
                    onClick={onDismiss}
                    style={{
                        padding: '4px 12px',
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Ignorieren
                </button>
            </Box>
            
            {/* CSS Animation for slide down effect */}
            <style>
                {`
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                    }
                `}
            </style>
        </Box>
    )
}

/**
 * Hook to manage smart snap state
 * 
 * @param {Object} reactFlowInstance - ReactFlow instance
 * @returns {Object} { suggestions, showBanner, acceptSuggestion, dismissBanner }
 */
export function useSmartSnap(reactFlowInstance) {
    const [draggedNode, setDraggedNode] = useState(null)
    const [suggestions, setSuggestions] = useState([])
    const [showBanner, setShowBanner] = useState(false)
    
    useEffect(() => {
        if (!reactFlowInstance) return
        
        const handleNodeDragStart = (event, node) => {
            setDraggedNode(node)
        }
        
        const handleNodeDrag = (event, node) => {
            setDraggedNode(node)
        }
        
        const handleNodeDragStop = (event, node) => {
            // Show banner after drag stop if suggestions exist
            const nodes = reactFlowInstance.getNodes()
            const edges = reactFlowInstance.getEdges()
            const snapSuggestions = findSnapSuggestions(node, nodes, edges)
            
            if (snapSuggestions.length > 0) {
                setSuggestions(snapSuggestions)
                setShowBanner(true)
                
                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                    setShowBanner(false)
                }, 5000)
            }
            
            setDraggedNode(null)
        }
        
        // Note: ReactFlow doesn't expose these as separate events
        // They need to be integrated into existing onNodeDrag* handlers
        
        return () => {
            setDraggedNode(null)
            setSuggestions([])
        }
    }, [reactFlowInstance])
    
    const acceptSuggestion = (suggestion) => {
        setShowBanner(false)
        return suggestion
    }
    
    const dismissBanner = () => {
        setShowBanner(false)
    }
    
    return {
        draggedNode,
        suggestions,
        showBanner,
        acceptSuggestion,
        dismissBanner
    }
}

export default SmartSnapIndicator
