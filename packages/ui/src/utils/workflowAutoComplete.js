/**
 * M.A.T.E. Workflow Auto-Complete System
 * 
 * Phase 3.2.2: Auto-Complete für Workflow-Vorschläge
 * 
 * Intelligente Vorschläge für nächste Nodes basierend auf:
 * - Aktuellem Node-Typ
 * - Workflow-Kontext
 * - Häufigen Patterns
 * - Best Practices
 */

import { getNodeCategory } from './smartSnap'

/**
 * Workflow patterns - Common node sequences
 * Based on M.A.T.E. use cases: VAPI voice agents, chatbots, support automation
 */
export const WORKFLOW_PATTERNS = {
    // Voice Agent Pattern: Anruf → KI → Aktion
    voiceAgent: {
        name: 'Voice Agent',
        description: 'Telefonischer KI-Assistent',
        sequence: ['trigger', 'ai', 'action'],
        nodes: ['vapiVoiceTrigger', 'chatOpenAI', 'vapiSpeak']
    },
    
    // Conditional Routing: KI → Logik → Multiple Actions
    conditionalFlow: {
        name: 'Conditional Routing',
        description: 'Bedingte Verzweigung basierend auf KI-Antwort',
        sequence: ['ai', 'logic', 'action'],
        nodes: ['chatOpenAI', 'conditionAgent', 'vapiSpeak']
    },
    
    // Support Bot: Trigger → KI mit Memory → Conditional → Actions
    supportBot: {
        name: 'Support Bot',
        description: 'Intelligenter Support-Agent mit Kontext-Speicher',
        sequence: ['trigger', 'ai', 'data', 'logic', 'action'],
        nodes: ['vapiVoiceTrigger', 'chatOpenAI', 'bufferMemory', 'conditionAgent', 'vapiSpeak']
    },
    
    // Data Collection: Trigger → AI → Data Storage
    dataCollection: {
        name: 'Data Collection',
        description: 'Informationen sammeln und speichern',
        sequence: ['trigger', 'ai', 'data'],
        nodes: ['vapiVoiceTrigger', 'chatOpenAI', 'bufferMemory']
    }
}

/**
 * Next node suggestions based on current node category
 * 
 * Structure: {
 *   [currentCategory]: {
 *     common: [suggestions], // Most common next nodes
 *     alternative: [suggestions], // Alternative options
 *     advanced: [suggestions] // Advanced/complex options
 *   }
 * }
 */
export const NEXT_NODE_SUGGESTIONS = {
    trigger: {
        common: [
            {
                nodeType: 'chatOpenAI',
                name: 'KI-Assistent',
                category: 'ai',
                reason: 'Verarbeite Benutzer-Input mit KI',
                icon: '🤖',
                priority: 1
            },
            {
                nodeType: 'conversationalAgent',
                name: 'Conversation Agent',
                category: 'ai',
                reason: 'Mehrstufiges Gespräch mit Kontext',
                icon: '🤖',
                priority: 2
            }
        ],
        alternative: [
            {
                nodeType: 'conditionAgent',
                name: 'Wenn-Dann-Verzweigung',
                category: 'logic',
                reason: 'Direkte Verzweigung ohne KI',
                icon: '⚡',
                priority: 3
            }
        ],
        advanced: []
    },
    
    ai: {
        common: [
            {
                nodeType: 'vapiSpeak',
                name: 'Sprach-Ausgabe',
                category: 'action',
                reason: 'Antworte dem Benutzer per Sprache',
                icon: '🗣️',
                priority: 1
            },
            {
                nodeType: 'conditionAgent',
                name: 'Wenn-Dann-Verzweigung',
                category: 'logic',
                reason: 'Verzweige basierend auf KI-Antwort',
                icon: '⚡',
                priority: 2
            },
            {
                nodeType: 'bufferMemory',
                name: 'Kontext-Speicher',
                category: 'data',
                reason: 'Speichere Gesprächskontext',
                icon: '📊',
                priority: 3
            }
        ],
        alternative: [
            {
                nodeType: 'chatOpenAI',
                name: 'Weiterer KI-Schritt',
                category: 'ai',
                reason: 'Zusätzliche KI-Verarbeitung',
                icon: '🤖',
                priority: 4
            }
        ],
        advanced: [
            {
                nodeType: 'toolAgent',
                name: 'Tool Agent',
                category: 'ai',
                reason: 'KI mit externen Tools',
                icon: '🔧',
                priority: 5
            }
        ]
    },
    
    logic: {
        common: [
            {
                nodeType: 'vapiSpeak',
                name: 'Sprach-Ausgabe',
                category: 'action',
                reason: 'Gib Antwort basierend auf Bedingung',
                icon: '🗣️',
                priority: 1
            },
            {
                nodeType: 'chatOpenAI',
                name: 'KI-Assistent',
                category: 'ai',
                reason: 'Route zu spezifischem KI-Kontext',
                icon: '🤖',
                priority: 2
            }
        ],
        alternative: [
            {
                nodeType: 'vapiTransferCall',
                name: 'Anruf weiterleiten',
                category: 'action',
                reason: 'Leite an menschlichen Agent weiter',
                icon: '📞',
                priority: 3
            }
        ],
        advanced: [
            {
                nodeType: 'conditionAgent',
                name: 'Verschachtelte Verzweigung',
                category: 'logic',
                reason: 'Komplexe Multi-Bedingung',
                icon: '⚡',
                priority: 4
            }
        ]
    },
    
    action: {
        common: [
            // Actions are usually terminal, but can loop back
            {
                nodeType: 'chatOpenAI',
                name: 'KI-Assistent',
                category: 'ai',
                reason: 'Fortsetze Konversation',
                icon: '🤖',
                priority: 1
            }
        ],
        alternative: [],
        advanced: []
    },
    
    data: {
        common: [
            {
                nodeType: 'chatOpenAI',
                name: 'KI-Assistent',
                category: 'ai',
                reason: 'Nutze gespeicherten Kontext',
                icon: '🤖',
                priority: 1
            },
            {
                nodeType: 'conditionAgent',
                name: 'Wenn-Dann-Verzweigung',
                category: 'logic',
                reason: 'Entscheide basierend auf Daten',
                icon: '⚡',
                priority: 2
            }
        ],
        alternative: [],
        advanced: []
    },
    
    tool: {
        common: [
            {
                nodeType: 'chatOpenAI',
                name: 'KI-Assistent',
                category: 'ai',
                reason: 'Verarbeite Tool-Ergebnis',
                icon: '🤖',
                priority: 1
            }
        ],
        alternative: [],
        advanced: []
    }
}

