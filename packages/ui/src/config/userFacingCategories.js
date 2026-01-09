/**
 * User-Facing Category Mapping
 * 
 * Dieses Modul übersetzt technische Node-Kategorien in benutzerfreundliche,
 * anwendungsfall-orientierte Kategorien gemäß dem Design-Dokument für
 * die UI-Vereinfachung.
 * 
 * Ziel: Nutzer denken in Zielen und Anwendungsfällen, nicht in technischen Kategorien.
 */

// Icons für die neuen Kategorien
import {
    IconMessageCircle,
    IconBook,
    IconRocket,
    IconPhone,
    IconPencil,
    IconSettings,
    IconDatabase,
    IconAdjustments
} from '@tabler/icons-react'

/**
 * Mapping von technischen Kategorien zu benutzerfreundlichen Kategorien
 */
export const USER_FACING_CATEGORIES = {
    // Gespräche führen - Agenten, die Konversationen führen können
    conversations: {
        id: 'conversations',
        title: 'Gespräche führen',
        description: 'Agenten, die Konversationen führen können',
        icon: IconMessageCircle,
        color: '#4CAF50',
        technicalCategories: [
            'Agents',
            'Chat Models',
            'Sequential Agents',
            'Multi Agents',
            'Agent Flows'
        ],
        order: 1
    },
    
    // Wissen nutzen - Auf Dokumente und Daten zugreifen
    knowledge: {
        id: 'knowledge',
        title: 'Wissen nutzen',
        description: 'Auf Dokumente und Daten zugreifen',
        icon: IconBook,
        color: '#2196F3',
        technicalCategories: [
            'Document Loaders',
            'Vector Stores',
            'Retrievers',
            'Memory',
            'Embeddings',
            'Text Splitters',
            'Record Manager'
        ],
        order: 2
    },
    
    // Aufgaben erledigen - Aktionen ausführen und externe Systeme steuern
    tasks: {
        id: 'tasks',
        title: 'Aufgaben erledigen',
        description: 'Aktionen ausführen und externe Systeme steuern',
        icon: IconRocket,
        color: '#FF9800',
        technicalCategories: [
            'Tools',
            'Utilities',
            'Chains'
        ],
        order: 3
    },
    
    // Anrufe verwalten - Voice-Agenten für Telefongespräche
    voice: {
        id: 'voice',
        title: 'Anrufe verwalten',
        description: 'Voice-Agenten für Telefongespräche',
        icon: IconPhone,
        color: '#9C27B0',
        technicalCategories: [
            'Voice',
            'Speech to Text',
            'M.A.T.E. Voice'
        ],
        order: 4
    },
    
    // Inhalte erstellen - Texte, Zusammenfassungen, Übersetzungen generieren
    content: {
        id: 'content',
        title: 'Inhalte erstellen',
        description: 'Texte, Zusammenfassungen, Übersetzungen generieren',
        icon: IconPencil,
        color: '#E91E63',
        technicalCategories: [
            'LLMs',
            'Output Parsers',
            'Response Synthesizer',
            'Prompts'
        ],
        order: 5
    },
    
    // Analytik - Analyse und Überwachung
    analytics: {
        id: 'analytics',
        title: 'Analysieren',
        description: 'Analyse und Überwachung der Agent-Leistung',
        icon: IconDatabase,
        color: '#607D8B',
        technicalCategories: [
            'Analytic',
            'Cache',
            'Moderation'
        ],
        order: 6
    },
    
    // Sonstiges - Konfiguration und erweiterte Funktionen
    advanced: {
        id: 'advanced',
        title: 'Erweitert',
        description: 'Konfiguration und erweiterte Funktionen',
        icon: IconAdjustments,
        color: '#795548',
        technicalCategories: [
            'Engine'
        ],
        order: 7
    }
}

/**
 * Reverse-Mapping: Technische Kategorie -> User-Facing Kategorie
 */
export const TECHNICAL_TO_USER_FACING = {}
Object.entries(USER_FACING_CATEGORIES).forEach(([key, value]) => {
    value.technicalCategories.forEach((techCat) => {
        TECHNICAL_TO_USER_FACING[techCat] = key
    })
})

