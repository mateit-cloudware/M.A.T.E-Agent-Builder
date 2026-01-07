/**
 * M.A.T.E. API-Key Controller (BYOK)
 * 
 * Endpunkte für API-Key-Management:
 * - POST /api/v1/credentials/validate - Validiert einen API-Key
 * - POST /api/v1/credentials - Speichert einen validierten API-Key
 * - GET /api/v1/credentials - Listet alle Keys eines Users
 * - GET /api/v1/credentials/:id - Holt einen spezifischen Key
 * - DELETE /api/v1/credentials/:id - Löscht einen Key
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../DataSource'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { UserAPIKey, ApiKeyProvider, ApiKeyStatus } from '../database/entities/user-api-key.entity'
import { apiKeyValidatorService } from '../services/api-key-validator.service'
import { encryptionService } from '../services/encryption.service'
import logger from '../../utils/logger'

export class APIKeyController {
    /**
     * POST /api/v1/credentials/validate
     * Validiert einen API-Key ohne ihn zu speichern
     */
    public async validateKey(req: Request, res: Response, next: NextFunction) {
        try {
            const { apiKey, provider = 'openrouter' } = req.body

            if (!apiKey) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'API-Key fehlt')
            }

            // Provider auto-detection falls nicht angegeben
            const detectedProvider = provider || apiKeyValidatorService.detectProvider(apiKey)

            // Validierung durchführen
            const result = await apiKeyValidatorService.validate(
                apiKey, 
                detectedProvider as ApiKeyProvider,
                false // Test-Call durchführen
            )

            logger.info('[APIKey] Validierung durchgeführt', {
                userId: (req as any).user?.id,
                provider: detectedProvider,
                valid: result.valid
            })

            return res.status(StatusCodes.OK).json(result)
        } catch (error) {
            next(error)
        }
    }

    /**
     * POST /api/v1/credentials
     * Speichert einen validierten API-Key verschlüsselt
     */
    public async createKey(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = (req as any).user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Nicht authentifiziert')
            }

            const { apiKey, provider = 'openrouter', name } = req.body

            if (!apiKey) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'API-Key fehlt')
            }

            // Provider auto-detection
            const detectedProvider = provider || apiKeyValidatorService.detectProvider(apiKey)

            // Validierung durchführen
            const validation = await apiKeyValidatorService.validate(
                apiKey,
                detectedProvider as ApiKeyProvider,
                false // Test-Call durchführen
            )

            if (!validation.valid) {
                throw new InternalFlowiseError(
                    StatusCodes.BAD_REQUEST,
                    validation.error || 'API-Key ungültig'
                )
            }

            // Key-Hash für Duplicate-Check
            const keyHash = encryptionService.sha256(apiKey)

            // Prüfe ob Key bereits existiert
            const appServer = getRunningExpressApp()
            const apiKeyRepo = appServer.AppDataSource.getRepository(UserAPIKey)

            const existingKey = await apiKeyRepo.findOne({
                where: {
                    userId: currentUser.id,
                    keyHash,
                    deletedAt: null as any
                }
            })

            if (existingKey) {
                throw new InternalFlowiseError(
                    StatusCodes.CONFLICT,
                    'Dieser API-Key wurde bereits hinzugefügt'
                )
            }

            // Verschlüsseln mit PBKDF2
            const encryptedKey = await encryptionService.encryptApiKey(apiKey)
            
            // IV und AuthTag aus verschlüsseltem String extrahieren
            // Format: v2:iv:authTag:ciphertext
            const parts = encryptedKey.replace('v2:', '').split(':')
            const iv = parts[0]
            const authTag = parts[1]

            // Speichern
            const newKey = apiKeyRepo.create({
                userId: currentUser.id,
                provider: detectedProvider as ApiKeyProvider,
                name: name || `${detectedProvider} Key`,
                encryptedKey,
                iv,
                authTag,
                keyHash,
                lastValidated: new Date(),
                status: validation.hasBalance ? ApiKeyStatus.ACTIVE : ApiKeyStatus.PENDING_VALIDATION,
                estimatedBalance: validation.estimatedBalance,
                currency: validation.currency
            })

            await apiKeyRepo.save(newKey)

            logger.info('[APIKey] Key gespeichert', {
                userId: currentUser.id,
                keyId: newKey.id,
                provider: detectedProvider
            })

            // Response ohne sensible Daten
            return res.status(StatusCodes.CREATED).json({
                id: newKey.id,
                provider: newKey.provider,
                name: newKey.name,
                status: newKey.status,
                lastValidated: newKey.lastValidated,
                hasBalance: validation.hasBalance,
                estimatedBalance: newKey.estimatedBalance,
                currency: newKey.currency,
                createdAt: newKey.createdAt
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * GET /api/v1/credentials
     * Listet alle API-Keys des aktuellen Users
     */
    public async listKeys(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = (req as any).user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Nicht authentifiziert')
            }

            const appServer = getRunningExpressApp()
            const apiKeyRepo = appServer.AppDataSource.getRepository(UserAPIKey)

            const keys = await apiKeyRepo.find({
                where: {
                    userId: currentUser.id,
                    deletedAt: null as any
                },
                order: {
                    createdAt: 'DESC'
                }
            })

            // Sensible Daten entfernen
            const sanitizedKeys = keys.map(key => ({
                id: key.id,
                provider: key.provider,
                name: key.name,
                status: key.status,
                lastValidated: key.lastValidated,
                lastUsed: key.lastUsed,
                estimatedBalance: key.estimatedBalance,
                currency: key.currency,
                expiresAt: key.expiresAt,
                isExpired: key.isExpired,
                isActive: key.isActive,
                expirationWarning: key.expirationWarning,
                createdAt: key.createdAt,
                updatedAt: key.updatedAt
            }))

            return res.status(StatusCodes.OK).json(sanitizedKeys)
        } catch (error) {
            next(error)
        }
    }

    /**
     * GET /api/v1/credentials/:id
     * Holt einen spezifischen API-Key
     */
    public async getKey(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = (req as any).user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Nicht authentifiziert')
            }

            const { id } = req.params

            const appServer = getRunningExpressApp()
            const apiKeyRepo = appServer.AppDataSource.getRepository(UserAPIKey)

            const key = await apiKeyRepo.findOne({
                where: {
                    id,
                    userId: currentUser.id,
                    deletedAt: null as any
                }
            })

            if (!key) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'API-Key nicht gefunden')
            }

            // Sensible Daten entfernen
            return res.status(StatusCodes.OK).json({
                id: key.id,
                provider: key.provider,
                name: key.name,
                status: key.status,
                lastValidated: key.lastValidated,
                lastUsed: key.lastUsed,
                estimatedBalance: key.estimatedBalance,
                currency: key.currency,
                expiresAt: key.expiresAt,
                isExpired: key.isExpired,
                isActive: key.isActive,
                metadata: key.metadata,
                createdAt: key.createdAt,
                updatedAt: key.updatedAt
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * DELETE /api/v1/credentials/:id
     * Löscht (Soft-Delete) einen API-Key
     */
    public async deleteKey(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = (req as any).user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Nicht authentifiziert')
            }

            const { id } = req.params

            const appServer = getRunningExpressApp()
            const apiKeyRepo = appServer.AppDataSource.getRepository(UserAPIKey)

            const key = await apiKeyRepo.findOne({
                where: {
                    id,
                    userId: currentUser.id,
                    deletedAt: null as any
                }
            })

            if (!key) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'API-Key nicht gefunden')
            }

            // Soft-Delete
            key.deletedAt = new Date()
            key.status = ApiKeyStatus.REVOKED
            await apiKeyRepo.save(key)

            logger.info('[APIKey] Key gelöscht', {
                userId: currentUser.id,
                keyId: key.id,
                provider: key.provider
            })

            return res.status(StatusCodes.OK).json({
                message: 'API-Key erfolgreich gelöscht',
                id: key.id
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * PATCH /api/v1/credentials/:id/revalidate
     * Validiert einen gespeicherten Key erneut
     */
    public async revalidateKey(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = (req as any).user
            if (!currentUser) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Nicht authentifiziert')
            }

            const { id } = req.params

            const appServer = getRunningExpressApp()
            const apiKeyRepo = appServer.AppDataSource.getRepository(UserAPIKey)

            const key = await apiKeyRepo.findOne({
                where: {
                    id,
                    userId: currentUser.id,
                    deletedAt: null as any
                }
            })

            if (!key) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'API-Key nicht gefunden')
            }

            // Entschlüsseln
            const decryptedKey = await encryptionService.decryptApiKey(key.encryptedKey)

            // Neu validieren
            const validation = await apiKeyValidatorService.validate(
                decryptedKey,
                key.provider,
                false
            )

            // Update
            key.lastValidated = new Date()
            key.status = validation.valid 
                ? (validation.hasBalance ? ApiKeyStatus.ACTIVE : ApiKeyStatus.PENDING_VALIDATION)
                : ApiKeyStatus.SUSPENDED
            key.estimatedBalance = validation.estimatedBalance
            key.lastValidationError = validation.error

            if (!validation.valid) {
                key.failedValidationAttempts += 1
            } else {
                key.failedValidationAttempts = 0
            }

            await apiKeyRepo.save(key)

            logger.info('[APIKey] Key revalidiert', {
                userId: currentUser.id,
                keyId: key.id,
                valid: validation.valid
            })

            return res.status(StatusCodes.OK).json({
                valid: validation.valid,
                hasBalance: validation.hasBalance,
                estimatedBalance: key.estimatedBalance,
                status: key.status,
                error: validation.error
            })
        } catch (error) {
            next(error)
        }
    }
}
