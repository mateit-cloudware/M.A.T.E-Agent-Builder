/**
 * M.A.T.E. Agent Generator Service
 * 
 * KI-gestützte automatische Erstellung von Agenten basierend auf
 * Benutzerbeschreibungen. Nutzt LLM um passende Flow-Konfigurationen
 * zu generieren.
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import logger from '../../utils/logger'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

// Types
export interface AgentGeneratorRequest {
    description: string
    preferredType?: 'voice' | 'chat' | 'hybrid' | 'auto'
    language: 'de' | 'en'
    industry?: string
    features?: string[]
    userId: string
}

export interface NodeConfig {
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, any>
}

export interface EdgeConfig {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
}

export interface GeneratedAgentConfig {
    name: string
    description: string
    systemPrompt: string
    nodes: NodeConfig[]
    edges: EdgeConfig[]
}

export interface AgentRecommendation {
    type: 'agentflow' | 'chatflow' | 'assistant'
    reasoning: string
    confidence: number
}

export interface GeneratedAgent {
    recommendation: AgentRecommendation
    config: GeneratedAgentConfig
    suggestedIntegrations: string[]
    estimatedSetupTime: string
    quickStartTips: string[]
}

// System Prompt für Agent-Generierung
const AGENT_GENERATOR_SYSTEM_PROMPT = `Du bist ein Experte für die Erstellung von KI-Agenten auf der M.A.T.E. Plattform.

Deine Aufgabe ist es, basierend auf der Benutzerbeschreibung einen passenden Agenten zu konfigurieren.

VERFÜGBARE AGENT-TYPEN:
1. "agentflow" - Für Voice-Agenten mit VAPI-Integration (Telefonanrufe)
2. "chatflow" - Für Chat-Agenten (Website-Chat, API)
3. "assistant" - Für OpenAI Assistenten mit Datei-Upload

VERFÜGBARE NODE-TYPEN für agentflow/chatflow:
- chatOpenAI: OpenAI Chat-Modell
- openAIEmbeddings: Embeddings für RAG
- vapiVoiceTrigger: VAPI Voice-Eingang (nur agentflow)
- vapiVoiceResponse: VAPI Voice-Ausgang (nur agentflow)
- conversationChain: Einfache Konversation
- retrieverTool: Dokument-Suche
- calculator: Berechnungen
- customTool: Benutzerdefinierte Werkzeuge

REGELN:
1. Wähle den passenden Agent-Typ basierend auf dem Anwendungsfall
2. Voice-Agenten (Telefon) -> agentflow mit VAPI-Nodes
3. Chat-Agenten (Website) -> chatflow
4. Erstelle sinnvolle System-Prompts auf Deutsch
5. Positioniere Nodes logisch (Start links, Ende rechts)

Antworte NUR mit validem JSON im folgenden Format:
{
    "recommendation": {
        "type": "agentflow|chatflow|assistant",
        "reasoning": "Begründung auf Deutsch",
        "confidence": 0.0-1.0
    },
    "config": {
        "name": "Agent-Name",
        "description": "Kurze Beschreibung",
        "systemPrompt": "Detaillierter System-Prompt...",
        "nodes": [...],
        "edges": [...]
    },
    "suggestedIntegrations": ["calendar", "crm", ...],
    "estimatedSetupTime": "ca. X Minuten",
    "quickStartTips": ["Tipp 1", "Tipp 2"]
}`

export class AgentGeneratorService {
    private llm: ChatOpenAI | null = null

    constructor() {
        this.initializeLLM()
    }

    private initializeLLM() {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
        
        if (!apiKey) {
            logger.warn('[AgentGenerator] No API key found for LLM')
            return
        }

        // Use OpenRouter or OpenAI
        if (process.env.OPENROUTER_API_KEY) {
            this.llm = new ChatOpenAI({
                openAIApiKey: process.env.OPENROUTER_API_KEY,
                modelName: 'openai/gpt-4o',
                configuration: {
                    baseURL: 'https://openrouter.ai/api/v1'
                },
                temperature: 0.7,
                maxTokens: 4000
            })
        } else {
            this.llm = new ChatOpenAI({
                openAIApiKey: apiKey,
                modelName: 'gpt-4o',
                temperature: 0.7,
                maxTokens: 4000
            })
        }
    }

    /**
     * Generiert einen Agenten basierend auf der Benutzerbeschreibung
     */
    async generateAgent(request: AgentGeneratorRequest): Promise<GeneratedAgent> {
        if (!this.llm) {
            throw new Error('LLM nicht konfiguriert. Bitte API-Key setzen.')
        }

        const userPrompt = this.buildUserPrompt(request)

        try {
            logger.info(`[AgentGenerator] Generating agent for user ${request.userId}: "${request.description.substring(0, 50)}..."`)

            const response = await this.llm.invoke([
                new SystemMessage(AGENT_GENERATOR_SYSTEM_PROMPT),
                new HumanMessage(userPrompt)
            ])

            const content = response.content as string
            
            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('Keine gültige JSON-Antwort vom LLM')
            }

            const generatedAgent = JSON.parse(jsonMatch[0]) as GeneratedAgent

            // Validate and enhance the response
            this.validateGeneratedAgent(generatedAgent)
            this.enhanceNodePositions(generatedAgent.config.nodes)

            logger.info(`[AgentGenerator] Successfully generated ${generatedAgent.recommendation.type}: "${generatedAgent.config.name}"`)

            return generatedAgent

        } catch (error: any) {
            logger.error('[AgentGenerator] Error generating agent:', error)
            throw new Error(`Agent-Generierung fehlgeschlagen: ${error.message}`)
        }
    }

    /**
     * Erstellt den User-Prompt für die LLM-Anfrage
     */
    private buildUserPrompt(request: AgentGeneratorRequest): string {
        let prompt = `Benutzerbeschreibung: "${request.description}"\n`
        prompt += `Sprache: ${request.language === 'de' ? 'Deutsch' : 'Englisch'}\n`

        if (request.preferredType && request.preferredType !== 'auto') {
            prompt += `Bevorzugter Typ: ${request.preferredType}\n`
        }

        if (request.industry) {
            prompt += `Branche: ${request.industry}\n`
        }

        if (request.features && request.features.length > 0) {
            prompt += `Gewünschte Features: ${request.features.join(', ')}\n`
        }

        prompt += '\nErstelle eine passende Agent-Konfiguration.'

        return prompt
    }

    /**
     * Validiert die generierte Agent-Konfiguration
     */
    private validateGeneratedAgent(agent: GeneratedAgent): void {
        if (!agent.recommendation?.type) {
            throw new Error('Agent-Typ fehlt in der Antwort')
        }

        if (!['agentflow', 'chatflow', 'assistant'].includes(agent.recommendation.type)) {
            throw new Error(`Ungültiger Agent-Typ: ${agent.recommendation.type}`)
        }

        if (!agent.config?.name) {
            throw new Error('Agent-Name fehlt')
        }

        if (!agent.config?.systemPrompt) {
            throw new Error('System-Prompt fehlt')
        }
    }

    /**
     * Verbessert die Node-Positionierung für eine übersichtliche Darstellung
     */
    private enhanceNodePositions(nodes: NodeConfig[]): void {
        const startX = 100
        const spacing = 300
        const yCenter = 300

        nodes.forEach((node, index) => {
            if (!node.position) {
                node.position = {
                    x: startX + (index * spacing),
                    y: yCenter + (index % 2 === 0 ? 0 : 100)
                }
            }
        })
    }

    /**
     * Erstellt einen einfachen Voice-Agent Template
     */
    createVoiceAgentTemplate(name: string, systemPrompt: string): GeneratedAgentConfig {
        return {
            name,
            description: 'Automatisch generierter Voice-Agent',
            systemPrompt,
            nodes: [
                {
                    id: 'vapiTrigger_1',
                    type: 'vapiVoiceTrigger',
                    position: { x: 100, y: 300 },
                    data: { label: 'VAPI Trigger' }
                },
                {
                    id: 'chatModel_1',
                    type: 'chatOpenAI',
                    position: { x: 400, y: 300 },
                    data: {
                        label: 'OpenAI Chat',
                        modelName: 'gpt-4o-mini',
                        temperature: 0.7,
                        systemMessage: systemPrompt
                    }
                },
                {
                    id: 'vapiResponse_1',
                    type: 'vapiVoiceResponse',
                    position: { x: 700, y: 300 },
                    data: { label: 'VAPI Response' }
                }
            ],
            edges: [
                {
                    id: 'e1',
                    source: 'vapiTrigger_1',
                    target: 'chatModel_1'
                },
                {
                    id: 'e2',
                    source: 'chatModel_1',
                    target: 'vapiResponse_1'
                }
            ]
        }
    }

    /**
     * Erstellt einen einfachen Chat-Agent Template
     */
    createChatAgentTemplate(name: string, systemPrompt: string): GeneratedAgentConfig {
        return {
            name,
            description: 'Automatisch generierter Chat-Agent',
            systemPrompt,
            nodes: [
                {
                    id: 'chatModel_1',
                    type: 'chatOpenAI',
                    position: { x: 300, y: 300 },
                    data: {
                        label: 'OpenAI Chat',
                        modelName: 'gpt-4o-mini',
                        temperature: 0.7,
                        systemMessage: systemPrompt
                    }
                },
                {
                    id: 'chain_1',
                    type: 'conversationChain',
                    position: { x: 600, y: 300 },
                    data: {
                        label: 'Conversation Chain'
                    }
                }
            ],
            edges: [
                {
                    id: 'e1',
                    source: 'chatModel_1',
                    target: 'chain_1'
                }
            ]
        }
    }

    /**
     * Holt verfügbare Vorlagen aus dem Marketplace
     */
    async getTemplates(category?: string): Promise<any[]> {
        try {
            const appServer = getRunningExpressApp()
            // TODO: Query marketplace templates
            return []
        } catch (error) {
            logger.error('[AgentGenerator] Error fetching templates:', error)
            return []
        }
    }

    /**
     * Speichert einen generierten Agenten
     */
    async saveGeneratedAgent(
        userId: string,
        agent: GeneratedAgent
    ): Promise<{ id: string; type: string }> {
        const appServer = getRunningExpressApp()
        const dataSource = appServer.AppDataSource

        try {
            // Depending on type, save to appropriate table
            if (agent.recommendation.type === 'agentflow') {
                // Save as agentflow
                const result = await dataSource.query(
                    `INSERT INTO agent_flow (name, flowData, deployed, isPublic, createdDate, updatedDate)
                     VALUES ($1, $2, false, false, NOW(), NOW())
                     RETURNING id`,
                    [
                        agent.config.name,
                        JSON.stringify({
                            nodes: agent.config.nodes,
                            edges: agent.config.edges,
                            systemPrompt: agent.config.systemPrompt
                        })
                    ]
                )
                return { id: result[0].id, type: 'agentflow' }
            } else if (agent.recommendation.type === 'chatflow') {
                // Save as chatflow
                const result = await dataSource.query(
                    `INSERT INTO chat_flow (name, flowData, deployed, isPublic, createdDate, updatedDate)
                     VALUES ($1, $2, false, false, NOW(), NOW())
                     RETURNING id`,
                    [
                        agent.config.name,
                        JSON.stringify({
                            nodes: agent.config.nodes,
                            edges: agent.config.edges,
                            systemPrompt: agent.config.systemPrompt
                        })
                    ]
                )
                return { id: result[0].id, type: 'chatflow' }
            }

            throw new Error(`Unbekannter Agent-Typ: ${agent.recommendation.type}`)
        } catch (error: any) {
            logger.error('[AgentGenerator] Error saving agent:', error)
            throw new Error(`Speichern fehlgeschlagen: ${error.message}`)
        }
    }
}
