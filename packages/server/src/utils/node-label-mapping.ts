/**
 * M.A.T.E. Node Label Mapping Service
 * 
 * Phase 3.1.1: Natürlichsprachige Node-Labels
 * 
 * Übersetzt technische Node-Namen in benutzerfreundliche deutsche Labels
 * für ein verbessertes No-Code-Interface
 */

export interface NodeLabelMapping {
    technicalName: string
    displayName: string
    category: string
    icon?: string
    color?: string
    description: string
}

/**
 * Mapping von technischen Node-Namen zu natürlichsprachigen deutschen Labels
 * 
 * Kategorien:
 * - trigger: Auslöser/Eingänge (📞 Blau)
 * - action: Aktionen/Ausgänge (🗣️ Grün)
 * - logic: Logik/Steuerung (⚡ Gelb)
 * - ai: KI-Modelle (🤖 Lila)
 * - data: Datenverarbeitung (📊 Orange)
 * - tool: Werkzeuge (🔧 Grau)
 */
export const NODE_LABEL_MAPPINGS: Record<string, NodeLabelMapping> = {
    // ==================== TRIGGER/INPUT NODES ====================
    'startAgentflow': {
        technicalName: 'startAgentflow',
        displayName: 'Start',
        category: 'trigger',
        icon: '▶️',
        color: '#3b82f6',
        description: 'Startpunkt des Workflows'
    },
    'vapiVoiceTrigger': {
        technicalName: 'vapiVoiceTrigger',
        displayName: 'Telefonanruf',
        category: 'trigger',
        icon: '📞',
        color: '#3b82f6',
        description: 'Eingehender Anruf über VAPI'
    },
    'webhookTrigger': {
        technicalName: 'webhookTrigger',
        displayName: 'Webhook-Eingang',
        category: 'trigger',
        icon: '🌐',
        color: '#3b82f6',
        description: 'Externe System-Benachrichtigung'
    },
    'formInput': {
        technicalName: 'formInput',
        displayName: 'Formular-Eingabe',
        category: 'trigger',
        icon: '📝',
        color: '#3b82f6',
        description: 'Strukturierte Nutzer-Eingabe'
    },
    
    // ==================== AI/LLM NODES ====================
    'chatOpenAI': {
        technicalName: 'chatOpenAI',
        displayName: 'KI-Assistent',
        category: 'ai',
        icon: '🤖',
        color: '#8b5cf6',
        description: 'Intelligente Konversation mit KI'
    },
    'chatAnthropic': {
        technicalName: 'chatAnthropic',
        displayName: 'Claude KI',
        category: 'ai',
        icon: '🧠',
        color: '#8b5cf6',
        description: 'Anthropic Claude Modell'
    },
    'chatGoogleGenerativeAI': {
        technicalName: 'chatGoogleGenerativeAI',
        displayName: 'Gemini KI',
        category: 'ai',
        icon: '✨',
        color: '#8b5cf6',
        description: 'Google Gemini Modell'
    },
    'llmChain': {
        technicalName: 'llmChain',
        displayName: 'KI-Kette',
        category: 'ai',
        icon: '⛓️',
        color: '#8b5cf6',
        description: 'Verkettete KI-Anfragen'
    },
    'conversationChain': {
        technicalName: 'conversationChain',
        displayName: 'Gesprächsführung',
        category: 'ai',
        icon: '💬',
        color: '#8b5cf6',
        description: 'KI mit Konversations-Gedächtnis'
    },
    
    // ==================== LOGIC/CONTROL NODES ====================
    'conditionAgent': {
        technicalName: 'conditionAgent',
        displayName: 'Wenn-Dann-Verzweigung',
        category: 'logic',
        icon: '🔀',
        color: '#eab308',
        description: 'Bedingungsbasierte Verzweigung'
    },
    'seqConditionAgent': {
        technicalName: 'seqConditionAgent',
        displayName: 'Entscheidungslogik',
        category: 'logic',
        icon: '⚡',
        color: '#eab308',
        description: 'KI-gesteuerte Entscheidung'
    },
    'ifElse': {
        technicalName: 'ifElse',
        displayName: 'Ja/Nein-Weiche',
        category: 'logic',
        icon: '🚦',
        color: '#eab308',
        description: 'Einfache Ja/Nein-Entscheidung'
    },
    'switch': {
        technicalName: 'switch',
        displayName: 'Mehrfach-Auswahl',
        category: 'logic',
        icon: '🎯',
        color: '#eab308',
        description: 'Mehrere Verzweigungen'
    },
    'loop': {
        technicalName: 'loop',
        displayName: 'Wiederholung',
        category: 'logic',
        icon: '🔄',
        color: '#eab308',
        description: 'Schleife für wiederholte Aktionen'
    },
    
    // ==================== ACTION/OUTPUT NODES ====================
    'vapiVoiceResponse': {
        technicalName: 'vapiVoiceResponse',
        displayName: 'Sprach-Antwort',
        category: 'action',
        icon: '🗣️',
        color: '#22c55e',
        description: 'Sprachausgabe via VAPI'
    },
    'sendEmail': {
        technicalName: 'sendEmail',
        displayName: 'E-Mail versenden',
        category: 'action',
        icon: '📧',
        color: '#22c55e',
        description: 'E-Mail an Empfänger senden'
    },
    'sendSMS': {
        technicalName: 'sendSMS',
        displayName: 'SMS versenden',
        category: 'action',
        icon: '💬',
        color: '#22c55e',
        description: 'Textnachricht senden'
    },
    'apiRequest': {
        technicalName: 'apiRequest',
        displayName: 'API-Anfrage',
        category: 'action',
        icon: '🌐',
        color: '#22c55e',
        description: 'Externes System ansprechen'
    },
    'databaseWrite': {
        technicalName: 'databaseWrite',
        displayName: 'Daten speichern',
        category: 'action',
        icon: '💾',
        color: '#22c55e',
        description: 'In Datenbank schreiben'
    },
    
    // ==================== DATA PROCESSING NODES ====================
    'textSplitter': {
        technicalName: 'textSplitter',
        displayName: 'Text aufteilen',
        category: 'data',
        icon: '✂️',
        color: '#f97316',
        description: 'Text in Abschnitte teilen'
    },
    'documentLoader': {
        technicalName: 'documentLoader',
        displayName: 'Dokument laden',
        category: 'data',
        icon: '📄',
        color: '#f97316',
        description: 'Datei oder URL einlesen'
    },
    'openAIEmbeddings': {
        technicalName: 'openAIEmbeddings',
        displayName: 'Vektorisierung',
        category: 'data',
        icon: '📊',
        color: '#f97316',
        description: 'Text in Vektoren umwandeln'
    },
    'pineconeStore': {
        technicalName: 'pineconeStore',
        displayName: 'Vektor-Datenbank',
        category: 'data',
        icon: '🗄️',
        color: '#f97316',
        description: 'Vektoren speichern und suchen'
    },
    'retrieverTool': {
        technicalName: 'retrieverTool',
        displayName: 'Dokument-Suche',
        category: 'data',
        icon: '🔍',
        color: '#f97316',
        description: 'Relevante Dokumente finden'
    },
    
    // ==================== TOOL NODES ====================
    'calculator': {
        technicalName: 'calculator',
        displayName: 'Rechner',
        category: 'tool',
        icon: '🔢',
        color: '#6b7280',
        description: 'Mathematische Berechnungen'
    },
    'webBrowser': {
        technicalName: 'webBrowser',
        displayName: 'Web-Suche',
        category: 'tool',
        icon: '🌍',
        color: '#6b7280',
        description: 'Internet durchsuchen'
    },
    'customTool': {
        technicalName: 'customTool',
        displayName: 'Eigenes Werkzeug',
        category: 'tool',
        icon: '🔧',
        color: '#6b7280',
        description: 'Benutzerdefinierte Funktion'
    },
    'executeFlow': {
        technicalName: 'executeFlow',
        displayName: 'Sub-Flow ausführen',
        category: 'tool',
        icon: '📦',
        color: '#6b7280',
        description: 'Anderen Workflow aufrufen'
    },
    'humanInput': {
        technicalName: 'humanInput',
        displayName: 'Nutzer-Rückfrage',
        category: 'tool',
        icon: '🙋',
        color: '#6b7280',
        description: 'Nutzer um Eingabe bitten'
    }
}

