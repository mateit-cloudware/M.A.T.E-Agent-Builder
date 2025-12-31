/**
 * M.A.T.E. GDPR Controller
 * 
 * API-Endpoints für DSGVO-Compliance:
 * - Consent Management
 * - Datenexport
 * - Datenlöschung
 * - Verarbeitungseinschränkung
 * - Datenschutz-Center
 */

import { Request, Response, NextFunction } from 'express'
import {
    gdprService,
    ConsentType,
    DataExportFormat,
    ProcessingRestrictionType,
    ProcessingRestrictionReason
} from '../services/gdpr.service'

// ==================== CONSENT MANAGEMENT ====================

/**
 * Einwilligung erteilen
 * POST /api/v1/gdpr/consent
 */
export const grantConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { consentType, version, purposes, thirdParties, metadata } = req.body

        if (!consentType || !Object.values(ConsentType).includes(consentType)) {
            return res.status(400).json({ 
                error: 'Ungültiger Consent-Typ',
                validTypes: Object.values(ConsentType)
            })
        }

        const result = await gdprService.grantConsent(userId, consentType, {
            version,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            purposes,
            thirdParties,
            metadata
        })

        res.status(201).json({
            success: true,
            message: 'Einwilligung erteilt',
            consent: result
        })

    } catch (error: any) {
        console.error('[GDPR] grantConsent Fehler:', error)
        next(error)
    }
}

/**
 * Einwilligung widerrufen
 * DELETE /api/v1/gdpr/consent/:consentType
 */
export const withdrawConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { consentType } = req.params
        const { reason } = req.body

        if (!Object.values(ConsentType).includes(consentType as ConsentType)) {
            return res.status(400).json({ error: 'Ungültiger Consent-Typ' })
        }

        if (consentType === ConsentType.ESSENTIAL) {
            return res.status(400).json({ 
                error: 'Essentielle Einwilligung kann nicht widerrufen werden' 
            })
        }

        const success = await gdprService.withdrawConsent(
            userId, 
            consentType as ConsentType, 
            reason
        )

        if (success) {
            res.json({
                success: true,
                message: 'Einwilligung widerrufen'
            })
        } else {
            res.status(404).json({ error: 'Keine aktive Einwilligung gefunden' })
        }

    } catch (error: any) {
        console.error('[GDPR] withdrawConsent Fehler:', error)
        next(error)
    }
}

/**
 * Alle Einwilligungen abrufen
 * GET /api/v1/gdpr/consents
 */
export const getConsents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const consents = await gdprService.getUserConsents(userId)
        const status = await gdprService.getConsentStatus(userId)

        res.json({
            consents,
            status,
            consentTypes: Object.values(ConsentType).map(type => ({
                type,
                name: getConsentTypeName(type),
                description: getConsentTypeDescription(type),
                required: type === ConsentType.ESSENTIAL
            }))
        })

    } catch (error: any) {
        console.error('[GDPR] getConsents Fehler:', error)
        next(error)
    }
}

/**
 * Alle Einwilligungen auf einmal aktualisieren (Cookie-Banner)
 * PUT /api/v1/gdpr/consents/all
 */
export const updateAllConsents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { consents } = req.body

        if (!consents || typeof consents !== 'object') {
            return res.status(400).json({ error: 'Ungültige Consent-Daten' })
        }

        await gdprService.updateAllConsents(userId, consents, {
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        })

        const status = await gdprService.getConsentStatus(userId)

        res.json({
            success: true,
            message: 'Einwilligungen aktualisiert',
            status
        })

    } catch (error: any) {
        console.error('[GDPR] updateAllConsents Fehler:', error)
        next(error)
    }
}

// ==================== DATA EXPORT (Art. 15 & 20) ====================

/**
 * Datenexport anfordern
 * POST /api/v1/gdpr/export
 */
