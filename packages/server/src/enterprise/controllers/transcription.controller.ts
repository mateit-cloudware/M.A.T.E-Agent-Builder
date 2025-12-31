/**
 * M.A.T.E. Transcription Controller
 * 
 * API endpoints for call transcription management:
 * - GET /transcriptions - List transcriptions
 * - GET /transcriptions/:id - Get single transcription
 * - POST /transcriptions - Create transcription (from VAPI webhook)
 * - PUT /transcriptions/:id - Update transcription
 * - DELETE /transcriptions/:id - Delete transcription
 * - GET /transcriptions/stats - Get call statistics
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { TranscriptionService } from '../services/transcription.service'
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

export class TranscriptionController {
    private transcriptionService: TranscriptionService

    constructor() {
        this.transcriptionService = new TranscriptionService()
    }

    /**
     * Get all transcriptions for the authenticated user
     * GET /transcriptions
     */
    public getTranscriptions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { limit, offset, startDate, endDate, agentId, callStatus, search } = req.query

            const filters = {
                limit: limit ? parseInt(limit as string) : 20,
                offset: offset ? parseInt(offset as string) : 0,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                agentId: agentId as string,
                callStatus: callStatus as string,
                searchQuery: search as string
            }

            const result = await this.transcriptionService.getTranscriptions(userId, filters)

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    transcriptions: result.transcriptions.map(t => ({
                        id: t.id,
                        vapiCallId: t.vapiCallId,
                        agentId: t.agentId,
                        agentName: t.agentName,
                        callerPhone: t.callerPhone,
                        callerName: t.callerName,
                        callStatus: t.callStatus,
                        callDirection: t.callDirection,
                        durationSeconds: t.durationSeconds,
                        durationFormatted: this.formatDuration(t.durationSeconds),
                        summary: t.summary,
                        tags: t.tags,
                        sentiment: t.sentiment,
                        costCents: t.costCents,
                        costEur: (t.costCents / 100).toFixed(2),
                        callStartedAt: t.callStartedAt,
                        callEndedAt: t.callEndedAt,
                        createdAt: t.createdAt
                    })),
                    total: result.total,
                    limit: filters.limit,
                    offset: filters.offset
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get a single transcription
     * GET /transcriptions/:id
     */
    public getTranscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { id } = req.params
            const transcription = await this.transcriptionService.getTranscriptionById(id, userId)

            if (!transcription) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Transkription nicht gefunden')
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    id: transcription.id,
                    vapiCallId: transcription.vapiCallId,
                    agentId: transcription.agentId,
                    agentName: transcription.agentName,
                    callerPhone: transcription.callerPhone,
                    callerName: transcription.callerName,
                    callStatus: transcription.callStatus,
                    callDirection: transcription.callDirection,
                    durationSeconds: transcription.durationSeconds,
                    durationFormatted: this.formatDuration(transcription.durationSeconds),
                    transcript: transcription.transcript,
                    messages: transcription.messages,
                    summary: transcription.summary,
                    tags: transcription.tags,
                    sentiment: transcription.sentiment,
                    actionItems: transcription.actionItems,
                    endedReason: transcription.endedReason,
                    costCents: transcription.costCents,
                    costEur: (transcription.costCents / 100).toFixed(2),
                    callStartedAt: transcription.callStartedAt,
                    callEndedAt: transcription.callEndedAt,
                    createdAt: transcription.createdAt,
                    updatedAt: transcription.updatedAt
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Create a new transcription (typically from VAPI webhook)
     * POST /transcriptions
     */
    public createTranscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const {
                vapiCallId,
                agentId,
                agentName,
                callerPhone,
                callerName,
                callStatus,
                callDirection,
                durationSeconds,
                transcript,
                messages,
                endedReason,
                costCents,
                callStartedAt,
                callEndedAt
            } = req.body

            const transcription = await this.transcriptionService.createTranscription({
                userId,
                vapiCallId,
                agentId,
                agentName,
                callerPhone,
                callerName,
                callStatus,
                callDirection,
                durationSeconds,
                transcript,
                messages,
                endedReason,
                costCents,
                callStartedAt: callStartedAt ? new Date(callStartedAt) : undefined,
                callEndedAt: callEndedAt ? new Date(callEndedAt) : undefined
            })

            return res.status(StatusCodes.CREATED).json({
                success: true,
                data: { id: transcription.id },
                message: 'Transkription erstellt'
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Update a transcription
     * PUT /transcriptions/:id
     */
    public updateTranscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { id } = req.params
            const updates = req.body

            const transcription = await this.transcriptionService.updateTranscription(id, userId, updates)

            if (!transcription) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Transkription nicht gefunden')
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                data: { id: transcription.id },
                message: 'Transkription aktualisiert'
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Delete a transcription
     * DELETE /transcriptions/:id
     */
    public deleteTranscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { id } = req.params
            const deleted = await this.transcriptionService.deleteTranscription(id, userId)

            if (!deleted) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Transkription nicht gefunden')
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Transkription gelöscht'
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get call statistics
     * GET /transcriptions/stats
     */
    public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { startDate, endDate } = req.query

            const stats = await this.transcriptionService.getCallStats(
                userId,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            )

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    ...stats,
                    totalCostFormatted: `€${stats.totalCostEur.toFixed(2)}`,
                    avgDurationFormatted: this.formatDuration(stats.avgDurationSeconds)
                }
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Regenerate summary for a transcription
     * POST /transcriptions/:id/summarize
     */
    public regenerateSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id
            if (!userId) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'User not authenticated')
            }

            const { id } = req.params
            const transcription = await this.transcriptionService.getTranscriptionById(id, userId)

            if (!transcription) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Transkription nicht gefunden')
            }

            if (!transcription.transcript) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Kein Transkript vorhanden')
            }

            await this.transcriptionService.generateSummary(id, transcription.transcript)

            return res.status(StatusCodes.OK).json({
                success: true,
                message: 'Zusammenfassung wird generiert...'
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Format duration in seconds to human-readable string
     */
    private formatDuration(seconds: number): string {
        if (seconds < 60) {
            return `${seconds}s`
        }
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        if (minutes < 60) {
            return `${minutes}m ${remainingSeconds}s`
        }
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60
        return `${hours}h ${remainingMinutes}m`
    }
}

export default new TranscriptionController()
