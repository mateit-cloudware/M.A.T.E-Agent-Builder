/**
 * M.A.T.E. Error Tracking & Monitoring Service (Sentry Integration)
 * 
 * Zentrales Error Tracking, Performance Monitoring und Alerting.
 * 
 * Features:
 * - Exception Tracking mit Stack Traces
 * - Performance Monitoring (Transactions, Spans)
 * - User Context und Session Tracking
 * - Breadcrumbs für Debugging
 * - PII Scrubbing
 * - Custom Tags und Metadata
 * 
 * @since 2024-12-31
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export enum ErrorSeverity {
    FATAL = 'fatal',
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    DEBUG = 'debug'
}

export enum ErrorCategory {
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    DATABASE = 'database',
    EXTERNAL_API = 'external_api',
    VALIDATION = 'validation',
    RATE_LIMIT = 'rate_limit',
    BILLING = 'billing',
    LLM = 'llm',
    VOICE = 'voice',
    GUARDRAILS = 'guardrails',
    UNKNOWN = 'unknown'
}

export interface ErrorContext {
    userId?: string
    email?: string
    organizationId?: string
    requestId?: string
    endpoint?: string
    method?: string
    category?: ErrorCategory
    tags?: Record<string, string>
    extra?: Record<string, unknown>
}

export interface PerformanceTransaction {
    name: string
    op: string
    description?: string
    tags?: Record<string, string>
}

export interface BreadcrumbData {
    category: string
    message: string
    level: ErrorSeverity
    data?: Record<string, unknown>
}

// ============================================================================
// ERROR TRACKING SERVICE
// ============================================================================

class ErrorTrackingService {
    private isInitialized = false
    private environment: string
    private release: string
    private dsn: string | undefined

    // PII Patterns für Scrubbing
    private readonly PII_PATTERNS = [
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,  // E-Mail
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,      // Kreditkarte
        /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}/g,  // IBAN
        /\+?\d{1,4}[\s-]?\d{2,4}[\s-]?\d{4,}/g,             // Telefon
        /(password|passwort|kennwort|secret|token|key|auth)[:=]\s*['"]?[^'"\s,}]+/gi
    ]

    constructor() {
        this.environment = process.env.NODE_ENV || 'development'
        this.release = process.env.APP_VERSION || '1.0.0'
        this.dsn = process.env.SENTRY_DSN
    }

    /**
     * Initialisiert Sentry (zu implementieren wenn Sentry verfügbar)
     */
    public initialize(): void {
        if (this.isInitialized) return

        if (!this.dsn) {
            console.log('[ErrorTracking] SENTRY_DSN nicht konfiguriert - lokales Error Tracking aktiv')
            this.isInitialized = true
            return
        }

        // Sentry-Initialisierung würde hier erfolgen
        // import * as Sentry from '@sentry/node'
        // Sentry.init({
        //     dsn: this.dsn,
        //     environment: this.environment,
        //     release: `mate@${this.release}`,
        //     tracesSampleRate: 0.1,
        //     beforeSend: (event) => this.scrubPII(event)
        // })

        console.log(`[ErrorTracking] Initialisiert für Environment: ${this.environment}`)
        this.isInitialized = true
    }

    /**
     * Erfasst eine Exception
     */
    public captureException(error: Error, context?: ErrorContext): string {
        const eventId = this.generateEventId()
        const scrubbedError = this.scrubErrorMessage(error)

        const enrichedContext = {
            ...context,
            eventId,
            timestamp: new Date().toISOString(),
            environment: this.environment,
            release: this.release
        }

        // In Produktion: Sentry.captureException(scrubbedError, { extra: enrichedContext })
        
        // Lokales Logging
        console.error(`[ErrorTracking] Exception captured [${eventId}]:`, {
            message: scrubbedError.message,
            stack: scrubbedError.stack?.substring(0, 500),
            category: context?.category || ErrorCategory.UNKNOWN,
            userId: this.maskUserId(context?.userId)
        })

        return eventId
    }

    /**
     * Erfasst eine Message (kein Error-Objekt)
     */
    public captureMessage(message: string, severity: ErrorSeverity = ErrorSeverity.INFO, context?: ErrorContext): string {
        const eventId = this.generateEventId()
        const scrubbedMessage = this.scrubString(message)

        // In Produktion: Sentry.captureMessage(scrubbedMessage, severity)
        
        console.log(`[ErrorTracking] Message [${severity}] [${eventId}]: ${scrubbedMessage}`)

        return eventId
    }

    /**
     * Fügt einen Breadcrumb hinzu
     */
    public addBreadcrumb(data: BreadcrumbData): void {
        const scrubbedData = {
            ...data,
            message: this.scrubString(data.message),
            data: data.data ? this.scrubObject(data.data) : undefined,
            timestamp: new Date().toISOString()
        }

        // In Produktion: Sentry.addBreadcrumb(scrubbedData)
        
        if (this.environment === 'development') {
            console.log(`[Breadcrumb] [${data.category}] ${data.message}`)
        }
    }

    /**
     * Startet eine Performance-Transaktion
     */
    public startTransaction(transaction: PerformanceTransaction): TransactionHandle {
        const startTime = Date.now()
        const transactionId = this.generateEventId()

        // In Produktion: const transaction = Sentry.startTransaction({...})

        return {
            id: transactionId,
            name: transaction.name,
            finish: () => {
                const duration = Date.now() - startTime
                console.log(`[Performance] ${transaction.name} completed in ${duration}ms`)
            },
            startChild: (spanName: string) => {
                const spanStart = Date.now()
                return {
                    finish: () => {
                        const spanDuration = Date.now() - spanStart
                        console.log(`[Performance] Span ${spanName} completed in ${spanDuration}ms`)
                    }
                }
            }
        }
    }

    /**
     * Setzt User-Kontext
     */
    public setUser(userId?: string, email?: string): void {
        const user = userId ? {
            id: this.maskUserId(userId),
            email: email ? this.maskEmail(email) : undefined
        } : null

        // In Produktion: Sentry.setUser(user)
    }

    /**
     * Setzt Tags für alle folgenden Events
     */
    public setTags(tags: Record<string, string>): void {
        const scrubbedTags = this.scrubObject(tags) as Record<string, string>
        
        // In Produktion: Sentry.setTags(scrubbedTags)
    }

    /**
     * Wrapper für async Funktionen mit Error Tracking
     */
    public async withErrorTracking<T>(
        operation: string,
        fn: () => Promise<T>,
        context?: ErrorContext
    ): Promise<T> {
        const transaction = this.startTransaction({
            name: operation,
            op: 'function'
        })

        try {
            this.addBreadcrumb({
                category: 'operation',
                message: `Starting: ${operation}`,
                level: ErrorSeverity.INFO
            })

            const result = await fn()

            this.addBreadcrumb({
                category: 'operation',
                message: `Completed: ${operation}`,
                level: ErrorSeverity.INFO
            })

            return result
        } catch (error) {
            this.captureException(error as Error, {
                ...context,
                tags: { operation }
            })
            throw error
        } finally {
            transaction.finish()
        }
    }

    // ========================================================================
    // PII SCRUBBING
    // ========================================================================

    private scrubString(input: string): string {
        let result = input
        for (const pattern of this.PII_PATTERNS) {
            result = result.replace(pattern, '[REDACTED]')
        }
        return result
    }

    private scrubErrorMessage(error: Error): Error {
        const scrubbedError = new Error(this.scrubString(error.message))
        scrubbedError.stack = error.stack ? this.scrubString(error.stack) : undefined
        scrubbedError.name = error.name
        return scrubbedError
    }

    private scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.scrubString(value)
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.scrubObject(value as Record<string, unknown>)
            } else {
                result[key] = value
            }
        }
        return result
    }

    private maskUserId(userId?: string): string | undefined {
        if (!userId) return undefined
        if (userId.length <= 8) return '***'
        return userId.substring(0, 4) + '***' + userId.substring(userId.length - 4)
    }

    private maskEmail(email: string): string {
        const [local, domain] = email.split('@')
        if (!domain) return '[REDACTED]'
        return local.substring(0, 2) + '***@' + domain
    }

    private generateEventId(): string {
        return Math.random().toString(36).substring(2, 10) + 
               Date.now().toString(36)
    }
}

