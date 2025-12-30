/**
 * M.A.T.E. SSO Authentication Middleware
 * 
 * This middleware validates JWT tokens from the M.A.T.E. Dashboard
 * and creates/retrieves a real user with full Organization/Workspace support.
 * 
 * The token can be passed via:
 * - URL query parameter: ?mateToken=xxx
 * - Authorization header: Bearer xxx
 * - Cookie: mateToken
 */

import express, { NextFunction, Request, Response } from 'express'
import jwt, { sign } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { LoggedInUser, IAssignedWorkspace } from '../Interface.Enterprise'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { OrganizationService } from '../services/organization.service'
import { WorkspaceService } from '../services/workspace.service'
import { WorkspaceUserService } from '../services/workspace-user.service'
import { OrganizationUserService } from '../services/organization-user.service'
import { UserService } from '../services/user.service'
import { RoleService } from '../services/role.service'
import { GeneralRole } from '../database/entities/role.entity'
import { Organization, OrganizationName } from '../database/entities/organization.entity'
import { Workspace, WorkspaceName } from '../database/entities/workspace.entity'
import { User, UserStatus } from '../database/entities/user.entity'
import { OrganizationUserStatus } from '../database/entities/organization-user.entity'
import { WorkspaceUserStatus } from '../database/entities/workspace-user.entity'
import logger from '../../utils/logger'

// M.A.T.E. JWT Secret - must match the Go backend's JWT_SECRET
const MATE_JWT_SECRET = process.env.MATE_JWT_SECRET || process.env.JWT_SECRET || 'your-jwt-secret'

// Enable/disable M.A.T.E. SSO
const MATE_SSO_ENABLED = process.env.MATE_SSO_ENABLED !== 'false'

interface MateTokenPayload {
    user_id: string
    email: string
    name?: string
    exp: number
    iat: number
}

/**
 * Extract M.A.T.E. token from request
 */
const extractMateToken = (req: Request): string | null => {
    // 1. Check URL query parameter
    if (req.query.mateToken) {
        return req.query.mateToken as string
    }

    // 2. Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7)
    }

    // 3. Check cookies
    if (req.cookies && req.cookies.mateToken) {
        return req.cookies.mateToken
    }

    // 4. Check for token query param (fallback)
    if (req.query.token) {
        return req.query.token as string
    }

    return null
}

/**
 * Validate M.A.T.E. JWT token
 */
const validateMateToken = (token: string): MateTokenPayload | null => {
    try {
        const decoded = jwt.verify(token, MATE_JWT_SECRET) as MateTokenPayload
        return decoded
    } catch (error) {
        logger.debug('[M.A.T.E. SSO] Token validation failed:', error)
        return null
    }
}

// Cache for organization/workspace IDs to avoid repeated DB lookups
let cachedMateOrgData: { organizationId: string; workspaceId: string; ownerRoleId: string } | null = null

/**
 * Get or create M.A.T.E. organization and default workspace
 * Creates real database entries following Flowise's structure
 */
const getOrCreateMateOrganization = async (): Promise<{ organizationId: string; workspaceId: string; ownerRoleId: string }> => {
    // Return cached data if available
    if (cachedMateOrgData) {
        return cachedMateOrgData
    }

    const appServer = getRunningExpressApp()
    const queryRunner = appServer.AppDataSource.createQueryRunner()
    await queryRunner.connect()

    try {
        const orgService = new OrganizationService()
        const workspaceService = new WorkspaceService()
        const roleService = new RoleService()

        // Get Owner role
        const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        // Check if organizations exist
        const organizations = await orgService.readOrganization(queryRunner)
        let mateOrg = organizations.find((org: Organization) => org.name === 'M.A.T.E.' || org.name === OrganizationName.DEFAULT_ORGANIZATION)

        if (!mateOrg && organizations.length > 0) {
            // Use first available organization
            mateOrg = organizations[0]
            logger.info(`[M.A.T.E. SSO] Using existing organization: ${mateOrg.name}`)
        }

        if (!mateOrg) {
            // No organization exists - this is first setup
            logger.warn('[M.A.T.E. SSO] No organization found, SSO users will need initial setup')
            cachedMateOrgData = {
                organizationId: '',
                workspaceId: '',
                ownerRoleId: ownerRole.id
            }
            return cachedMateOrgData
        }

        // Get workspaces for this organization
        const workspaces = await workspaceService.readWorkspaceByOrganizationId(mateOrg.id, queryRunner)
        let defaultWorkspace = workspaces.find((ws: Workspace & { userCount: number }) => 
            ws.name === WorkspaceName.DEFAULT_WORKSPACE || ws.name === 'Default' || ws.name === 'Personal Workspace'
        )

        if (!defaultWorkspace && workspaces.length > 0) {
            defaultWorkspace = workspaces[0]
            logger.info(`[M.A.T.E. SSO] Using existing workspace: ${defaultWorkspace.name}`)
        }

        cachedMateOrgData = {
            organizationId: mateOrg.id,
            workspaceId: defaultWorkspace?.id || '',
            ownerRoleId: ownerRole.id
        }

        logger.info(`[M.A.T.E. SSO] Configured org=${mateOrg.id}, workspace=${defaultWorkspace?.id || 'none'}`)
        return cachedMateOrgData
    } finally {
        await queryRunner.release()
    }
}