export const requestDataExport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { format, categories } = req.body
        const exportFormat = format && Object.values(DataExportFormat).includes(format)
            ? format
            : DataExportFormat.ZIP

        const request = await gdprService.requestDataExport(
            userId,
            exportFormat,
            categories
        )

        res.status(202).json({
            success: true,
            message: 'Datenexport wird vorbereitet. Sie erhalten eine Benachrichtigung, wenn der Export bereit ist.',
            exportRequest: {
                id: request.id,
                status: request.status,
                format: request.format,
                requestedAt: request.requestedAt,
                expiresAt: request.expiresAt
            }
        })

    } catch (error: any) {
        console.error('[GDPR] requestDataExport Fehler:', error)
        next(error)
    }
}

/**
 * Export-Status abrufen
 * GET /api/v1/gdpr/export/:requestId/status
 */
export const getExportStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { requestId } = req.params
        const request = await gdprService.getExportStatus(requestId)

        if (!request) {
            return res.status(404).json({ error: 'Export-Anfrage nicht gefunden' })
        }

        if (request.userId !== userId) {
            return res.status(403).json({ error: 'Zugriff verweigert' })
        }

        res.json({
            id: request.id,
            status: request.status,
            format: request.format,
            requestedAt: request.requestedAt,
            processedAt: request.processedAt,
            expiresAt: request.expiresAt,
            fileSize: request.fileSize,
            downloadUrl: request.status === 'completed' ? request.downloadUrl : null
        })

    } catch (error: any) {
        console.error('[GDPR] getExportStatus Fehler:', error)
        next(error)
    }
}

/**
 * Export herunterladen
 * GET /api/v1/gdpr/exports/:requestId/download
 */
export const downloadExport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { requestId } = req.params
        const request = await gdprService.getExportStatus(requestId)

        if (!request) {
            return res.status(404).json({ error: 'Export nicht gefunden' })
        }

        if (request.userId !== userId) {
            return res.status(403).json({ error: 'Zugriff verweigert' })
        }

        if (request.status !== 'completed') {
            return res.status(400).json({ 
                error: 'Export noch nicht bereit',
                status: request.status 
            })
        }

        const result = await gdprService.downloadExport(requestId)
        if (!result) {
            return res.status(404).json({ error: 'Export-Daten nicht verfügbar' })
        }

        // Response-Header setzen
        res.setHeader('Content-Type', result.contentType)
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
        
        if (request.checksum) {
            res.setHeader('X-Checksum-SHA256', request.checksum)
        }

        // Daten senden
        if (request.format === DataExportFormat.JSON) {
            res.json(result.data)
        } else if (request.format === DataExportFormat.CSV) {
            res.send(result.data)
        } else {
            // ZIP/GZIP
            const zlib = require('zlib')
            zlib.gzip(JSON.stringify(result.data, null, 2), (err: any, compressed: Buffer) => {
                if (err) {
                    return res.status(500).json({ error: 'Komprimierungsfehler' })
                }
                res.send(compressed)
            })
        }

    } catch (error: any) {
        console.error('[GDPR] downloadExport Fehler:', error)
        next(error)
    }
}

// ==================== DATA DELETION (Art. 17) ====================

/**
 * Löschung anfordern
 * POST /api/v1/gdpr/deletion
 */
export const requestDeletion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { categories, confirmPassword } = req.body

        // In Produktion: Passwort-Bestätigung prüfen
        // if (!confirmPassword) {
        //     return res.status(400).json({ error: 'Passwortbestätigung erforderlich' })
        // }

        const request = await gdprService.requestDeletion(userId, {
            dataCategories: categories
        })

        res.status(202).json({
            success: true,
            message: `Löschanfrage erstellt. Ihre Daten werden am ${request.scheduledAt.toLocaleDateString('de-DE')} gelöscht. Sie können die Anfrage bis dahin stornieren.`,
            deletionRequest: {
                id: request.id,
                status: request.status,
                requestedAt: request.requestedAt,
                scheduledAt: request.scheduledAt,
                dataCategories: request.dataCategories,
                retentionExceptions: request.retentionExceptions
            },
            cancellationInfo: {
                deadline: request.scheduledAt,
                endpoint: `/api/v1/gdpr/deletion/${request.id}/cancel`
            }
        })

    } catch (error: any) {
        console.error('[GDPR] requestDeletion Fehler:', error)
        next(error)
    }
}

