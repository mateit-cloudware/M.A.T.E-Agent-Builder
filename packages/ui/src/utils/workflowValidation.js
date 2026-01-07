/**
 * M.A.T.E. Workflow Validation System
 * 
 * Phase 3.2.3: Echtzeit-Validierung mit visuellen Hinweisen
 * 
 * Prüft Workflows auf:
 * - Fehlende Verbindungen
 * - Unvollständige Konfiguration
 * - Logische Fehler
 * - Best Practice Violations
 */

import { getNodeCategory } from './smartSnap'

/**
 * Validation severity levels
 */
export const ValidationSeverity = {
    ERROR: 'error',      // Workflow kann nicht deployed werden
    WARNING: 'warning',  // Workflow funktioniert, aber nicht optimal
    INFO: 'info'         // Verbesserungsvorschlag
}

/**
 * Validation rule types
 */
export const ValidationRuleType = {
    MISSING_CONNECTION: 'missing_connection',
    MISSING_CONFIG: 'missing_config',
    LOGICAL_ERROR: 'logical_error',
    UNREACHABLE_NODE: 'unreachable_node',
    DEAD_END: 'dead_end',
    BEST_PRACTICE: 'best_practice'
}

/**
 * Validate entire workflow
 * 
 * @param {Array} nodes - All nodes in workflow
 * @param {Array} edges - All edges in workflow
 * @returns {Array} Array of validation issues
 */
export function validateWorkflow(nodes, edges) {
    const issues = []
    
    // Check if workflow has any nodes
    if (nodes.length === 0) {
        issues.push({
            severity: ValidationSeverity.INFO,
            type: ValidationRuleType.MISSING_CONNECTION,
            message: 'Workflow ist leer - füge Nodes hinzu um zu beginnen',
            nodeIds: []
        })
        return issues
    }
    
    // 1. Check for start node
    const startNodeIssues = validateStartNode(nodes)
    issues.push(...startNodeIssues)
    
    // 2. Check each node
    nodes.forEach(node => {
        const nodeIssues = validateNode(node, nodes, edges)
        issues.push(...nodeIssues)
    })
    
    // 3. Check for unreachable nodes
    const unreachableIssues = validateReachability(nodes, edges)
    issues.push(...unreachableIssues)
    
    // 4. Check for dead ends (terminal nodes that should have outputs)
    const deadEndIssues = validateDeadEnds(nodes, edges)
    issues.push(...deadEndIssues)
    
    // 5. Check best practices
    const bestPracticeIssues = validateBestPractices(nodes, edges)
    issues.push(...bestPracticeIssues)
    
    return issues
}

/**
 * Validate that workflow has a start node
 */
function validateStartNode(nodes) {
    const issues = []
    
    const startNodes = nodes.filter(node => {
        const category = getNodeCategory(node)
        return category === 'trigger' || node.data?.name?.includes('start')
    })
    
    if (startNodes.length === 0) {
        issues.push({
            severity: ValidationSeverity.ERROR,
            type: ValidationRuleType.LOGICAL_ERROR,
            message: 'Workflow benötigt einen Start-Node (Trigger)',
            nodeIds: [],
            fix: 'Füge einen Trigger-Node hinzu (z.B. VAPI Voice Trigger)'
        })
    } else if (startNodes.length > 1) {
        issues.push({
            severity: ValidationSeverity.WARNING,
            type: ValidationRuleType.LOGICAL_ERROR,
            message: 'Workflow hat mehrere Start-Nodes',
            nodeIds: startNodes.map(n => n.id),
            fix: 'Verwende nur einen Start-Node pro Workflow'
        })
    }
    
    return issues
}

/**
 * Validate individual node
 */
