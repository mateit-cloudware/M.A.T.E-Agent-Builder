/**
 * M.A.T.E. Credentials Scanner (G3)
 * 
 * Scanner für sensible Zugangsdaten:
 * - API-Keys (OpenAI, AWS, Google, etc.)
 * - Access Tokens (Bearer, OAuth, JWT)
 * - Passwörter in Logs/Texten
 * - Private Keys (RSA, SSH)
 * - Webhook Secrets
 * - Database Connection Strings
 */

import { BaseScanner } from './base.scanner'
import { DetectionCategory, SeverityLevel } from '../types'

export class CredentialsScanner extends BaseScanner {
    readonly name = 'Credentials Scanner'
    readonly category = DetectionCategory.CREDENTIALS
    readonly version = '1.0.0'

    constructor() {
        super()
        this.initializePatterns()
    }

    private initializePatterns(): void {
        // ==================== API KEYS ====================
        
        // OpenAI API Key
        this.patterns.set('api_key_openai', {
            regex: /sk-[a-zA-Z0-9]{20,}[a-zA-Z0-9_-]*/g,
            severity: SeverityLevel.CRITICAL
        })

        // Anthropic API Key
        this.patterns.set('api_key_anthropic', {
            regex: /sk-ant-[a-zA-Z0-9]{20,}/g,
            severity: SeverityLevel.CRITICAL
        })

        // Google API Key
        this.patterns.set('api_key_google', {
            regex: /AIza[0-9A-Za-z\\-_]{35}/g,
            severity: SeverityLevel.CRITICAL
        })

        // AWS Access Key ID
        this.patterns.set('api_key_aws', {
            regex: /AKIA[0-9A-Z]{16}/g,
            severity: SeverityLevel.CRITICAL
        })

        // AWS Secret Access Key
        this.patterns.set('secret_key_aws', {
            regex: /(?:aws_secret_access_key|aws_secret_key)[\s:=]+[A-Za-z0-9/+]{40}/gi,
            severity: SeverityLevel.CRITICAL
        })

        // GitHub Token
        this.patterns.set('token_github', {
            regex: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
            severity: SeverityLevel.CRITICAL
        })

        // GitLab Token
        this.patterns.set('token_gitlab', {
            regex: /glpat-[a-zA-Z0-9\-_]{20,}/g,
            severity: SeverityLevel.CRITICAL
        })

        // Stripe API Key
        this.patterns.set('api_key_stripe', {
            regex: /sk_(?:test|live)_[a-zA-Z0-9]{24,}/g,
            severity: SeverityLevel.CRITICAL
        })

        // Twilio Auth Token
        this.patterns.set('token_twilio', {
            regex: /SK[a-fA-F0-9]{32}/g,
            severity: SeverityLevel.CRITICAL
        })

        // SendGrid API Key
        this.patterns.set('api_key_sendgrid', {
            regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
            severity: SeverityLevel.CRITICAL
        })

        // Slack Token
        this.patterns.set('token_slack', {
            regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
            severity: SeverityLevel.CRITICAL
        })

        // Generic API Key Pattern
        this.patterns.set('api_key_generic', {
            regex: /(?:api[_-]?key|apikey|api_secret|apisecret)[\s:=]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== ACCESS TOKENS ====================
        
        // Bearer Token
        this.patterns.set('token_bearer', {
            regex: /Bearer\s+[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
            severity: SeverityLevel.HIGH
        })

        // JWT Token
        this.patterns.set('token_jwt', {
            regex: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
            severity: SeverityLevel.HIGH
        })

        // OAuth Token
        this.patterns.set('token_oauth', {
            regex: /(?:oauth[_-]?token|access[_-]?token)[\s:=]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== PASSWORDS ====================
        
        // Password in Context
        this.patterns.set('password_context', {
            regex: /(?:password|passwd|pwd|passwort|kennwort)[\s:=]+['"]?([^\s'"]{4,})['"]?/gi,
            severity: SeverityLevel.CRITICAL
        })

        // Basic Auth
        this.patterns.set('auth_basic', {
            regex: /(?:Basic\s+)[a-zA-Z0-9+/]+=*/g,
            severity: SeverityLevel.HIGH
        })

        // ==================== PRIVATE KEYS ====================
        
        // RSA Private Key
        this.patterns.set('key_rsa', {
            regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
            severity: SeverityLevel.CRITICAL
        })

        // SSH Private Key
        this.patterns.set('key_ssh', {
            regex: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
            severity: SeverityLevel.CRITICAL
        })

        // EC Private Key
        this.patterns.set('key_ec', {
            regex: /-----BEGIN EC PRIVATE KEY-----[\s\S]*?-----END EC PRIVATE KEY-----/g,
            severity: SeverityLevel.CRITICAL
        })

        // PGP Private Key
        this.patterns.set('key_pgp', {
            regex: /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]*?-----END PGP PRIVATE KEY BLOCK-----/g,
            severity: SeverityLevel.CRITICAL
        })

        // ==================== DATABASE ====================
        
        // PostgreSQL Connection String
        this.patterns.set('db_postgres', {
            regex: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/[^\s]+/gi,
            severity: SeverityLevel.CRITICAL
        })

        // MySQL Connection String
        this.patterns.set('db_mysql', {
            regex: /mysql:\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/[^\s]+/gi,
            severity: SeverityLevel.CRITICAL
        })

        // MongoDB Connection String
        this.patterns.set('db_mongodb', {
            regex: /mongodb(?:\+srv)?:\/\/[^:\s]+:[^@\s]+@[^\s]+/gi,
            severity: SeverityLevel.CRITICAL
        })

        // Redis Connection String
        this.patterns.set('db_redis', {
            regex: /redis:\/\/[^:\s]*:[^@\s]+@[^\/\s]+/gi,
            severity: SeverityLevel.CRITICAL
        })

        // ==================== WEBHOOK SECRETS ====================
        
        // Webhook Secret
        this.patterns.set('secret_webhook', {
            regex: /(?:webhook[_-]?secret|signing[_-]?secret)[\s:=]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
            severity: SeverityLevel.HIGH
        })

        // Secret Key Generic
        this.patterns.set('secret_generic', {
            regex: /(?:secret[_-]?key|private[_-]?key|encryption[_-]?key)[\s:=]+['"]?([a-zA-Z0-9_\-/+=]{20,})['"]?/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== CLOUD CREDENTIALS ====================
        
        // Azure Connection String
        this.patterns.set('cloud_azure', {
            regex: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[^;]+/gi,
            severity: SeverityLevel.CRITICAL
        })

        // Heroku API Key
        this.patterns.set('api_key_heroku', {
            regex: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
            severity: SeverityLevel.MEDIUM  // UUID könnte auch nicht-sensitiv sein
        })
    }

    /**
     * Maskiert Credentials basierend auf Typ
     */
    protected maskValue(value: string, type: string): string {
        switch (type) {
            case 'api_key_openai':
                return 'sk-' + '*'.repeat(20) + '...'
            
            case 'api_key_anthropic':
                return 'sk-ant-' + '*'.repeat(20) + '...'
            
            case 'api_key_google':
                return 'AIza' + '*'.repeat(35)
            
            case 'api_key_aws':
                return 'AKIA' + '*'.repeat(16)
            
            case 'secret_key_aws':
                return '[AWS_SECRET_KEY_REDACTED]'
            
            case 'token_github':
                return value.startsWith('ghp_') 
                    ? 'ghp_' + '*'.repeat(36)
                    : 'github_pat_' + '*'.repeat(20) + '...'
            
            case 'token_gitlab':
                return 'glpat-' + '*'.repeat(20)
            
            case 'api_key_stripe':
                const prefix = value.includes('live') ? 'sk_live_' : 'sk_test_'
                return prefix + '*'.repeat(24)
            
            case 'token_twilio':
                return 'SK' + '*'.repeat(32)
            
            case 'api_key_sendgrid':
                return 'SG.' + '*'.repeat(20) + '...'
            
            case 'token_slack':
                return 'xox_-' + '*'.repeat(20) + '...'
            
            case 'api_key_generic':
            case 'token_oauth':
                return '[REDACTED_API_KEY]'
            
            case 'token_bearer':
                return 'Bearer [REDACTED_TOKEN]'
            
            case 'token_jwt':
                return '[REDACTED_JWT]'
            
            case 'password_context':
                // "password: secret123" -> "password: ********"
                const pwMatch = value.match(/^(.*?[\s:=]+['"]?)(.+?)(['"]?)$/)
                if (pwMatch) {
                    return pwMatch[1] + '*'.repeat(8) + pwMatch[3]
                }
                return '[REDACTED_PASSWORD]'
            
            case 'auth_basic':
                return 'Basic [REDACTED]'
            
            case 'key_rsa':
            case 'key_ssh':
            case 'key_ec':
            case 'key_pgp':
                return `[REDACTED_${type.toUpperCase().replace('KEY_', '')}_PRIVATE_KEY]`
            
            case 'db_postgres':
            case 'db_mysql':
            case 'db_mongodb':
            case 'db_redis':
                return this.maskConnectionString(value)
            
            case 'secret_webhook':
            case 'secret_generic':
                return '[REDACTED_SECRET]'
            
            case 'cloud_azure':
                return 'DefaultEndpointsProtocol=https;AccountName=[REDACTED];AccountKey=[REDACTED]'
            
            default:
                // Generische Maskierung
                if (value.length <= 8) return '*'.repeat(value.length)
                return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4)
        }
    }

    /**
     * Maskiert Datenbank-Connection-Strings
     */
    private maskConnectionString(connStr: string): string {
        // Protokoll extrahieren
        const protocolMatch = connStr.match(/^([a-z+]+):\/\//)
        if (!protocolMatch) return '[REDACTED_CONNECTION_STRING]'
        
        const protocol = protocolMatch[1]
        
        // User@Host extrahieren (ohne Passwort)
        const hostMatch = connStr.match(/@([^\/\s]+)/)
        const host = hostMatch ? hostMatch[1] : 'host'
        
        return `${protocol}://[user]:[REDACTED]@${host}/[db]`
    }

    /**
     * Berechnet Konfidenz für Match
     */
    protected calculateConfidence(value: string, type: string): number {
        switch (type) {
            // Hohe Konfidenz bei spezifischen Formaten
            case 'api_key_openai':
            case 'api_key_anthropic':
            case 'api_key_google':
            case 'api_key_aws':
            case 'api_key_stripe':
            case 'token_github':
                return 0.99
            
            case 'token_jwt':
            case 'token_bearer':
                // JWT-Struktur validieren
                if (value.split('.').length === 3) return 0.98
                return 0.7
            
            case 'key_rsa':
            case 'key_ssh':
            case 'key_ec':
            case 'key_pgp':
                return 0.99
            
            case 'db_postgres':
            case 'db_mysql':
            case 'db_mongodb':
                return 0.95
            
            case 'password_context':
                // Kontext vorhanden = höhere Konfidenz
                return 0.85
            
            case 'api_key_heroku':
                // UUID kann auch andere Bedeutung haben
                return 0.5
            
            case 'api_key_generic':
            case 'secret_generic':
                return 0.75
            
            default:
                return 0.8
        }
    }

    /**
     * Prüft ob Text kritische Credentials enthält
     */
    public containsCriticalCredentials(text: string): boolean {
        const criticalTypes = [
            'api_key_openai', 'api_key_anthropic', 'api_key_google', 
            'api_key_aws', 'secret_key_aws', 'api_key_stripe',
            'key_rsa', 'key_ssh', 'db_postgres', 'db_mysql', 'db_mongodb'
        ]
        
        for (const type of criticalTypes) {
            const pattern = this.patterns.get(type)
            if (pattern && pattern.regex.test(text)) {
                return true
            }
        }
        
        return false
    }

    /**
     * Extrahiert alle API-Keys aus Text (für Audit-Zwecke)
     */
    public extractApiKeys(text: string): Array<{ type: string; masked: string }> {
        const keys: Array<{ type: string; masked: string }> = []
        
        for (const [type, config] of this.patterns) {
            if (type.startsWith('api_key_') || type.startsWith('token_')) {
                const globalRegex = new RegExp(config.regex.source, 'gi')
                let match: RegExpExecArray | null
                
                while ((match = globalRegex.exec(text)) !== null) {
                    keys.push({
                        type,
                        masked: this.maskValue(match[0], type)
                    })
                }
            }
        }
        
        return keys
    }
}