/**
 * Löschung stornieren
 * POST /api/v1/gdpr/deletion/:requestId/cancel
 */
export const cancelDeletion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { requestId } = req.params
        const { reason } = req.body

        const success = await gdprService.cancelDeletion(requestId, userId, reason)

        if (success) {
            res.json({
                success: true,
                message: 'Löschanfrage storniert'
            })
        } else {
            res.status(400).json({ 
                error: 'Stornierung nicht möglich. Die Wartefrist ist möglicherweise abgelaufen.' 
            })
        }

    } catch (error: any) {
        console.error('[GDPR] cancelDeletion Fehler:', error)
        next(error)
    }
}

/**
 * Löschstatus abrufen
 * GET /api/v1/gdpr/deletion/:requestId
 */
export const getDeletionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { requestId } = req.params
        const request = await gdprService.getDeletionStatus(requestId)

        if (!request) {
            return res.status(404).json({ error: 'Löschanfrage nicht gefunden' })
        }

        if (request.userId !== userId) {
            return res.status(403).json({ error: 'Zugriff verweigert' })
        }

        res.json({
            id: request.id,
            status: request.status,
            requestedAt: request.requestedAt,
            scheduledAt: request.scheduledAt,
            processedAt: request.processedAt,
            dataCategories: request.dataCategories,
            retentionExceptions: request.retentionExceptions,
            deletionLog: request.deletionLog,
            cancellationReason: request.cancellationReason
        })

    } catch (error: any) {
        console.error('[GDPR] getDeletionStatus Fehler:', error)
        next(error)
    }
}

/**
 * Alle Löschanfragen des Benutzers
 * GET /api/v1/gdpr/deletions
 */
export const getUserDeletionRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const requests = await gdprService.getUserDeletionRequests(userId)

        res.json({
            requests: requests.map(r => ({
                id: r.id,
                status: r.status,
                requestedAt: r.requestedAt,
                scheduledAt: r.scheduledAt,
                processedAt: r.processedAt
            }))
        })

    } catch (error: any) {
        console.error('[GDPR] getUserDeletionRequests Fehler:', error)
        next(error)
    }
}

// ==================== PROCESSING RESTRICTION (Art. 18) ====================

/**
 * Verarbeitungseinschränkung anfordern
 * POST /api/v1/gdpr/restriction
 */
export const requestProcessingRestriction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { restrictionType, reason, notes, endDate } = req.body

        if (!restrictionType || !Object.values(ProcessingRestrictionType).includes(restrictionType)) {
            return res.status(400).json({ 
                error: 'Ungültiger Einschränkungstyp',
                validTypes: Object.values(ProcessingRestrictionType)
            })
        }

        if (!reason || !Object.values(ProcessingRestrictionReason).includes(reason)) {
            return res.status(400).json({ 
                error: 'Ungültiger Grund',
                validReasons: Object.values(ProcessingRestrictionReason)
            })
        }

        const restriction = await gdprService.requestProcessingRestriction(
            userId,
            restrictionType,
            reason,
            {
                notes,
                endDate: endDate ? new Date(endDate) : undefined,
                requestedBy: 'user'
            }
        )

        res.status(201).json({
            success: true,
            message: 'Verarbeitungseinschränkung aktiviert',
            restriction: {
                id: restriction.id,
                type: restriction.restrictionType,
                reason: restriction.reason,
                startDate: restriction.startDate,
                endDate: restriction.endDate,
                affectedProcesses: restriction.affectedProcesses
            }
        })

    } catch (error: any) {
        console.error('[GDPR] requestProcessingRestriction Fehler:', error)
        next(error)
    }
}