function validateNode(node, allNodes, allEdges) {
    const issues = []
    
    // Check if node has required inputs connected
    const missingInputs = getMissingRequiredInputs(node, allEdges)
    if (missingInputs.length > 0) {
        issues.push({
            severity: ValidationSeverity.ERROR,
            type: ValidationRuleType.MISSING_CONNECTION,
            message: `Node "${node.data?.label || node.id}" fehlen erforderliche Eingänge: ${missingInputs.join(', ')}`,
            nodeIds: [node.id],
            fix: `Verbinde ${missingInputs.join(', ')} mit kompatiblen Nodes`
        })
    }
    
    // Check if node has required configuration
    const missingConfig = getMissingRequiredConfig(node)
    if (missingConfig.length > 0) {
        issues.push({
            severity: ValidationSeverity.ERROR,
            type: ValidationRuleType.MISSING_CONFIG,
            message: `Node "${node.data?.label || node.id}" fehlt Konfiguration: ${missingConfig.join(', ')}`,
            nodeIds: [node.id],
            fix: 'Doppelklicke auf Node um Konfiguration zu vervollständigen'
        })
    }
    
    // Check for disconnected outputs (except terminal nodes)
    const category = getNodeCategory(node)
    if (category !== 'action') {
        const hasOutputs = allEdges.some(edge => edge.source === node.id)
        if (!hasOutputs) {
            issues.push({
                severity: ValidationSeverity.WARNING,
                type: ValidationRuleType.DEAD_END,
                message: `Node "${node.data?.label || node.id}" hat keine ausgehenden Verbindungen`,
                nodeIds: [node.id],
                fix: 'Verbinde Node mit einem nächsten Schritt'
            })
        }
    }
    
    return issues
}

/**
 * Get missing required inputs for a node
 */
function getMissingRequiredInputs(node, edges) {
    const missing = []
    
    if (!node.data?.inputAnchors) return missing
    
    node.data.inputAnchors.forEach(anchor => {
        // Skip optional inputs
        if (anchor.optional) return
        
        // Check if this input is connected
        const isConnected = edges.some(edge => 
            edge.target === node.id && 
            edge.targetHandle && 
            edge.targetHandle.includes(anchor.name)
        )
        
        if (!isConnected) {
            missing.push(anchor.label || anchor.name)
        }
    })
    
    return missing
}

/**
 * Get missing required configuration for a node
 */
function getMissingRequiredConfig(node) {
    const missing = []
    
    if (!node.data?.inputParams) return missing
    
    node.data.inputParams.forEach(param => {
        // Skip optional parameters
        if (param.optional) return
        
        // Check if parameter has a value
        const value = node.data.inputs?.[param.name]
        if (!value || value === '' || value === null || value === undefined) {
            missing.push(param.label || param.name)
        }
    })
    
    return missing
}

/**
 * Validate node reachability (can every node be reached from start?)
 */
function validateReachability(nodes, edges) {
    const issues = []
    
    // Find start nodes
    const startNodes = nodes.filter(node => {
        const category = getNodeCategory(node)
        return category === 'trigger' || node.data?.name?.includes('start')
    })
    
    if (startNodes.length === 0) return issues // Already reported by validateStartNode
    
    // Build reachability set starting from start nodes
    const reachable = new Set()
    const queue = [...startNodes.map(n => n.id)]
    
    while (queue.length > 0) {
        const currentId = queue.shift()
        if (reachable.has(currentId)) continue
        
        reachable.add(currentId)
        
        // Add all nodes this connects to
        edges.forEach(edge => {
            if (edge.source === currentId && !reachable.has(edge.target)) {
                queue.push(edge.target)
            }
        })
    }
    
    // Check for unreachable nodes
    nodes.forEach(node => {
        if (!reachable.has(node.id)) {
            issues.push({
                severity: ValidationSeverity.WARNING,
                type: ValidationRuleType.UNREACHABLE_NODE,
                message: `Node "${node.data?.label || node.id}" ist nicht erreichbar`,
                nodeIds: [node.id],
                fix: 'Verbinde Node mit dem Hauptworkflow'
            })
        }
    })
    
    return issues
}

/**
 * Validate for dead ends (non-action nodes without outputs)
 */
function validateDeadEnds(nodes, edges) {
    const issues = []
    
    nodes.forEach(node => {
        const category = getNodeCategory(node)
        
        // Action nodes are expected terminal nodes
        if (category === 'action') return
        
        // Check if node has outgoing edges
        const hasOutputs = edges.some(edge => edge.source === node.id)
        
        if (!hasOutputs) {
            issues.push({
                severity: ValidationSeverity.WARNING,
                type: ValidationRuleType.DEAD_END,
                message: `Node "${node.data?.label || node.id}" endet ohne Aktion`,
                nodeIds: [node.id],
                fix: 'Füge eine Aktion hinzu (z.B. Sprachausgabe) oder verbinde mit weiterem Node'
            })
        }
    })
    
    return issues
}