/**
 * Get auto-complete suggestions for a node
 * 
 * @param {Object} currentNode - Current node being worked on
 * @param {Array} allNodes - All nodes in workflow
 * @param {Array} allEdges - All edges in workflow
 * @param {Array} availableNodes - Available node types from API
 * @returns {Array} Sorted array of suggestions
 */
export function getAutoCompleteSuggestions(currentNode, allNodes, allEdges, availableNodes = []) {
    if (!currentNode) return []
    
    const category = getNodeCategory(currentNode)
    const suggestions = NEXT_NODE_SUGGESTIONS[category]
    
    if (!suggestions) return []
    
    // Flatten all suggestion categories
    const allSuggestions = [
        ...(suggestions.common || []),
        ...(suggestions.alternative || []),
        ...(suggestions.advanced || [])
    ]
    
    // Filter out nodes that are already directly connected
    const connectedNodeIds = allEdges
        .filter(edge => edge.source === currentNode.id)
        .map(edge => edge.target)
    
    const connectedNodeTypes = allNodes
        .filter(node => connectedNodeIds.includes(node.id))
        .map(node => node.data?.name)
    
    // Score and filter suggestions
    const scoredSuggestions = allSuggestions
        .filter(suggestion => {
            // Don't suggest if already connected
            if (connectedNodeTypes.includes(suggestion.nodeType)) {
                return false
            }
            
            // Check if node type is available
            if (availableNodes.length > 0) {
                return availableNodes.some(node => node.name === suggestion.nodeType)
            }
            
            return true
        })
        .map(suggestion => ({
            ...suggestion,
            // Calculate final score based on priority and context
            score: calculateSuggestionScore(suggestion, currentNode, allNodes, allEdges)
        }))
    
    // Sort by score (highest first)
    scoredSuggestions.sort((a, b) => b.score - a.score)
    
    return scoredSuggestions.slice(0, 5) // Return top 5
}

/**
 * Calculate suggestion score based on context
 * 
 * @param {Object} suggestion - Suggestion object
 * @param {Object} currentNode - Current node
 * @param {Array} allNodes - All nodes
 * @param {Array} allEdges - All edges
 * @returns {number} Score (higher is better)
 */
function calculateSuggestionScore(suggestion, currentNode, allNodes, allEdges) {
    let score = 10 - suggestion.priority // Base score from priority (1 = 9 points, 5 = 5 points)
    
    // Bonus: If suggestion fits a known pattern
    const workflowContext = analyzeWorkflowContext(allNodes, allEdges)
    if (workflowContext.likelyPattern) {
        const pattern = WORKFLOW_PATTERNS[workflowContext.likelyPattern]
        if (pattern && pattern.nodes.includes(suggestion.nodeType)) {
            score += 3
        }
    }
    
    // Bonus: If this would complete a common sequence
    const currentSequence = getNodeSequence(currentNode, allNodes, allEdges)
    if (currentSequence.length > 0 && wouldCompletePattern(currentSequence, suggestion)) {
        score += 2
    }
    
    // Penalty: If workflow is already complex (discourage adding more)
    if (allNodes.length > 10) {
        score -= 1
    }
    
    return score
}