// ============================================================================
// TRANSACTION HANDLE
// ============================================================================

interface TransactionHandle {
    id: string
    name: string
    finish: () => void
    startChild: (name: string) => { finish: () => void }
}

// ============================================================================
// ALERT SERVICE
// ============================================================================

export class AlertService {
    private alertThresholds = {
        errorRate: 0.05,      // 5% Fehlerrate
        responseTime: 5000,   // 5 Sekunden
        memoryUsage: 0.90,    // 90% RAM
        diskUsage: 0.85       // 85% Disk
    }

    private alertChannels = {
        slack: process.env.SLACK_WEBHOOK_URL,
        email: process.env.ALERT_EMAIL,
        pagerduty: process.env.PAGERDUTY_KEY
    }

    /**
     * Sendet einen Alert
     */
    public async sendAlert(
        title: string,
        message: string,
        severity: 'critical' | 'high' | 'medium' | 'low'
    ): Promise<void> {
        const alert = {
            title,
            message,
            severity,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
        }

        console.log(`[Alert] [${severity.toUpperCase()}] ${title}: ${message}`)

        // Slack Notification
        if (this.alertChannels.slack && severity !== 'low') {
            await this.sendSlackAlert(alert)
        }

        // PagerDuty für kritische Alerts
        if (this.alertChannels.pagerduty && severity === 'critical') {
            await this.sendPagerDutyAlert(alert)
        }
    }

    private async sendSlackAlert(alert: object): Promise<void> {
        if (!this.alertChannels.slack) return

        try {
            await fetch(this.alertChannels.slack, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `[M.A.T.E. Alert] ${JSON.stringify(alert)}`
                })
            })
        } catch (error) {
            console.error('[AlertService] Failed to send Slack alert:', error)
        }
    }

    private async sendPagerDutyAlert(alert: object): Promise<void> {
        if (!this.alertChannels.pagerduty) return

        try {
            await fetch('https://events.pagerduty.com/v2/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    routing_key: this.alertChannels.pagerduty,
                    event_action: 'trigger',
                    payload: {
                        summary: `M.A.T.E. Critical Alert`,
                        severity: 'critical',
                        source: 'mate-platform',
                        custom_details: alert
                    }
                })
            })
        } catch (error) {
            console.error('[AlertService] Failed to send PagerDuty alert:', error)
        }
    }

    /**
     * Prüft System-Metriken und sendet Alerts
     */
    public async checkHealthAndAlert(): Promise<void> {
        const memUsage = process.memoryUsage()
        const heapUsed = memUsage.heapUsed / memUsage.heapTotal

        if (heapUsed > this.alertThresholds.memoryUsage) {
            await this.sendAlert(
                'Hohe Speicherauslastung',
                `Heap-Auslastung bei ${(heapUsed * 100).toFixed(1)}%`,
                'high'
            )
        }
    }
}

// Singleton Exports
export const errorTrackingService = new ErrorTrackingService()
export const alertService = new AlertService()

// Initialisierung
errorTrackingService.initialize()