/**
 * Einschränkung aufheben
 * DELETE /api/v1/gdpr/restriction/:restrictionId
 */
export const liftProcessingRestriction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const { restrictionId } = req.params

        const success = await gdprService.liftProcessingRestriction(userId, restrictionId, 'user')

        if (success) {
            res.json({
                success: true,
                message: 'Einschränkung aufgehoben'
            })
        } else {
            res.status(404).json({ error: 'Einschränkung nicht gefunden oder bereits aufgehoben' })
        }

    } catch (error: any) {
        console.error('[GDPR] liftProcessingRestriction Fehler:', error)
        next(error)
    }
}

/**
 * Aktive Einschränkungen abrufen
 * GET /api/v1/gdpr/restrictions
 */
export const getProcessingRestrictions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const restrictions = await gdprService.getProcessingRestrictions(userId)

        res.json({
            restrictions: restrictions.map(r => ({
                id: r.id,
                type: r.restrictionType,
                reason: r.reason,
                isActive: r.isActive,
                startDate: r.startDate,
                endDate: r.endDate,
                affectedProcesses: r.affectedProcesses
            })),
            restrictionTypes: Object.values(ProcessingRestrictionType).map(type => ({
                type,
                name: getRestrictionTypeName(type),
                description: getRestrictionTypeDescription(type)
            })),
            restrictionReasons: Object.values(ProcessingRestrictionReason).map(reason => ({
                reason,
                name: getRestrictionReasonName(reason),
                article: getRestrictionReasonArticle(reason)
            }))
        })

    } catch (error: any) {
        console.error('[GDPR] getProcessingRestrictions Fehler:', error)
        next(error)
    }
}

// ==================== PRIVACY CENTER ====================

/**
 * Datenschutz-Center Übersicht
 * GET /api/v1/gdpr/privacy-center
 */
export const getPrivacyCenter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({ error: 'Nicht authentifiziert' })
        }

        const [consents, status, restrictions, deletionRequests] = await Promise.all([
            gdprService.getUserConsents(userId),
            gdprService.getConsentStatus(userId),
            gdprService.getProcessingRestrictions(userId),
            gdprService.getUserDeletionRequests(userId)
        ])

        const settings = gdprService.getSettings()

        res.json({
            consents: {
                current: status,
                history: consents
            },
            restrictions: {
                active: restrictions.filter(r => r.isActive),
                history: restrictions.filter(r => !r.isActive)
            },
            deletion: {
                pending: deletionRequests.find(r => r.status === 'pending'),
                history: deletionRequests.filter(r => r.status !== 'pending')
            },
            rights: [
                {
                    name: 'Auskunftsrecht',
                    article: 'Art. 15 DSGVO',
                    description: 'Sie haben das Recht, Auskunft über Ihre gespeicherten Daten zu erhalten.',
                    action: 'Datenexport anfordern',
                    endpoint: '/api/v1/gdpr/export'
                },
                {
                    name: 'Recht auf Datenübertragbarkeit',
                    article: 'Art. 20 DSGVO',
                    description: 'Sie haben das Recht, Ihre Daten in einem gängigen Format zu erhalten.',
                    action: 'Datenexport anfordern',
                    endpoint: '/api/v1/gdpr/export'
                },
                {
                    name: 'Recht auf Löschung',
                    article: 'Art. 17 DSGVO',
                    description: 'Sie haben das Recht auf Löschung Ihrer personenbezogenen Daten.',
                    action: 'Löschung beantragen',
                    endpoint: '/api/v1/gdpr/deletion',
                    waitingPeriod: `${settings.deletionWaitingPeriodDays} Tage`
                },
                {
                    name: 'Recht auf Einschränkung',
                    article: 'Art. 18 DSGVO',
                    description: 'Sie haben das Recht, die Verarbeitung Ihrer Daten einzuschränken.',
                    action: 'Einschränkung beantragen',
                    endpoint: '/api/v1/gdpr/restriction'
                }
            ],
            dataController: {
                name: 'M.A.T.E. (MATEIT CLOUDWARE GmbH)',
                address: '[Adresse einfügen]',
                email: 'datenschutz@getmate.ai',
                phone: '[Telefonnummer einfügen]',
                dpo: 'Datenschutzbeauftragter: dpo@getmate.ai'
            },
            retentionInfo: {
                standard: `${settings.retentionPeriodDays} Tage`,
                billing: `${settings.billingRetentionYears} Jahre (gesetzliche Aufbewahrungspflicht)`,
                consents: `${settings.consentExpiryDays} Tage`
            }
        })

    } catch (error: any) {
        console.error('[GDPR] getPrivacyCenter Fehler:', error)
        next(error)
    }
}