/**
 * Get or create a real user in Flowise database based on M.A.T.E. token
 * Creates full User, OrganizationUser, Workspace, and WorkspaceUser entries
 */
const getOrCreateMateUser = async (payload: MateTokenPayload): Promise<LoggedInUser> => {
    const appServer = getRunningExpressApp()
    const queryRunner = appServer.AppDataSource.createQueryRunner()
    await queryRunner.connect()

    try {
        const userService = new UserService()
        const orgService = new OrganizationService()
        const workspaceService = new WorkspaceService()
        const workspaceUserService = new WorkspaceUserService()
        const orgUserService = new OrganizationUserService()
        const roleService = new RoleService()

        // Get roles
        const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)

        // Check if user already exists
        let user: User | null = null
        try {
            user = await userService.readUserByEmail(payload.email, queryRunner)
        } catch (error) {
            // User not found - will create
        }

        let organization: Organization | null = null
        let workspace: any = null
        let workspaceUser: any = null

        if (user) {
            // User exists - get their workspace
            logger.info(`[M.A.T.E. SSO] Found existing user: ${user.email}`)
            
            // Get user's workspace assignments
            const workspaceUsers = await workspaceUserService.readWorkspaceUserByUserId(user.id, queryRunner)
            
            if (workspaceUsers && (Array.isArray(workspaceUsers) ? workspaceUsers.length > 0 : workspaceUsers)) {
                workspaceUser = Array.isArray(workspaceUsers) ? workspaceUsers[0] : workspaceUsers
                workspace = workspaceUser.workspace
                
                // Get organization from workspace
                if (workspace?.organizationId) {
                    organization = await orgService.readOrganizationById(workspace.organizationId, queryRunner)
                }
            }
        } else {
            // Create new user
            logger.info(`[M.A.T.E. SSO] Creating new user: ${payload.email}`)
            
            await queryRunner.startTransaction()
            
            try {
                // Check for existing organizations and users
                const organizations = await orgService.readOrganization(queryRunner)
                
                // Find an existing user to use as createdBy (FK constraint requires existing user)
                let creatorId: string | null = null
                const existingUsers = await queryRunner.manager.find(User, { take: 1 })
                if (existingUsers.length > 0) {
                    creatorId = existingUsers[0].id
                    logger.info(`[M.A.T.E. SSO] Using existing user ${creatorId} as creator`)
                }
                
                if (organizations.length > 0) {
                    // Use existing organization
                    organization = organizations[0]
                    
                    // Create new user with existing user as createdBy
                    if (creatorId) {
                        const newUser = queryRunner.manager.create(User, {
                            email: payload.email,
                            name: payload.name || payload.email.split('@')[0],
                            status: UserStatus.ACTIVE,
                            createdBy: creatorId,
                            updatedBy: creatorId
                        })
                        user = await queryRunner.manager.save(User, newUser)
                        logger.info(`[M.A.T.E. SSO] Created user: ${user!.id}`)
                    } else {
                        // No existing user - this is a fresh database bootstrap
                        // Use raw query with deferred FK constraint for self-referencing first user
                        const newUserId = uuidv4()
                        await queryRunner.query(`SET CONSTRAINTS ALL DEFERRED`)
                        await queryRunner.query(
                            `INSERT INTO "user" (id, email, name, status, "createdBy", "updatedBy", "createdDate", "updatedDate") 
                             VALUES ($1, $2, $3, $4, $1, $1, NOW(), NOW())`,
                            [newUserId, payload.email, payload.name || payload.email.split('@')[0], UserStatus.ACTIVE]
                        )
                        await queryRunner.query(`SET CONSTRAINTS ALL IMMEDIATE`)
                        user = await queryRunner.manager.findOne(User, { where: { id: newUserId } })
                        logger.info(`[M.A.T.E. SSO] Bootstrap: Created first user with self-reference: ${user!.id}`)
                    }
                } else {
                    // No organization exists - bootstrap scenario
                    if (!creatorId) {
                        // Use raw query with deferred FK constraint for self-referencing first user
                        const newUserId = uuidv4()
                        await queryRunner.query(`SET CONSTRAINTS ALL DEFERRED`)
                        await queryRunner.query(
                            `INSERT INTO "user" (id, email, name, status, "createdBy", "updatedBy", "createdDate", "updatedDate") 
                             VALUES ($1, $2, $3, $4, $1, $1, NOW(), NOW())`,
                            [newUserId, payload.email, payload.name || payload.email.split('@')[0], UserStatus.ACTIVE]
                        )
                        await queryRunner.query(`SET CONSTRAINTS ALL IMMEDIATE`)
                        user = await queryRunner.manager.findOne(User, { where: { id: newUserId } })
                        creatorId = user!.id
                        logger.info(`[M.A.T.E. SSO] Bootstrap: Created first user with self-reference: ${user!.id}`)
                    } else {
                        // Create user with existing creator
                        const newUser = queryRunner.manager.create(User, {
                            email: payload.email,
                            name: payload.name || payload.email.split('@')[0],
                            status: UserStatus.ACTIVE,
                            createdBy: creatorId,
                            updatedBy: creatorId
                        })
                        user = await queryRunner.manager.save(User, newUser)
                        logger.info(`[M.A.T.E. SSO] Created user: ${user!.id}`)
                    }
                    
                    // Now create organization with user's ID
                    const newOrg = queryRunner.manager.create(Organization, {
                        name: OrganizationName.DEFAULT_ORGANIZATION,
                        createdBy: user!.id,
                        updatedBy: user!.id
                    })
                    organization = await queryRunner.manager.save(Organization, newOrg)
                    logger.info(`[M.A.T.E. SSO] Created organization: ${organization!.id}`)
                }

                // Create OrganizationUser
                const { OrganizationUser } = await import('../database/entities/organization-user.entity')
                const newOrgUser = queryRunner.manager.create(OrganizationUser, {
                    organizationId: organization!.id,
                    userId: user!.id,
                    roleId: ownerRole.id,
                    status: OrganizationUserStatus.ACTIVE,
                    createdBy: user!.id,
                    updatedBy: user!.id
                })
                await queryRunner.manager.save(OrganizationUser, newOrgUser)
                logger.info(`[M.A.T.E. SSO] Created organization user`)

                // Check for existing workspaces
                const workspaces = await workspaceService.readWorkspaceByOrganizationId(organization!.id, queryRunner)
                
                if (workspaces.length > 0) {
                    workspace = workspaces[0]
                } else {
                    // Create workspace
                    const newWorkspace = queryRunner.manager.create(Workspace, {
                        name: WorkspaceName.DEFAULT_WORKSPACE,
                        organizationId: organization!.id,
                        createdBy: user!.id,
                        updatedBy: user!.id
                    })
                    workspace = await queryRunner.manager.save(Workspace, newWorkspace)
                    logger.info(`[M.A.T.E. SSO] Created workspace: ${workspace.id}`)
                }

                // Create WorkspaceUser
                const { WorkspaceUser } = await import('../database/entities/workspace-user.entity')
                const newWsUser = queryRunner.manager.create(WorkspaceUser, {
                    workspaceId: workspace.id,
                    userId: user!.id,
                    roleId: ownerRole.id,
                    status: WorkspaceUserStatus.ACTIVE,
                    createdBy: user!.id,
                    updatedBy: user!.id
                })
                workspaceUser = await queryRunner.manager.save(WorkspaceUser, newWsUser)
                logger.info(`[M.A.T.E. SSO] Created workspace user`)

                await queryRunner.commitTransaction()
            } catch (error) {
                await queryRunner.rollbackTransaction()
                throw error
            }
        }

        // Build LoggedInUser object
        const assignedWorkspaces: IAssignedWorkspace[] = []
        if (workspace) {
            assignedWorkspaces.push({
                id: workspace.id,
                name: workspace.name,
                role: ownerRole.name,
                organizationId: organization?.id || ''
            })
        }

        // Get user's permissions from role
        let permissions: string[] = ['*'] // Default to full permissions for M.A.T.E. SSO users
        if (workspaceUser?.role?.permissions) {
            try {
                permissions = JSON.parse(workspaceUser.role.permissions)
            } catch (e) {
                // Keep default permissions
            }
        }

        const loggedInUser: LoggedInUser = {
            id: user!.id,
            email: user!.email || '',
            name: user!.name || '',
            roleId: ownerRole.id,
            activeOrganizationId: organization?.id || '',
            activeOrganizationSubscriptionId: organization?.subscriptionId || '',
            activeOrganizationCustomerId: organization?.customerId || '',
            activeOrganizationProductId: '',
            isOrganizationAdmin: true,
            activeWorkspaceId: workspace?.id || '',
            activeWorkspace: workspace?.name || '',
            assignedWorkspaces,
            permissions,
            features: {}
        }

        return loggedInUser
    } finally {
        await queryRunner.release()
    }
}

