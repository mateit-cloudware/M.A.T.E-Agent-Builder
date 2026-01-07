/**
 * M.A.T.E. Smart Snap Utility
 * 
 * Phase 3.2.1: Smart-Snap für intelligente Node-Verbindungen
 * 
 * Automatische Erkennung und Vorschlag von logischen Verbindungen
 * wenn Nodes in die Nähe kompatibler Connection-Points gebracht werden
 */

/**
 * Distance threshold for smart snap (in pixels)
 * Nodes within this distance will trigger snap suggestions
 */
export const SMART_SNAP_THRESHOLD = 150

/**
 * Snap highlight color
 */
export const SNAP_HIGHLIGHT_COLOR = '#4ade80' // Green 400

/**
 * Node category compatibility rules
 * Defines which node categories can connect to each other
 * 
 * Rules:
 * - trigger → ai (Trigger starts with AI)
 * - ai → logic (AI can route to conditional logic)
 * - ai → action (AI can trigger actions)
 * - logic → ai (Logic can route back to AI)
 * - logic → action (Logic can trigger actions)
 * - ai → data (AI can store/retrieve data)
 * - data → ai (Data can feed back to AI)
 */
export const CATEGORY_COMPATIBILITY = {
    trigger: ['ai'],
    ai: ['logic', 'action', 'data', 'ai'],
    logic: ['ai', 'action', 'data'],
    action: [],  // Actions are terminal nodes
    data: ['ai'],
    tool: ['ai']  // Tools feed into AI
}

/**
 * Get node category from node data
 * @param {Object} node - ReactFlow node object
 * @returns {string} Category key or 'unknown'
 */
export function getNodeCategory(node) {
    if (!node || !node.data) return 'unknown'
    
    const nodeName = node.data.name || ''
    
    // Category detection based on node name patterns
    if (nodeName.includes('start') || nodeName.includes('trigger') || nodeName.includes('vapi')) {
        return 'trigger'
    }
    if (nodeName.includes('Agent') || nodeName.includes('OpenAI') || nodeName.includes('chatOpenAI')) {
        return 'ai'
    }
    if (nodeName.includes('condition') || nodeName.includes('ifElse') || nodeName.includes('router')) {
        return 'logic'
    }
    if (nodeName.includes('sms') || nodeName.includes('email') || nodeName.includes('speak')) {
        return 'action'
    }
    if (nodeName.includes('memory') || nodeName.includes('database') || nodeName.includes('storage')) {
        return 'data'
    }
    if (nodeName.includes('tool') || nodeName.includes('calculator') || nodeName.includes('search')) {
        return 'tool'
    }
    
    return 'unknown'
}

/**
 * Check if two node categories are compatible for connection
 * @param {string} sourceCategory - Source node category
 * @param {string} targetCategory - Target node category
 * @returns {boolean} True if compatible
 */
export function areCategoriesCompatible(sourceCategory, targetCategory) {
    const compatibleTargets = CATEGORY_COMPATIBILITY[sourceCategory] || []
    return compatibleTargets.includes(targetCategory)
}

/**
 * Calculate Euclidean distance between two points
 * @param {Object} point1 - {x, y}
 * @param {Object} point2 - {x, y}
 * @returns {number} Distance in pixels
 */