// ==================== ADMIN ENDPOINTS ====================

/**
 * GDPR-Statistiken (Admin)
 * GET /api/v1/admin/gdpr/stats
 */
export const getGDPRStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await gdprService.getGDPRStats()
        const settings = gdprService.getSettings()

        res.json({
            stats,
            settings
        })

    } catch (error: any) {
        console.error('[GDPR] getGDPRStats Fehler:', error)
        next(error)
    }
}

/**
 * GDPR-Einstellungen aktualisieren (Admin)
 * PUT /api/v1/admin/gdpr/settings
 */
export const updateGDPRSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = req.body

        // Validierung
        if (settings.deletionWaitingPeriodDays !== undefined && settings.deletionWaitingPeriodDays < 14) {
            return res.status(400).json({ 
                error: 'Lösch-Wartefrist muss mindestens 14 Tage betragen' 
            })
        }

        gdprService.updateSettings(settings)

        res.json({
            success: true,
            message: 'GDPR-Einstellungen aktualisiert',
            settings: gdprService.getSettings()
        })

    } catch (error: any) {
        console.error('[GDPR] updateGDPRSettings Fehler:', error)
        next(error)
    }
}

/**
 * Retention Cleanup manuell ausführen (Admin)
 * POST /api/v1/admin/gdpr/run-cleanup
 */
export const runRetentionCleanup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await gdprService.runRetentionCleanup()

        res.json({
            success: true,
            message: 'Retention Cleanup abgeschlossen',
            result
        })

    } catch (error: any) {
        console.error('[GDPR] runRetentionCleanup Fehler:', error)
        next(error)
    }
}

// ==================== HELPER FUNCTIONS ====================

function getConsentTypeName(type: ConsentType): string {
    const names: Record<ConsentType, string> = {
        [ConsentType.ESSENTIAL]: 'Essentiell',
        [ConsentType.ANALYTICS]: 'Analysen',
        [ConsentType.MARKETING]: 'Marketing',
        [ConsentType.THIRD_PARTY]: 'Drittanbieter',
        [ConsentType.AI_TRAINING]: 'KI-Training',
        [ConsentType.DATA_SHARING]: 'Datenfreigabe',
        [ConsentType.PERSONALIZATION]: 'Personalisierung'
    }
    return names[type] || type
}

function getConsentTypeDescription(type: ConsentType): string {
    const descriptions: Record<ConsentType, string> = {
        [ConsentType.ESSENTIAL]: 'Erforderlich für den Betrieb der Plattform. Kann nicht deaktiviert werden.',
        [ConsentType.ANALYTICS]: 'Ermöglicht uns, die Nutzung zu analysieren und die Plattform zu verbessern.',
        [ConsentType.MARKETING]: 'Erlaubt uns, Ihnen personalisierte Angebote und Newsletter zu senden.',
        [ConsentType.THIRD_PARTY]: 'Ermöglicht die Integration mit Drittanbieterdiensten.',
        [ConsentType.AI_TRAINING]: 'Erlaubt die Nutzung Ihrer Interaktionen zur Verbesserung unserer KI-Modelle.',
        [ConsentType.DATA_SHARING]: 'Ermöglicht das Teilen anonymisierter Daten für Forschungszwecke.',
        [ConsentType.PERSONALIZATION]: 'Ermöglicht personalisierte Empfehlungen und angepasste Erfahrungen.'
    }
    return descriptions[type] || ''
}

