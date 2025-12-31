/**
 * M.A.T.E. Transcription Service
 * 
 * Handles call transcription storage, retrieval, and AI summarization.
 */

import { Between, ILike, In } from 'typeorm'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { CallTranscription } from '../database/entities/call-transcription.entity'
import logger from '../../utils/logger'

export interface CreateTranscriptionRequest {
    userId: string
    vapiCallId?: string
    agentId?: string
    agentName?: string
    callerPhone?: string
    callerName?: string
    callStatus?: 'in_progress' | 'completed' | 'failed' | 'missed'
    callDirection?: 'inbound' | 'outbound'
    durationSeconds?: number
    transcript?: string
    messages?: Array<{
        role: 'user' | 'assistant' | 'system'
        content: string
        timestamp?: string
    }>
    endedReason?: string
    costCents?: number
    callStartedAt?: Date
    callEndedAt?: Date
}

export interface TranscriptionFilters {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
    agentId?: string
    callStatus?: string
    searchQuery?: string
}

// System prompt for summarization
const SUMMARIZATION_PROMPT = `Du bist ein Experte für die Zusammenfassung von Telefongesprächen.

Analysiere das folgende Transkript und erstelle:
1. Eine kurze Zusammenfassung (2-3 Sätze)
2. Die wichtigsten Themen/Tags (max. 5)
3. Die Stimmung des Gesprächs (positiv/neutral/negativ)
4. Eventuelle Aktionspunkte oder Follow-ups

Antworte NUR mit validem JSON im folgenden Format:
{
    "summary": "Zusammenfassung...",
    "tags": ["tag1", "tag2"],
    "sentiment": "positive|neutral|negative",
    "actionItems": ["Aktion 1", "Aktion 2"]
}`

export class TranscriptionService {
    private llm: ChatOpenAI | null = null

    constructor() {
        this.initializeLLM()
    }

    private initializeLLM() {
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
        
        if (!apiKey) {
            logger.warn('[Transcription] No API key found for LLM summarization')
            return
        }

        if (process.env.OPENROUTER_API_KEY) {
            this.llm = new ChatOpenAI({
                openAIApiKey: process.env.OPENROUTER_API_KEY,
                modelName: 'openai/gpt-4o-mini',
                configuration: {
                    baseURL: 'https://openrouter.ai/api/v1'
                },
                temperature: 0.3,
                maxTokens: 1000
            })
        } else {
            this.llm = new ChatOpenAI({
                openAIApiKey: apiKey,
                modelName: 'gpt-4o-mini',
                temperature: 0.3,
                maxTokens: 1000
            })
        }
    }

    /**
     * Create a new transcription record
     */
    async createTranscription(data: CreateTranscriptionRequest): Promise<CallTranscription> {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CallTranscription)

        const transcription = repo.create({
            userId: data.userId,
            vapiCallId: data.vapiCallId,
            agentId: data.agentId,
            agentName: data.agentName,
            callerPhone: data.callerPhone,
            callerName: data.callerName,
            callStatus: data.callStatus || 'completed',
            callDirection: data.callDirection || 'inbound',
            durationSeconds: data.durationSeconds || 0,
            transcript: data.transcript,
            messages: data.messages,
            endedReason: data.endedReason,
            costCents: data.costCents || 0,
            callStartedAt: data.callStartedAt,
            callEndedAt: data.callEndedAt
        })

        const saved = await repo.save(transcription)
        logger.info(`[Transcription] Created transcription ${saved.id} for user ${data.userId}`)

        // Generate summary asynchronously
        if (data.transcript && data.transcript.length > 50) {
            this.generateSummary(saved.id, data.transcript).catch(err => {
                logger.error('[Transcription] Error generating summary:', err)
            })
        }