/**
 * Category Information für UI-Rendering
 */
export const CATEGORY_INFO = {
    trigger: {
        label: 'Auslöser',
        icon: '▶️',
        color: '#3b82f6',
        description: 'Startet den Workflow'
    },
    ai: {
        label: 'KI-Modelle',
        icon: '🤖',
        color: '#8b5cf6',
        description: 'Intelligente Verarbeitung'
    },
    logic: {
        label: 'Logik',
        icon: '⚡',
        color: '#eab308',
        description: 'Entscheidungen und Verzweigungen'
    },
    action: {
        label: 'Aktionen',
        icon: '🗣️',
        color: '#22c55e',
        description: 'Ausgaben und Aktionen'
    },
    data: {
        label: 'Daten',
        icon: '📊',
        color: '#f97316',
        description: 'Datenverarbeitung'
    },
    tool: {
        label: 'Werkzeuge',
        icon: '🔧',
        color: '#6b7280',
        description: 'Hilfsfunktionen'
    }
}

/**
 * Get display name for a node
 */
export function getNodeDisplayName(technicalName: string): string {
    return NODE_LABEL_MAPPINGS[technicalName]?.displayName || technicalName
}

/**
 * Get node category
 */
export function getNodeCategory(technicalName: string): string {
    return NODE_LABEL_MAPPINGS[technicalName]?.category || 'tool'
}

/**
 * Get node icon
 */
export function getNodeIcon(technicalName: string): string {
    return NODE_LABEL_MAPPINGS[technicalName]?.icon || '❓'
}

/**
 * Get node color
 */
export function getNodeColor(technicalName: string): string {
    return NODE_LABEL_MAPPINGS[technicalName]?.color || '#6b7280'
}

/**
 * Get all nodes grouped by category
 */
export function getNodesByCategory(): Record<string, NodeLabelMapping[]> {
    const grouped: Record<string, NodeLabelMapping[]> = {}
    
    for (const mapping of Object.values(NODE_LABEL_MAPPINGS)) {
        if (!grouped[mapping.category]) {
            grouped[mapping.category] = []
        }
        grouped[mapping.category].push(mapping)
    }
    
    return grouped
}

/**
 * Search nodes by display name or description
 */
export function searchNodes(query: string): NodeLabelMapping[] {
    const lowerQuery = query.toLowerCase()
    
    return Object.values(NODE_LABEL_MAPPINGS).filter(
        mapping => 
            mapping.displayName.toLowerCase().includes(lowerQuery) ||
            mapping.description.toLowerCase().includes(lowerQuery)
    )
}