function getRestrictionTypeName(type: ProcessingRestrictionType): string {
    const names: Record<ProcessingRestrictionType, string> = {
        [ProcessingRestrictionType.FULL]: 'Vollständige Einschränkung',
        [ProcessingRestrictionType.MARKETING_ONLY]: 'Nur Marketing',
        [ProcessingRestrictionType.ANALYTICS_ONLY]: 'Nur Analysen',
        [ProcessingRestrictionType.AI_TRAINING]: 'Nur KI-Training'
    }
    return names[type] || type
}

function getRestrictionTypeDescription(type: ProcessingRestrictionType): string {
    const descriptions: Record<ProcessingRestrictionType, string> = {
        [ProcessingRestrictionType.FULL]: 'Alle nicht-essentiellen Verarbeitungen werden eingestellt.',
        [ProcessingRestrictionType.MARKETING_ONLY]: 'Marketing-Kommunikation und personalisierte Werbung werden gestoppt.',
        [ProcessingRestrictionType.ANALYTICS_ONLY]: 'Nutzungsanalysen und Verhaltensauswertungen werden gestoppt.',
        [ProcessingRestrictionType.AI_TRAINING]: 'Ihre Daten werden nicht mehr für KI-Training verwendet.'
    }
    return descriptions[type] || ''
}

function getRestrictionReasonName(reason: ProcessingRestrictionReason): string {
    const names: Record<ProcessingRestrictionReason, string> = {
        [ProcessingRestrictionReason.USER_REQUEST]: 'Benutzeranfrage',
        [ProcessingRestrictionReason.ACCURACY_DISPUTE]: 'Richtigkeit angezweifelt',
        [ProcessingRestrictionReason.UNLAWFUL_PROCESSING]: 'Unrechtmäßige Verarbeitung',
        [ProcessingRestrictionReason.LEGAL_CLAIMS]: 'Rechtliche Ansprüche',
        [ProcessingRestrictionReason.OBJECTION_PENDING]: 'Widerspruch in Prüfung'
    }
    return names[reason] || reason
}

function getRestrictionReasonArticle(reason: ProcessingRestrictionReason): string {
    const articles: Record<ProcessingRestrictionReason, string> = {
        [ProcessingRestrictionReason.USER_REQUEST]: 'Art. 18 Abs. 1 DSGVO',
        [ProcessingRestrictionReason.ACCURACY_DISPUTE]: 'Art. 18 Abs. 1 lit. a DSGVO',
        [ProcessingRestrictionReason.UNLAWFUL_PROCESSING]: 'Art. 18 Abs. 1 lit. b DSGVO',
        [ProcessingRestrictionReason.LEGAL_CLAIMS]: 'Art. 18 Abs. 1 lit. c DSGVO',
        [ProcessingRestrictionReason.OBJECTION_PENDING]: 'Art. 18 Abs. 1 lit. d DSGVO'
    }
    return articles[reason] || ''
}

// Export als Objekt für Router
export default {
    // Consent
    grantConsent,
    withdrawConsent,
    getConsents,
    updateAllConsents,
    
    // Export
    requestDataExport,
    getExportStatus,
    downloadExport,
    
    // Deletion
    requestDeletion,
    cancelDeletion,
    getDeletionStatus,
    getUserDeletionRequests,
    
    // Restriction
    requestProcessingRestriction,
    liftProcessingRestriction,
    getProcessingRestrictions,
    
    // Privacy Center
    getPrivacyCenter,
    
    // Admin
    getGDPRStats,
    updateGDPRSettings,
    runRetentionCleanup
}