        return saved
    }

    /**
     * Get transcriptions for a user with filters
     */
    async getTranscriptions(
        userId: string,
        filters: TranscriptionFilters = {}
    ): Promise<{ transcriptions: CallTranscription[]; total: number }> {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CallTranscription)

        const { limit = 20, offset = 0, startDate, endDate, agentId, callStatus, searchQuery } = filters

        const queryBuilder = repo.createQueryBuilder('t')
            .where('t.user_id = :userId', { userId })
            .orderBy('t.created_at', 'DESC')
            .take(limit)
            .skip(offset)

        if (startDate && endDate) {
            queryBuilder.andWhere('t.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
        }

        if (agentId) {
            queryBuilder.andWhere('t.agent_id = :agentId', { agentId })
        }

        if (callStatus) {
            queryBuilder.andWhere('t.call_status = :callStatus', { callStatus })
        }

        if (searchQuery) {
            queryBuilder.andWhere(
                '(t.transcript ILIKE :search OR t.summary ILIKE :search OR t.caller_name ILIKE :search OR t.caller_phone ILIKE :search)',
                { search: `%${searchQuery}%` }
            )
        }

        const [transcriptions, total] = await queryBuilder.getManyAndCount()

        return { transcriptions, total }
    }

    /**
     * Get a single transcription by ID
     */
    async getTranscriptionById(id: string, userId: string): Promise<CallTranscription | null> {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CallTranscription)

        return repo.findOne({
            where: { id, userId }
        })
    }

    /**
     * Get transcription by VAPI call ID
     */
    async getByVapiCallId(vapiCallId: string): Promise<CallTranscription | null> {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CallTranscription)

        return repo.findOne({
            where: { vapiCallId }
        })
    }

    /**
     * Update transcription (e.g., add more messages during call)
     */
    async updateTranscription(
        id: string,
        userId: string,
        updates: Partial<CallTranscription>
    ): Promise<CallTranscription | null> {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CallTranscription)

        const transcription = await repo.findOne({ where: { id, userId } })
        if (!transcription) return null

        Object.assign(transcription, updates)
        return repo.save(transcription)
    }

    /**
     * Generate AI summary for a transcription
     */
    async generateSummary(transcriptionId: string, transcript: string): Promise<void> {
        if (!this.llm) {
            logger.warn('[Transcription] LLM not available for summarization')
            return
        }

        try {
            const response = await this.llm.invoke([
                new SystemMessage(SUMMARIZATION_PROMPT),
                new HumanMessage(`Transkript:\n${transcript}`)
            ])

            const content = response.content as string
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0])
                
                const appServer = getRunningExpressApp()
                const repo = appServer.AppDataSource.getRepository(CallTranscription)

                await repo.update(transcriptionId, {
                    summary: result.summary,
                    tags: result.tags,
                    sentiment: result.sentiment,
                    actionItems: result.actionItems
                })

                logger.info(`[Transcription] Generated summary for ${transcriptionId}`)
            }
        } catch (error: any) {
            logger.error('[Transcription] Error generating summary:', error.message)
        }
    }

    /**
     * Get call statistics for a user
     */
    async getCallStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
        totalCalls: number
        totalDurationMinutes: number
        totalCostEur: number
        callsByStatus: Record<string, number>
        avgDurationSeconds: number
        successRate: number
    }> {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CallTranscription)

        const queryBuilder = repo.createQueryBuilder('t')
            .where('t.user_id = :userId', { userId })

        if (startDate && endDate) {
            queryBuilder.andWhere('t.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
        }

        const transcriptions = await queryBuilder.getMany()

        const totalCalls = transcriptions.length
        const totalDurationSeconds = transcriptions.reduce((sum, t) => sum + (t.durationSeconds || 0), 0)
        const totalCostCents = transcriptions.reduce((sum, t) => sum + (t.costCents || 0), 0)

        const callsByStatus: Record<string, number> = {}
        transcriptions.forEach(t => {
            callsByStatus[t.callStatus] = (callsByStatus[t.callStatus] || 0) + 1
        })

        const successfulCalls = callsByStatus['completed'] || 0
        const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0

        return {
            totalCalls,
            totalDurationMinutes: Math.floor(totalDurationSeconds / 60),
            totalCostEur: totalCostCents / 100,
            callsByStatus,
            avgDurationSeconds: totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0,
            successRate
        }
    }

    /**
     * Delete a transcription
     */
    async deleteTranscription(id: string, userId: string): Promise<boolean> {
        const appServer = getRunningExpressApp()
        const repo = appServer.AppDataSource.getRepository(CallTranscription)

        const result = await repo.delete({ id, userId })
        return (result.affected || 0) > 0
    }
}
