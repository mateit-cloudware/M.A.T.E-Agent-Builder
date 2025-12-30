/**
 * M.A.T.E. Agent Generator Controller
 * 
 * Handles AI-powered agent generation:
 * - POST /agent-generator/generate - Generate agent from description
 * - GET /agent-generator/templates - Get available templates
 * - POST /agent-generator/save - Save generated agent
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AgentGeneratorService, AgentGeneratorRequest, GeneratedAgent } from '../services/agent-generator.service'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import logger from '../../utils/logger'

// Extend Request type to include user
interface AuthenticatedRequest extends Omit<Request, 'user'> {
    user?: {
        id: string
        email?: string
        name?: string
    }
}

export class AgentGeneratorController {
    private agentGeneratorService: AgentGeneratorService

    constructor() {
        this.agentGeneratorService = new AgentGeneratorService()
    }

    /**
     * Generate an agent based on user description
     * POST /agent-generator/generate
     */
    public generateAgent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { description, preferredType, language, industry, features } = req.body

            if (!description || description.trim().length < 10) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    'Beschreibung muss mindestens 10 Zeichen haben'
                )
            }

            const request: AgentGeneratorRequest = {
                description: description.trim(),
                preferredType: preferredType || 'auto',
                language: language || 'de',
                industry: industry,
                features: features || [],
                userId
            }

            logger.info(`[AgentGenerator] User ${userId} requesting agent generation`)

            const generatedAgent = await this.agentGeneratorService.generateAgent(request)

            return res.status(StatusCodes.OK).json({
                success: true,
                data: generatedAgent,
                message: 'Agent erfolgreich generiert'
            })
        } catch (error: any) {
            logger.error('[AgentGenerator] Error in generateAgent:', error)
            next(error)
        }
    }

    /**
     * Get available templates
     * GET /agent-generator/templates
     */
    public getTemplates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { category } = req.query

            const templates = await this.agentGeneratorService.getTemplates(category as string)

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    templates,
                    categories: [
                        { id: 'voice', name: 'Voice-Agenten', icon: 'phone' },
                        { id: 'chat', name: 'Chat-Agenten', icon: 'chat' },
                        { id: 'support', name: 'Kundensupport', icon: 'support' },
                        { id: 'sales', name: 'Vertrieb', icon: 'sales' },
                        { id: 'booking', name: 'Terminbuchung', icon: 'calendar' }
                    ]
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Save a generated agent
     * POST /agent-generator/save
     */
    public saveAgent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { agent } = req.body as { agent: GeneratedAgent }

            if (!agent || !agent.config?.name) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    'Ungültige Agent-Konfiguration'
                )
            }

            logger.info(`[AgentGenerator] User ${userId} saving agent: ${agent.config.name}`)

            const result = await this.agentGeneratorService.saveGeneratedAgent(userId, agent)

            return res.status(StatusCodes.CREATED).json({
                success: true,
                data: result,
                message: 'Agent erfolgreich gespeichert'
            })
        } catch (error: any) {
            logger.error('[AgentGenerator] Error in saveAgent:', error)
            next(error)
        }
    }

    /**
     * Get quick start wizard configuration
     * GET /agent-generator/wizard-config
     */
    public getWizardConfig = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    steps: [
                        {
                            id: 'welcome',
                            title: 'Willkommen bei M.A.T.E.',
                            description: 'Erstelle deinen ersten KI-Agenten in wenigen Minuten'
                        },
                        {
                            id: 'describe',
                            title: 'Beschreibe deinen Agenten',
                            description: 'Was soll dein Agent können?',
                            placeholder: 'z.B. Ein Telefonassistent der Termine für mein Friseursalon bucht...'
                        },
                        {
                            id: 'type',
                            title: 'Wähle den Typ',
                            description: 'Wie soll dein Agent kommunizieren?',
                            options: [
                                { id: 'voice', label: 'Telefon / Voice', icon: 'phone', description: 'Für Telefonanrufe' },
                                { id: 'chat', label: 'Chat / Website', icon: 'chat', description: 'Für Website-Chat' },
                                { id: 'auto', label: 'Automatisch', icon: 'auto', description: 'KI wählt automatisch' }
                            ]
                        },
                        {
                            id: 'industry',
                            title: 'Deine Branche',
                            description: 'Hilft uns, den Agenten besser anzupassen',
                            options: [
                                { id: 'healthcare', label: 'Gesundheitswesen' },
                                { id: 'retail', label: 'Einzelhandel' },
                                { id: 'hospitality', label: 'Gastronomie / Hotel' },
                                { id: 'services', label: 'Dienstleistungen' },
                                { id: 'real-estate', label: 'Immobilien' },
                                { id: 'other', label: 'Andere' }
                            ]
                        },
                        {
                            id: 'review',
                            title: 'Dein Agent wird erstellt',
                            description: 'Wir generieren deinen individuellen Agenten...'
                        }
                    ],
                    tips: [
                        'Je detaillierter deine Beschreibung, desto besser wird der Agent',
                        'Du kannst den Agent nach der Erstellung jederzeit anpassen',
                        'Voice-Agenten benötigen VAPI-Credentials für Telefonie'
                    ]
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get example prompts for inspiration
     * GET /agent-generator/examples
     */
    public getExamples = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            return res.status(StatusCodes.OK).json({
                success: true,
                data: [
                    {
                        category: 'Terminbuchung',
                        examples: [
                            'Ein Telefonassistent für meine Zahnarztpraxis, der Termine vereinbart und Patienten an Termine erinnert.',
                            'Ein Voice-Agent für meinen Friseursalon, der Verfügbarkeiten prüft und Buchungen vornimmt.'
                        ]
                    },
                    {
                        category: 'Kundensupport',
                        examples: [
                            'Ein Chat-Bot der häufige Fragen zu meinem Online-Shop beantwortet und bei Retouren hilft.',
                            'Ein Support-Agent der technische Probleme mit meiner Software löst.'
                        ]
                    },
                    {
                        category: 'Vertrieb',
                        examples: [
                            'Ein Telefonagent der eingehende Anfragen qualifiziert und Demos vereinbart.',
                            'Ein Chat-Agent der Besucher auf meiner Website berät und zu Produkten führt.'
                        ]
                    },
                    {
                        category: 'Informationen',
                        examples: [
                            'Ein Voice-Agent der Öffnungszeiten, Standorte und allgemeine Infos zu meinem Restaurant gibt.',
                            'Ein FAQ-Bot der Fragen zu meinem Unternehmen beantwortet.'
                        ]
                    }
                ]
            })
        } catch (error) {
            next(error)
        }
    }
}

export default new AgentGeneratorController()