/**
 * M.A.T.E. SSO Middleware
 * 
 * This middleware intercepts requests and checks for M.A.T.E. tokens.
 * If a valid token is found, it creates a virtual user session.
 */
export const mateAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (!MATE_SSO_ENABLED) {
        return next()
    }

    try {
        const token = extractMateToken(req)
        
        if (!token) {
            return next()
        }

        const payload = validateMateToken(token)
        
        if (!payload) {
            logger.debug('[M.A.T.E. SSO] Invalid token provided')
            return next()
        }

        // Get or create real user with full Organization/Workspace
        const loggedInUser = await getOrCreateMateUser(payload)
        
        // Set user on request
        req.user = loggedInUser

        // Store token in cookie for subsequent requests
        res.cookie('mateToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        })

        // Also set the Flowise token cookie for compatibility
        const flowiseToken = jwt.sign(
            { 
                id: loggedInUser.id, 
                username: loggedInUser.name,
                meta: Buffer.from(`${loggedInUser.id}:${loggedInUser.activeWorkspaceId}`).toString('base64')
            },
            process.env.JWT_AUTH_TOKEN_SECRET || 'auth_token',
            { expiresIn: '6h' }
        )

        res.cookie('token', flowiseToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })

        logger.info(`[M.A.T.E. SSO] User authenticated: ${loggedInUser.email} (org: ${loggedInUser.activeOrganizationId}, ws: ${loggedInUser.activeWorkspaceId})`)
        
        next()
    } catch (error) {
        logger.error('[M.A.T.E. SSO] Error in auth middleware:', error)
        next()
    }
}

/**
 * Check if request is from M.A.T.E. Dashboard (for bypassing certain auth checks)
 */
export const isMateRequest = (req: Request): boolean => {
    return !!extractMateToken(req)
}

/**
 * API endpoint to validate M.A.T.E. token and return user info
 */
export const mateTokenValidationHandler = async (req: Request, res: Response) => {
    const token = extractMateToken(req)
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' })
    }

    const payload = validateMateToken(token)
    
    if (!payload) {
        return res.status(401).json({ error: 'Invalid token' })
    }

    try {
        const loggedInUser = await getOrCreateMateUser(payload)
        return res.json({ 
            valid: true, 
            user: {
                id: loggedInUser.id,
                email: loggedInUser.email,
                name: loggedInUser.name,
                organizationId: loggedInUser.activeOrganizationId,
                workspaceId: loggedInUser.activeWorkspaceId,
                workspaceName: loggedInUser.activeWorkspace,
                assignedWorkspaces: loggedInUser.assignedWorkspaces
            }
        })
    } catch (error) {
        logger.error('[M.A.T.E. SSO] Error creating user:', error)
        return res.status(500).json({ error: 'Failed to create user session' })
    }
}

// Export for auth controller
export { getOrCreateMateUser }

export default mateAuthMiddleware
