/**
 * M.A.T.E. TLS/HTTPS Configuration
 * 
 * Konfiguriert TLS-Sicherheitseinstellungen für die Anwendung.
 * 
 * In Railway wird TLS durch den Load Balancer automatisch bereitgestellt.
 * Diese Middleware sorgt für zusätzliche Sicherheit auf Anwendungsebene:
 * - HTTPS-Redirect erzwingen
 * - HSTS (HTTP Strict Transport Security)
 * - Sichere Cookie-Konfiguration
 * - TLS-Version Minimum
 * 
 * @module middleware/tls
 */

import { Request, Response, NextFunction } from 'express'

/**
 * TLS-Konfigurationsoptionen
 */
export interface TLSConfig {
    enforceHttps: boolean
    hstsMaxAge: number           // HSTS max-age in Sekunden (Standard: 1 Jahr)
    hstsIncludeSubdomains: boolean
    hstsPreload: boolean
    minTlsVersion: '1.2' | '1.3'
    trustProxy: boolean
}

/**
 * Standard TLS-Konfiguration
 */
export const DEFAULT_TLS_CONFIG: TLSConfig = {
    enforceHttps: process.env.NODE_ENV === 'production',
    hstsMaxAge: 31536000,        // 1 Jahr
    hstsIncludeSubdomains: true,
    hstsPreload: true,
    minTlsVersion: '1.3',
    trustProxy: true              // Railway/Load Balancer
}

/**
 * HTTPS-Redirect Middleware
 * Leitet HTTP-Anfragen auf HTTPS um (außer in Development)
 */
export function httpsRedirect(config: Partial<TLSConfig> = {}) {
    const cfg: TLSConfig = { ...DEFAULT_TLS_CONFIG, ...config }

    return (req: Request, res: Response, next: NextFunction) => {
        // Nicht in Development erzwingen
        if (process.env.NODE_ENV === 'development') {
            return next()
        }

        // Health-Checks ohne HTTPS zulassen
        if (req.path === '/health' || req.path === '/api/v1/ping') {
            return next()
        }

        // Prüfe ob Anfrage bereits HTTPS ist
        // x-forwarded-proto wird von Railway/Load Balancer gesetzt
        const protocol = req.get('x-forwarded-proto') || req.protocol
        
        if (cfg.enforceHttps && protocol !== 'https') {
            const httpsUrl = `https://${req.get('host')}${req.originalUrl}`
            return res.redirect(301, httpsUrl)
        }

        next()
    }
}

/**
 * HSTS (HTTP Strict Transport Security) Middleware
 * Erzwingt HTTPS für alle zukünftigen Anfragen des Browsers
 */
export function hsts(config: Partial<TLSConfig> = {}) {
    const cfg: TLSConfig = { ...DEFAULT_TLS_CONFIG, ...config }

    return (req: Request, res: Response, next: NextFunction) => {
        // Nur in Production aktivieren
        if (process.env.NODE_ENV !== 'production') {
            return next()
        }

        // HSTS Header bauen
        let hstsValue = `max-age=${cfg.hstsMaxAge}`
        
        if (cfg.hstsIncludeSubdomains) {
            hstsValue += '; includeSubDomains'
        }
        
        if (cfg.hstsPreload) {
            hstsValue += '; preload'
        }

        res.setHeader('Strict-Transport-Security', hstsValue)
        next()
    }
}

/**
 * Sichere Security Headers Middleware
 * Setzt verschiedene Sicherheits-Header
 */
export function securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
        // Content-Type-Optionen
        res.setHeader('X-Content-Type-Options', 'nosniff')

        // Frame-Optionen (Clickjacking-Schutz)
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')

        // XSS-Filter
        res.setHeader('X-XSS-Protection', '1; mode=block')

        // Referrer-Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

        // Content-Security-Policy (Basic)
        res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.openrouter.ai https://api.vapi.ai wss:",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; '))

        // Permissions-Policy
        res.setHeader('Permissions-Policy', [
            'geolocation=()',
            'microphone=(self)',  // Für Voice-Funktionen
            'camera=()',
            'payment=()'
        ].join(', '))

        next()
    }
}

/**
 * Sichere Cookie-Konfiguration
 */
export const SECURE_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 Stunden
    path: '/'
}

/**
 * TLS-Info Header Middleware
 * Fügt Debug-Informationen hinzu (nur in Development)
 */
export function tlsInfo(config: Partial<TLSConfig> = {}) {
    const cfg: TLSConfig = { ...DEFAULT_TLS_CONFIG, ...config }

    return (req: Request, res: Response, next: NextFunction) => {
        if (process.env.NODE_ENV === 'development') {
            const protocol = req.get('x-forwarded-proto') || req.protocol
            res.setHeader('X-TLS-Protocol', protocol)
            res.setHeader('X-TLS-Min-Version', cfg.minTlsVersion)
        }
        next()
    }
}

/**
 * Kombinierte TLS-Middleware
 * Wendet alle TLS-bezogenen Middlewares an
 */
export function tlsSecurity(config: Partial<TLSConfig> = {}) {
    const middlewares = [
        httpsRedirect(config),
        hsts(config),
        securityHeaders(),
        tlsInfo(config)
    ]

    return (req: Request, res: Response, next: NextFunction) => {
        // Führe alle Middlewares sequentiell aus
        let index = 0

        const runNext = (err?: any) => {
            if (err) return next(err)
            if (index >= middlewares.length) return next()
            
            const middleware = middlewares[index++]
            middleware(req, res, runNext)
        }

        runNext()
    }
}

/**
 * Prüft TLS-Verbindungsinformationen
 */
export function getTlsConnectionInfo(req: Request): {
    isSecure: boolean
    protocol: string
    cipherSuite: string | null
    tlsVersion: string | null
} {
    const isSecure = req.secure || req.get('x-forwarded-proto') === 'https'
    const protocol = req.get('x-forwarded-proto') || req.protocol

    // In Railway wird TLS vom Load Balancer terminiert
    // Diese Infos sind nicht verfügbar, da die interne Verbindung HTTP ist
    return {
        isSecure,
        protocol,
        cipherSuite: null,
        tlsVersion: null
    }
}

/**
 * Express-App TLS-Konfiguration
 * Anzuwenden auf die Express-App beim Start
 */
export function configureTlsForApp(app: any, config: Partial<TLSConfig> = {}): void {
    const cfg: TLSConfig = { ...DEFAULT_TLS_CONFIG, ...config }

    // Trust Proxy für Railway/Load Balancer
    if (cfg.trustProxy) {
        app.set('trust proxy', 1)
    }

    // TLS-Middleware anwenden
    app.use(tlsSecurity(config))

    console.log('[TLS] Security-Konfiguration aktiviert:')
    console.log(`  - HTTPS-Redirect: ${cfg.enforceHttps ? 'Aktiviert' : 'Deaktiviert'}`)
    console.log(`  - HSTS: max-age=${cfg.hstsMaxAge}s, includeSubDomains=${cfg.hstsIncludeSubdomains}, preload=${cfg.hstsPreload}`)
    console.log(`  - Min. TLS-Version: ${cfg.minTlsVersion}`)
}

export default {
    httpsRedirect,
    hsts,
    securityHeaders,
    tlsSecurity,
    configureTlsForApp,
    getTlsConnectionInfo,
    SECURE_COOKIE_OPTIONS,
    DEFAULT_TLS_CONFIG
}
