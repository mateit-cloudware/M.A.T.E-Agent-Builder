import { NextFunction, Request, Response } from 'express'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { mateTokenValidationHandler, getOrCreateMateUser } from '../../middleware/mateAuth'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { generateSafeCopy } from '../../utils/tempTokenUtils'

// M.A.T.E. JWT Secret - must match the Go backend's JWT_SECRET
const MATE_JWT_SECRET = process.env.MATE_JWT_SECRET || process.env.JWT_SECRET || 'your-jwt-secret'
const jwtAuthTokenSecret = process.env.JWT_AUTH_TOKEN_SECRET || 'auth_token'
const jwtRefreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET || process.env.JWT_AUTH_TOKEN_SECRET || 'refresh_token'
const jwtAudience = process.env.JWT_AUDIENCE || 'AUDIENCE'
const jwtIssuer = process.env.JWT_ISSUER || 'ISSUER'
const secureCookie = process.env.SECURE_COOKIES === 'true' || process.env.APP_URL?.startsWith('https') || false

interface MateTokenPayload {
    user_id: string
    email: string
    name?: string
    sub?: string
    exp: number
    iat: number
}

const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        return res.json(appServer.identityManager.getPermissions())
    } catch (error) {
        next(error)
    }
}

const ssoSuccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const ssoToken = req.query.token as string
        const user = await appServer.cachePool.getSSOTokenCache(ssoToken)
        if (!user) return res.status(401).json({ message: 'Invalid or expired SSO token' })
        await appServer.cachePool.deleteSSOTokenCache(ssoToken)
        return res.json(user)
    } catch (error) {
        next(error)
    }
}

/**
 * M.A.T.E. SSO Handler - validates M.A.T.E. JWT and creates a real Flowise user
 * with full Organization/Workspace support
 * Accessed via /api/v1/auth/mate-sso?token=xxx
 */
const mateSsoHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const mateToken = req.query.token as string || req.query.mateToken as string
        
        if (!mateToken) {
            return res.status(400).json({ error: 'No M.A.T.E. token provided' })
        }

        // Validate M.A.T.E. token
        let payload: MateTokenPayload
        try {
            payload = jwt.verify(mateToken, MATE_JWT_SECRET) as MateTokenPayload
        } catch (error) {
            return res.status(401).json({ error: 'Invalid M.A.T.E. token' })
        }

        // Create or get real user with full Organization/Workspace
        const loggedInUser = await getOrCreateMateUser({
            user_id: payload.user_id || payload.sub || '',
            email: payload.email,
            name: payload.name,
            exp: payload.exp,
            iat: payload.iat
        })

        // Generate Flowise JWT tokens
        const encryptedMeta = Buffer.from(`${loggedInUser.id}:${loggedInUser.activeWorkspaceId}`).toString('base64')
        
        const flowiseToken = jwt.sign(
            { id: loggedInUser.id, username: loggedInUser.name, meta: encryptedMeta },
            jwtAuthTokenSecret,
            { expiresIn: '6h', algorithm: 'HS256', audience: jwtAudience, issuer: jwtIssuer }
        )

        const refreshToken = jwt.sign(
            { id: loggedInUser.id, username: loggedInUser.name, meta: encryptedMeta },
            jwtRefreshSecret,
            { expiresIn: '7d', algorithm: 'HS256', audience: jwtAudience, issuer: jwtIssuer }
        )

        // Store user in SSO token cache for sso-success retrieval
        const appServer = getRunningExpressApp()
        const ssoToken = uuidv4()
        const returnUser = generateSafeCopy({
            ...loggedInUser,
            isSSO: true
        })
        appServer.cachePool.addSSOTokenCache(ssoToken, returnUser)

        // Set cookies
        res.cookie('token', flowiseToken, {
            httpOnly: true,
            secure: secureCookie,
            sameSite: 'lax'
        })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: secureCookie,
            sameSite: 'lax'
        })
        res.cookie('mateToken', mateToken, {
            httpOnly: true,
            secure: secureCookie,
            sameSite: 'lax'
        })

        // Redirect to sso-success page
        return res.redirect(`/sso-success?token=${ssoToken}`)
    } catch (error) {
        next(error)
    }
}

/**
 * Validate M.A.T.E. token without redirect (for API calls)
 */
const mateSsoValidate = async (req: Request, res: Response, next: NextFunction) => {
    return mateTokenValidationHandler(req, res)
}
export default {
    getAllPermissions,
    ssoSuccess,
    mateSsoHandler,
    mateSsoValidate
}
