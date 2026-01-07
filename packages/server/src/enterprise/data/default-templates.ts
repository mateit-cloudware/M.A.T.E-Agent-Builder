/**
 * M.A.T.E. Default Workflow Templates
 * 
 * Phase 3.3.2: Vorgefertigte Templates für häufige Use Cases
 * 
 * Enthält: Termin buchen, Support-Ticket, FAQ-Bot
 */

import { TemplateCategory, TemplateComplexity } from '../database/entities/workflow-template.entity'

/**
 * Template 1: Terminbuchung per Telefon
 * 
 * Flow: VAPI Trigger → KI sammelt Infos → Bestätigung → Speicherung
 */
export const APPOINTMENT_BOOKING_TEMPLATE = {
    name: 'Terminbuchung per Telefon',
    description: 'Intelligenter Telefon-Assistent zur automatischen Terminvereinbarung',
    category: TemplateCategory.VOICE_AGENT,
    complexity: TemplateComplexity.INTERMEDIATE,
    icon: '📅',
    color: '#3b82f6',
    tags: ['termin', 'buchung', 'telefon', 'vapi', 'kalender'],
    useCase: `Automatisierte Terminbuchung über Telefon. Der KI-Assistent:
- Begrüßt den Anrufer freundlich
- Fragt Name, Terminwunsch und Kontaktdaten ab
- Prüft Verfügbarkeit
- Bestätigt den Termin
- Sendet Bestätigungs-SMS

Perfekt für: Arztpraxen, Friseure, Beratungsdienste, Service-Unternehmen`,
    
    setupInstructions: `1. VAPI-Telefonnummer verbinden
2. System-Prompt anpassen (Öffnungszeiten, Terminarten)
3. Kalender-Integration konfigurieren (optional)
4. SMS-Versand einrichten (optional)
5. Testen mit Test-Anruf`,
    
    requiredNodeTypes: ['vapiVoiceTrigger', 'chatOpenAI', 'bufferMemory', 'conditionAgent', 'vapiSpeak'],
    estimatedSetupMinutes: 15,
    isFeatured: true,
    
    flowData: JSON.stringify({
        nodes: [
            {
                id: 'vapi_trigger_0',
                type: 'agentFlow',
                position: { x: 100, y: 100 },
                data: {
                    name: 'vapiVoiceTrigger',
                    label: 'Telefonanruf',
                    category: 'trigger',
                    inputs: {},
                    inputAnchors: [],
                    outputAnchors: [{ id: 'vapi_trigger_0-output', name: 'output', label: 'Output' }]
                }
            },
            {
                id: 'ai_assistant_0',
                type: 'agentFlow',
                position: { x: 400, y: 100 },
                data: {
                    name: 'chatOpenAI',
                    label: 'Termin-Assistent',
                    category: 'ai',
                    inputs: {
                        systemMessage: `Du bist ein freundlicher Termin-Buchungs-Assistent.

Deine Aufgabe:
1. Begrüße den Anrufer höflich
2. Frage nach: Name, gewünschtes Datum/Uhrzeit, Grund des Termins
3. Prüfe Verfügbarkeit (Öffnungszeiten: Mo-Fr 9-18 Uhr)
4. Bestätige den Termin
5. Frage nach Telefonnummer für Rückruf

Verfügbare Terminarten:
- Beratungsgespräch (30 min)
- Ersttermin (60 min)
- Folgetermin (30 min)

Sei empathisch, geduldig und stelle klare Fragen.`
                    },
                    inputAnchors: [{ id: 'ai_assistant_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: [{ id: 'ai_assistant_0-output', name: 'output', label: 'Output' }]
                }
            },
            {
                id: 'memory_0',
                type: 'agentFlow',
                position: { x: 400, y: 250 },
                data: {
                    name: 'bufferMemory',
                    label: 'Gesprächsspeicher',
                    category: 'data',
                    inputs: {},
                    inputAnchors: [{ id: 'memory_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: [{ id: 'memory_0-output', name: 'output', label: 'Output' }]
                }
            },
            {
                id: 'condition_0',
                type: 'agentFlow',
                position: { x: 700, y: 100 },
                data: {
                    name: 'conditionAgent',
                    label: 'Termin verfügbar?',
                    category: 'logic',
                    inputs: {
                        condition: 'Prüfe ob alle Informationen vorhanden sind: Name, Datum, Uhrzeit, Telefonnummer'
                    },
                    inputAnchors: [{ id: 'condition_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: [
                        { id: 'condition_0-yes', name: 'yes', label: 'Ja' },
                        { id: 'condition_0-no', name: 'no', label: 'Nein' }
                    ]
                }
            },
            {
                id: 'speak_confirm_0',
                type: 'agentFlow',
                position: { x: 1000, y: 50 },
                data: {
                    name: 'vapiSpeak',
                    label: 'Bestätigung',
                    category: 'action',
                    inputs: {
                        message: 'Perfekt! Ich habe Ihren Termin notiert. Sie erhalten gleich eine SMS zur Bestätigung. Vielen Dank für Ihren Anruf!'
                    },
                    inputAnchors: [{ id: 'speak_confirm_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: []
                }
            },
            {
                id: 'speak_retry_0',
                type: 'agentFlow',
                position: { x: 1000, y: 200 },
                data: {
                    name: 'vapiSpeak',
                    label: 'Weitere Infos benötigt',
                    category: 'action',
                    inputs: {
                        message: 'Ich benötige noch einige Informationen. Könnten Sie mir bitte helfen?'
                    },
                    inputAnchors: [{ id: 'speak_retry_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: []
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'vapi_trigger_0', target: 'ai_assistant_0', sourceHandle: 'vapi_trigger_0-output', targetHandle: 'ai_assistant_0-input' },
            { id: 'e2', source: 'ai_assistant_0', target: 'memory_0', sourceHandle: 'ai_assistant_0-output', targetHandle: 'memory_0-input' },
            { id: 'e3', source: 'ai_assistant_0', target: 'condition_0', sourceHandle: 'ai_assistant_0-output', targetHandle: 'condition_0-input' },
            { id: 'e4', source: 'condition_0', target: 'speak_confirm_0', sourceHandle: 'condition_0-yes', targetHandle: 'speak_confirm_0-input' },
            { id: 'e5', source: 'condition_0', target: 'speak_retry_0', sourceHandle: 'condition_0-no', targetHandle: 'speak_retry_0-input' }
        ]
    })
}

/**
 * Template 2: Support-Ticket Erstellung
 * 
 * Flow: VAPI Trigger → Problemerfassung → Kategorisierung → Ticket
 */
export const SUPPORT_TICKET_TEMPLATE = {
    name: 'Support-Ticket per Telefon',
    description: 'Automatische Erfassung und Kategorisierung von Support-Anfragen',
    category: TemplateCategory.SUPPORT,
    complexity: TemplateComplexity.INTERMEDIATE,
    icon: '🎫',
    color: '#22c55e',
    tags: ['support', 'ticket', 'helpdesk', 'kundenservice'],
    useCase: `Automatisierte Support-Ticket-Erstellung über Telefon. Der Assistent:
- Nimmt das Problem auf
- Stellt gezielte Fragen zur Problemanalyse
- Kategorisiert die Anfrage automatisch
- Erstellt Ticket mit allen Details
- Gibt Ticket-Nummer aus

Perfekt für: IT-Support, Kundenservice, Helpdesk, technischer Support`,
    
    setupInstructions: `1. VAPI-Telefonnummer einrichten
2. Ticket-Kategorien im System-Prompt definieren
3. Ticket-System-API verbinden (optional)
4. E-Mail-Benachrichtigung konfigurieren
5. Mit Test-Anruf validieren`,
    
    requiredNodeTypes: ['vapiVoiceTrigger', 'chatOpenAI', 'conditionAgent', 'vapiSpeak'],
    estimatedSetupMinutes: 20,
    isFeatured: true,
    
    flowData: JSON.stringify({
        nodes: [
            {
                id: 'vapi_trigger_1',
                type: 'agentFlow',
                position: { x: 100, y: 150 },
                data: {
                    name: 'vapiVoiceTrigger',
                    label: 'Support-Anruf',
                    category: 'trigger',
                    inputs: {},
                    inputAnchors: [],
                    outputAnchors: [{ id: 'vapi_trigger_1-output', name: 'output', label: 'Output' }]
                }
            },
            {
                id: 'ai_support_0',
                type: 'agentFlow',
                position: { x: 400, y: 150 },
                data: {
                    name: 'chatOpenAI',
                    label: 'Support-Agent',
                    category: 'ai',
                    inputs: {
                        systemMessage: `Du bist ein professioneller Support-Agent.

Deine Aufgabe:
1. Begrüße den Anrufer: "Support-Hotline, wie kann ich helfen?"
2. Erfasse das Problem detailliert:
   - Was funktioniert nicht?
   - Seit wann besteht das Problem?
   - Welche Fehlermeldungen gibt es?
   - Welches Produkt/Service ist betroffen?
3. Frage nach Kundennummer oder E-Mail
4. Kategorisiere das Problem:
   - TECHNISCH: System-/Software-Probleme
   - ABRECHNUNG: Rechnungs-/Zahlungsfragen
   - PRODUKT: Produkt-/Feature-Fragen
   - DRINGEND: Kritische Ausfälle

Sei geduldig, empathisch und lösungsorientiert.`
                    },
                    inputAnchors: [{ id: 'ai_support_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: [{ id: 'ai_support_0-output', name: 'output', label: 'Output' }]
                }
            },
            {
                id: 'categorize_0',
                type: 'agentFlow',
                position: { x: 700, y: 150 },
                data: {
                    name: 'conditionAgent',
                    label: 'Kategorisierung',
                    category: 'logic',
                    inputs: {
                        condition: 'Kategorisiere nach: TECHNISCH, ABRECHNUNG, PRODUKT, DRINGEND'
                    },
                    inputAnchors: [{ id: 'categorize_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: [
                        { id: 'categorize_0-tech', name: 'tech', label: 'Technisch' },
                        { id: 'categorize_0-billing', name: 'billing', label: 'Abrechnung' },
                        { id: 'categorize_0-product', name: 'product', label: 'Produkt' },
                        { id: 'categorize_0-urgent', name: 'urgent', label: 'Dringend' }
                    ]
                }
            },
            {
                id: 'speak_tech_0',
                type: 'agentFlow',
                position: { x: 1000, y: 50 },
                data: {
                    name: 'vapiSpeak',
                    label: 'Tech-Ticket',
                    category: 'action',
                    inputs: {
                        message: 'Ich habe ein technisches Support-Ticket für Sie erstellt. Ticket-Nummer: TECH-{ticketId}. Unser Tech-Team meldet sich innerhalb von 4 Stunden.'
                    },
                    inputAnchors: [{ id: 'speak_tech_0-input', name: 'input', label: 'Input' }]
                }
            },
            {
                id: 'speak_urgent_0',
                type: 'agentFlow',
                position: { x: 1000, y: 250 },
                data: {
                    name: 'vapiSpeak',
                    label: 'Dringend-Ticket',
                    category: 'action',
                    inputs: {
                        message: 'Ich verstehe, dass dies dringend ist. Ticket URGENT-{ticketId} erstellt. Ein Spezialist wird Sie SOFORT zurückrufen.'
                    },
                    inputAnchors: [{ id: 'speak_urgent_0-input', name: 'input', label: 'Input' }]
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'vapi_trigger_1', target: 'ai_support_0', sourceHandle: 'vapi_trigger_1-output', targetHandle: 'ai_support_0-input' },
            { id: 'e2', source: 'ai_support_0', target: 'categorize_0', sourceHandle: 'ai_support_0-output', targetHandle: 'categorize_0-input' },
            { id: 'e3', source: 'categorize_0', target: 'speak_tech_0', sourceHandle: 'categorize_0-tech', targetHandle: 'speak_tech_0-input' },
            { id: 'e4', source: 'categorize_0', target: 'speak_urgent_0', sourceHandle: 'categorize_0-urgent', targetHandle: 'speak_urgent_0-input' }
        ]
    })
}

/**
 * Template 3: FAQ-Bot
 * 
 * Flow: VAPI Trigger → FAQ-KI → Antwort
 */
export const FAQ_BOT_TEMPLATE = {
    name: 'FAQ-Bot',
    description: 'Beantwortet häufig gestellte Fragen automatisch per Telefon',
    category: TemplateCategory.CHATBOT,
    complexity: TemplateComplexity.BEGINNER,
    icon: '❓',
    color: '#8b5cf6',
    tags: ['faq', 'fragen', 'chatbot', 'info', 'auskunft'],
    useCase: `Einfacher FAQ-Bot für Telefon. Beantwortet automatisch:
- Öffnungszeiten
- Preise und Konditionen
- Standorte und Anfahrt
- Produkt-Informationen
- Kontaktmöglichkeiten

Leitet bei Bedarf an menschlichen Mitarbeiter weiter.

Perfekt für: Geschäfte, Restaurants, Dienstleister, Informations-Hotlines`,
    
    setupInstructions: `1. VAPI-Telefonnummer verbinden
2. FAQ-Datenbank im System-Prompt hinterlegen
3. Öffnungszeiten und Kontaktdaten eintragen
4. Weiterleitung an Mitarbeiter konfigurieren (optional)
5. Mit typischen Fragen testen`,
    
    requiredNodeTypes: ['vapiVoiceTrigger', 'chatOpenAI', 'conditionAgent', 'vapiSpeak'],
    estimatedSetupMinutes: 10,
    isFeatured: true,
    
    flowData: JSON.stringify({
        nodes: [
            {
                id: 'vapi_trigger_2',
                type: 'agentFlow',
                position: { x: 100, y: 150 },
                data: {
                    name: 'vapiVoiceTrigger',
                    label: 'Info-Hotline',
                    category: 'trigger',
                    inputs: {},
                    inputAnchors: [],
                    outputAnchors: [{ id: 'vapi_trigger_2-output', name: 'output', label: 'Output' }]
                }
            },
            {
                id: 'ai_faq_0',
                type: 'agentFlow',
                position: { x: 400, y: 150 },
                data: {
                    name: 'chatOpenAI',
                    label: 'FAQ-Assistent',
                    category: 'ai',
                    inputs: {
                        systemMessage: `Du bist ein freundlicher Info-Assistent.

Beantworte diese häufigen Fragen:

ÖFFNUNGSZEITEN:
Mo-Fr: 9:00 - 18:00 Uhr
Sa: 10:00 - 14:00 Uhr
So: Geschlossen

STANDORT:
Musterstraße 123
12345 Musterstadt
Parkplätze vorhanden

KONTAKT:
Telefon: 0123-456789
E-Mail: info@beispiel.de
Website: www.beispiel.de

PREISE:
- Basis: 29€/Monat
- Premium: 49€/Monat
- Enterprise: auf Anfrage

Wenn du die Frage nicht beantworten kannst, sage:
"Dafür verbinde ich Sie gern mit einem Mitarbeiter."

Sei kurz, klar und freundlich.`
                    },
                    inputAnchors: [{ id: 'ai_faq_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: [{ id: 'ai_faq_0-output', name: 'output', label: 'Output' }]
                }
            },
            {
                id: 'can_answer_0',
                type: 'agentFlow',
                position: { x: 700, y: 150 },
                data: {
                    name: 'conditionAgent',
                    label: 'Frage beantwortet?',
                    category: 'logic',
                    inputs: {
                        condition: 'Konnte die Frage beantwortet werden?'
                    },
                    inputAnchors: [{ id: 'can_answer_0-input', name: 'input', label: 'Input' }],
                    outputAnchors: [
                        { id: 'can_answer_0-yes', name: 'yes', label: 'Ja' },
                        { id: 'can_answer_0-no', name: 'no', label: 'Nein' }
                    ]
                }
            },
            {
                id: 'speak_answered_0',
                type: 'agentFlow',
                position: { x: 1000, y: 100 },
                data: {
                    name: 'vapiSpeak',
                    label: 'Frage beantwortet',
                    category: 'action',
                    inputs: {
                        message: 'Gerne! Kann ich Ihnen noch mit etwas anderem helfen?'
                    },
                    inputAnchors: [{ id: 'speak_answered_0-input', name: 'input', label: 'Input' }]
                }
            },
            {
                id: 'speak_transfer_0',
                type: 'agentFlow',
                position: { x: 1000, y: 200 },
                data: {
                    name: 'vapiSpeak',
                    label: 'Weiterleitung',
                    category: 'action',
                    inputs: {
                        message: 'Einen Moment bitte, ich verbinde Sie mit einem Mitarbeiter.'
                    },
                    inputAnchors: [{ id: 'speak_transfer_0-input', name: 'input', label: 'Input' }]
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'vapi_trigger_2', target: 'ai_faq_0', sourceHandle: 'vapi_trigger_2-output', targetHandle: 'ai_faq_0-input' },
            { id: 'e2', source: 'ai_faq_0', target: 'can_answer_0', sourceHandle: 'ai_faq_0-output', targetHandle: 'can_answer_0-input' },
            { id: 'e3', source: 'can_answer_0', target: 'speak_answered_0', sourceHandle: 'can_answer_0-yes', targetHandle: 'speak_answered_0-input' },
            { id: 'e4', source: 'can_answer_0', target: 'speak_transfer_0', sourceHandle: 'can_answer_0-no', targetHandle: 'speak_transfer_0-input' }
        ]
    })
}

/**
 * All default templates
 */
export const DEFAULT_TEMPLATES = [
    APPOINTMENT_BOOKING_TEMPLATE,
    SUPPORT_TICKET_TEMPLATE,
    FAQ_BOT_TEMPLATE
]

export default DEFAULT_TEMPLATES