export function calculateDistance(point1, point2) {
    const dx = point2.x - point1.x
    const dy = point2.y - point1.y
    return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Get connection handle positions for a node
 * Estimates handle positions based on node dimensions
 * 
 * @param {Object} node - ReactFlow node
 * @returns {Object} { outputs: [{id, position: {x, y}}], inputs: [{id, position: {x, y}}] }
 */
export function getNodeHandles(node) {
    const nodeWidth = node.width || 200
    const nodeHeight = node.height || 100
    
    const outputs = []
    const inputs = []
    
    // Output handles (right side)
    if (node.data?.outputAnchors) {
        node.data.outputAnchors.forEach((anchor, index) => {
            const count = node.data.outputAnchors.length
            const spacing = nodeHeight / (count + 1)
            outputs.push({
                id: anchor.id || `${node.data.name}_${anchor.name}`,
                position: {
                    x: node.position.x + nodeWidth,
                    y: node.position.y + spacing * (index + 1)
                },
                type: anchor.type
            })
        })
    }
    
    // Input handles (left side)
    if (node.data?.inputAnchors) {
        node.data.inputAnchors.forEach((anchor, index) => {
            const count = node.data.inputAnchors.length
            const spacing = nodeHeight / (count + 1)
            inputs.push({
                id: anchor.id || `${node.data.name}_${anchor.name}`,
                position: {
                    x: node.position.x,
                    y: node.position.y + spacing * (index + 1)
                },
                type: anchor.type
            })
        })
    }
    
    return { outputs, inputs }
}

/**
 * Find potential snap connections for a dragged/dropped node
 * 
 * @param {Object} droppedNode - The node being positioned
 * @param {Array} existingNodes - All nodes currently on canvas
 * @param {Array} existingEdges - All edges currently on canvas
 * @returns {Array} Array of snap suggestions: [{sourceNode, targetNode, sourceHandle, targetHandle, distance, score}]
 */
export function findSnapSuggestions(droppedNode, existingNodes, existingEdges = []) {
    const suggestions = []
    
    const droppedCategory = getNodeCategory(droppedNode)
    const droppedHandles = getNodeHandles(droppedNode)
    
    for (const existingNode of existingNodes) {
        // Skip self
        if (existingNode.id === droppedNode.id) continue
        
        const existingCategory = getNodeCategory(existingNode)
        const existingHandles = getNodeHandles(existingNode)
        
        // Check if dropped node can connect FROM existing node
        if (areCategoriesCompatible(existingCategory, droppedCategory)) {
            // Existing node outputs → Dropped node inputs
            for (const output of existingHandles.outputs) {
                for (const input of droppedHandles.inputs) {
                    // Check if connection already exists
                    const connectionExists = existingEdges.some(edge => 
                        edge.source === existingNode.id && 
                        edge.target === droppedNode.id &&
                        edge.sourceHandle === output.id &&
                        edge.targetHandle === input.id
                    )
                    
                    if (!connectionExists) {
                        const distance = calculateDistance(output.position, input.position)
                        
                        if (distance < SMART_SNAP_THRESHOLD) {
                            // Score based on distance and category match
                            // Lower distance = higher score
                            const distanceScore = (SMART_SNAP_THRESHOLD - distance) / SMART_SNAP_THRESHOLD
                            const categoryScore = 0.5 // Base score for category compatibility
                            const score = (distanceScore * 0.7) + (categoryScore * 0.3)
                            
                            suggestions.push({
                                sourceNode: existingNode,
                                targetNode: droppedNode,
                                sourceHandle: output,
                                targetHandle: input,
                                distance,
                                score,
                                direction: 'incoming' // Connection coming INTO dropped node
                            })
                        }
                    }
                }
            }
        }
        
        // Check if existing node can connect FROM dropped node
        if (areCategoriesCompatible(droppedCategory, existingCategory)) {
            // Dropped node outputs → Existing node inputs
            for (const output of droppedHandles.outputs) {
                for (const input of existingHandles.inputs) {
                    // Check if connection already exists
                    const connectionExists = existingEdges.some(edge => 
                        edge.source === droppedNode.id && 
                        edge.target === existingNode.id &&
                        edge.sourceHandle === output.id &&
                        edge.targetHandle === input.id
                    )
                    
                    if (!connectionExists) {
                        const distance = calculateDistance(output.position, input.position)
                        
                        if (distance < SMART_SNAP_THRESHOLD) {
                            const distanceScore = (SMART_SNAP_THRESHOLD - distance) / SMART_SNAP_THRESHOLD
                            const categoryScore = 0.5
                            const score = (distanceScore * 0.7) + (categoryScore * 0.3)
                            
                            suggestions.push({
                                sourceNode: droppedNode,
                                targetNode: existingNode,
                                sourceHandle: output,
                                targetHandle: input,
                                distance,
                                score,
                                direction: 'outgoing' // Connection going OUT of dropped node
                            })
                        }
                    }
                }
            }
        }
    }
    
    // Sort by score (highest first)
    suggestions.sort((a, b) => b.score - a.score)
    
    // Return top 3 suggestions
    return suggestions.slice(0, 3)
}

/**
 * Apply smart snap positioning
 * Adjusts node position to align with suggested connection
 * 
 * @param {Object} node - Node to reposition
 * @param {Object} suggestion - Snap suggestion from findSnapSuggestions
 * @returns {Object} Updated node position {x, y}
 */
export function applySmartSnapPosition(node, suggestion) {
    const { sourceHandle, targetHandle, direction } = suggestion
    
    // Calculate ideal position to align handles
    let newX = node.position.x
    let newY = node.position.y
    
    if (direction === 'incoming') {
        // Align input handle with source output handle
        const handleOffsetX = targetHandle.position.x - node.position.x
        const handleOffsetY = targetHandle.position.y - node.position.y
        
        newX = sourceHandle.position.x - handleOffsetX
        newY = sourceHandle.position.y - handleOffsetY
    } else {
        // Align output handle with target input handle
        const handleOffsetX = sourceHandle.position.x - node.position.x
        const handleOffsetY = sourceHandle.position.y - node.position.y
        
        newX = targetHandle.position.x - handleOffsetX
        newY = targetHandle.position.y - handleOffsetY
    }
    
    return { x: newX, y: newY }
}

/**
 * Create edge from snap suggestion
 * @param {Object} suggestion - Snap suggestion object
 * @returns {Object} ReactFlow edge object
 */
export function createEdgeFromSuggestion(suggestion) {
    const { sourceNode, targetNode, sourceHandle, targetHandle } = suggestion
    
    return {
        id: `${sourceNode.id}-${sourceHandle.id}-${targetNode.id}-${targetHandle.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: sourceHandle.id,
        targetHandle: targetHandle.id,
        type: 'buttonedge', // or 'agentFlow' depending on canvas type
        animated: true // Animate the new connection to draw attention
    }
}

/**
 * Get snap indicator style for visual feedback
 * @param {Object} suggestion - Snap suggestion
 * @returns {Object} Style object for snap indicator overlay
 */
export function getSnapIndicatorStyle(suggestion) {
    const { sourceHandle, targetHandle } = suggestion
    
    // Calculate midpoint for indicator
    const midX = (sourceHandle.position.x + targetHandle.position.x) / 2
    const midY = (sourceHandle.position.y + targetHandle.position.y) / 2
    
    return {
        position: 'absolute',
        left: `${midX}px`,
        top: `${midY}px`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: SNAP_HIGHLIGHT_COLOR,
        borderRadius: '50%',
        width: '12px',
        height: '12px',
        boxShadow: `0 0 0 4px ${SNAP_HIGHLIGHT_COLOR}40`,
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'pulse 1.5s ease-in-out infinite'
    }
}

export default {
    SMART_SNAP_THRESHOLD,
    SNAP_HIGHLIGHT_COLOR,
    CATEGORY_COMPATIBILITY,
    getNodeCategory,
    areCategoriesCompatible,
    calculateDistance,
    getNodeHandles,
    findSnapSuggestions,
    applySmartSnapPosition,
    createEdgeFromSuggestion,
    getSnapIndicatorStyle
}