/**
 * Validate best practices
 */
function validateBestPractices(nodes, edges) {
    const issues = []
    
    // Best Practice: Voice agents should have memory
    const hasVoiceTrigger = nodes.some(node => 
        node.data?.name?.includes('vapi') || node.data?.name?.includes('voice')
    )
    const hasMemory = nodes.some(node => 
        node.data?.name?.includes('memory') || node.data?.name?.includes('buffer')
    )
    
    if (hasVoiceTrigger && !hasMemory) {
        issues.push({
            severity: ValidationSeverity.INFO,
            type: ValidationRuleType.BEST_PRACTICE,
            message: 'Empfehlung: Füge Kontext-Speicher hinzu für bessere Gespräche',
            nodeIds: [],
            fix: 'Füge einen Buffer Memory Node nach dem KI-Node hinzu'
        })
    }
    
    // Best Practice: Long workflows should have conditional routing
    if (nodes.length > 5 && !nodes.some(node => node.data?.name?.includes('condition'))) {
        issues.push({
            severity: ValidationSeverity.INFO,
            type: ValidationRuleType.BEST_PRACTICE,
            message: 'Empfehlung: Verwende Verzweigungen für komplexe Workflows',
            nodeIds: [],
            fix: 'Füge Condition-Nodes hinzu um den Flow zu strukturieren'
        })
    }
    
    // Best Practice: AI nodes should have system prompts configured
    const aiNodesWithoutPrompts = nodes.filter(node => {
        const category = getNodeCategory(node)
        if (category !== 'ai') return false
        
        const hasSystemMessage = node.data?.inputs?.systemMessage || 
                                 node.data?.inputs?.systemMessagePrompt
        return !hasSystemMessage
    })
    
    if (aiNodesWithoutPrompts.length > 0) {
        issues.push({
            severity: ValidationSeverity.INFO,
            type: ValidationRuleType.BEST_PRACTICE,
            message: 'Empfehlung: Konfiguriere System-Prompts für KI-Nodes',
            nodeIds: aiNodesWithoutPrompts.map(n => n.id),
            fix: 'Definiere System-Prompts um KI-Verhalten zu steuern'
        })
    }
    
    return issues
}

/**
 * Get validation summary
 * 
 * @param {Array} issues - Validation issues
 * @returns {Object} { errors: number, warnings: number, infos: number, canDeploy: boolean }
 */
export function getValidationSummary(issues) {
    const errors = issues.filter(i => i.severity === ValidationSeverity.ERROR).length
    const warnings = issues.filter(i => i.severity === ValidationSeverity.WARNING).length
    const infos = issues.filter(i => i.severity === ValidationSeverity.INFO).length
    
    return {
        errors,
        warnings,
        infos,
        total: issues.length,
        canDeploy: errors === 0
    }
}

/**
 * Get validation status text
 */
export function getValidationStatusText(summary) {
    if (summary.errors > 0) {
        return `${summary.errors} Fehler - Kann nicht deployed werden`
    }
    if (summary.warnings > 0) {
        return `${summary.warnings} Warnungen - Deployment möglich`
    }
    if (summary.infos > 0) {
        return `${summary.infos} Hinweise - Bereit für Deployment`
    }
    return 'Alles OK - Bereit für Deployment'
}

/**
 * Get color for severity
 */
export function getSeverityColor(severity) {
    switch (severity) {
        case ValidationSeverity.ERROR:
            return '#ef4444' // Red 500
        case ValidationSeverity.WARNING:
            return '#f59e0b' // Amber 500
        case ValidationSeverity.INFO:
            return '#3b82f6' // Blue 500
        default:
            return '#6b7280' // Gray 500
    }
}

/**
 * Get icon for severity
 */
export function getSeverityIcon(severity) {
    switch (severity) {
        case ValidationSeverity.ERROR:
            return '❌'
        case ValidationSeverity.WARNING:
            return '⚠️'
        case ValidationSeverity.INFO:
            return 'ℹ️'
        default:
            return '•'
    }
}

export default {
    ValidationSeverity,
    ValidationRuleType,
    validateWorkflow,
    getValidationSummary,
    getValidationStatusText,
    getSeverityColor,
    getSeverityIcon
}