/**
 * Ermittelt die benutzerfreundliche Kategorie für eine technische Kategorie
 * @param {string} technicalCategory - Die technische Kategorie
 * @returns {object} Die benutzerfreundliche Kategorie-Information
 */
export const getUserFacingCategory = (technicalCategory) => {
    const userFacingKey = TECHNICAL_TO_USER_FACING[technicalCategory]
    if (userFacingKey) {
        return USER_FACING_CATEGORIES[userFacingKey]
    }
    // Fallback: Wenn keine Zuordnung gefunden, verwende 'advanced'
    return USER_FACING_CATEGORIES.advanced
}

/**
 * Gruppiert Nodes nach benutzerfreundlichen Kategorien
 * @param {Array} nodes - Array von Node-Objekten
 * @returns {Object} Nodes gruppiert nach benutzerfreundlichen Kategorien
 */
export const groupNodesByUserFacingCategory = (nodes) => {
    const grouped = {}
    
    // Initialisiere alle Kategorien
    Object.keys(USER_FACING_CATEGORIES).forEach((key) => {
        grouped[key] = {
            ...USER_FACING_CATEGORIES[key],
            nodes: []
        }
    })
    
    // Gruppiere Nodes
    nodes.forEach((node) => {
        const userFacingKey = TECHNICAL_TO_USER_FACING[node.category]
        if (userFacingKey && grouped[userFacingKey]) {
            grouped[userFacingKey].nodes.push(node)
        } else {
            // Fallback zu 'advanced'
            grouped.advanced.nodes.push(node)
        }
    })
    
    // Sortiere nach order und filtere leere Kategorien
    return Object.values(grouped)
        .filter((cat) => cat.nodes.length > 0)
        .sort((a, b) => a.order - b.order)
}

/**
 * Beispiel-Nutzereingaben und deren Mapping zu Nodes
 * Für die intelligente Suche / NLP-basierte Node-Auswahl
 */
export const SEARCH_SUGGESTIONS = {
    'dokumente durchsuchen': ['Retriever', 'Vector Store'],
    'mit kunden chatten': ['Chat Model', 'Agent'],
    'e-mail senden': ['Tool'],
    'webseite aufrufen': ['Tool', 'Document Loader'],
    'erinnerung speichern': ['Memory'],
    'zusammenfassung erstellen': ['LLM', 'Output Parser'],
    'dokumente hochladen': ['Document Loader'],
    'datenbank abfragen': ['Tool', 'Vector Store'],
    'api aufrufen': ['Tool'],
    'text analysieren': ['LLM', 'Output Parser'],
    'konversation speichern': ['Memory'],
    'anruf entgegennehmen': ['Voice'],
    'termin vereinbaren': ['Tool', 'Agent']
}

/**
 * Labels für die Schwierigkeitsgrade
 */
export const DIFFICULTY_LABELS = {
    easy: {
        label: 'Einfach',
        color: '#4CAF50',
        description: 'Für Einsteiger geeignet'
    },
    medium: {
        label: 'Fortgeschritten',
        color: '#FF9800',
        description: 'Grundkenntnisse erforderlich'
    },
    expert: {
        label: 'Experte',
        color: '#F44336',
        description: 'Für erfahrene Nutzer'
    }
}

/**
 * Mapping von benutzerfreundlichen Titeln zurück zu Kategorie-Metadaten
 * Für die Anzeige von Icons und Beschreibungen im UI
 */
export const USER_FACING_BY_TITLE = {}
Object.values(USER_FACING_CATEGORIES).forEach((cat) => {
    USER_FACING_BY_TITLE[cat.title] = cat
})

/**
 * Holt Kategorie-Metadaten anhand des Titels
 * @param {string} title - Der benutzerfreundliche Titel
 * @returns {object|null} Die Kategorie-Metadaten oder null
 */
export const getCategoryMetaByTitle = (title) => {
    return USER_FACING_BY_TITLE[title] || null
}

export default USER_FACING_CATEGORIES