/**
 * Analyze workflow to detect likely pattern
 * 
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {Object} { likelyPattern: string, confidence: number }
 */
function analyzeWorkflowContext(nodes, edges) {
    // Check which pattern matches best
    let bestMatch = { pattern: null, score: 0 }
    
    for (const [patternKey, pattern] of Object.entries(WORKFLOW_PATTERNS)) {
        let matchScore = 0
        
        // Count how many nodes from pattern exist
        pattern.nodes.forEach(nodeType => {
            if (nodes.some(node => node.data?.name === nodeType)) {
                matchScore += 1
            }
        })
        
        if (matchScore > bestMatch.score) {
            bestMatch = { pattern: patternKey, score: matchScore }
        }
    }
    
    return {
        likelyPattern: bestMatch.score >= 2 ? bestMatch.pattern : null,
        confidence: bestMatch.score / (WORKFLOW_PATTERNS[bestMatch.pattern]?.nodes.length || 1)
    }
}

/**
 * Get sequence of nodes leading to current node
 * 
 * @param {Object} node - Target node
 * @param {Array} allNodes - All nodes
 * @param {Array} allEdges - All edges
 * @returns {Array} Array of categories in sequence
 */
function getNodeSequence(node, allNodes, allEdges) {
    const sequence = []
    let currentNode = node
    
    // Trace backwards up to 5 levels
    for (let i = 0; i < 5; i++) {
        const category = getNodeCategory(currentNode)
        sequence.unshift(category)
        
        // Find parent node
        const incomingEdge = allEdges.find(edge => edge.target === currentNode.id)
        if (!incomingEdge) break
        
        currentNode = allNodes.find(n => n.id === incomingEdge.source)
        if (!currentNode) break
    }
    
    return sequence
}

/**
 * Check if suggestion would complete a known pattern
 * 
 * @param {Array} currentSequence - Current node sequence
 * @param {Object} suggestion - Suggestion to check
 * @returns {boolean} True if completes pattern
 */
function wouldCompletePattern(currentSequence, suggestion) {
    const sequenceWithSuggestion = [...currentSequence, suggestion.category]
    
    for (const pattern of Object.values(WORKFLOW_PATTERNS)) {
        // Check if our sequence matches the pattern sequence
        if (arraysMatch(sequenceWithSuggestion, pattern.sequence)) {
            return true
        }
    }
    
    return false
}

/**
 * Check if two arrays match (a can be shorter than b)
 */
function arraysMatch(a, b) {
    if (a.length > b.length) return false
    
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    
    return true
}

/**
 * Get workflow pattern suggestions
 * Suggests complete workflow templates
 * 
 * @param {Array} currentNodes - Current nodes in workflow
 * @returns {Array} Array of pattern suggestions
 */
export function getPatternSuggestions(currentNodes) {
    // If workflow is empty or has only 1 node, suggest all patterns
    if (currentNodes.length <= 1) {
        return Object.entries(WORKFLOW_PATTERNS).map(([key, pattern]) => ({
            patternKey: key,
            ...pattern,
            matchScore: 0,
            reason: 'Empfohlenes Workflow-Muster'
        }))
    }
    
    // If workflow has nodes, suggest patterns that match
    const suggestions = []
    
    for (const [key, pattern] of Object.entries(WORKFLOW_PATTERNS)) {
        const matchScore = pattern.nodes.filter(nodeType =>
            currentNodes.some(node => node.data?.name === nodeType)
        ).length
        
        if (matchScore > 0) {
            suggestions.push({
                patternKey: key,
                ...pattern,
                matchScore,
                reason: `${matchScore}/${pattern.nodes.length} Nodes bereits vorhanden`
            })
        }
    }
    
    // Sort by match score
    suggestions.sort((a, b) => b.matchScore - a.matchScore)
    
    return suggestions
}

/**
 * Generate completion suggestions text
 * 
 * @param {Array} suggestions - Suggestions from getAutoCompleteSuggestions
 * @returns {string} Formatted text for UI
 */
export function formatSuggestionsText(suggestions) {
    if (suggestions.length === 0) {
        return 'Keine Vorschläge verfügbar'
    }
    
    const top = suggestions[0]
    return `Empfohlen: ${top.name} - ${top.reason}`
}

export default {
    WORKFLOW_PATTERNS,
    NEXT_NODE_SUGGESTIONS,
    getAutoCompleteSuggestions,
    getPatternSuggestions,
    formatSuggestionsText,
    analyzeWorkflowContext
}
