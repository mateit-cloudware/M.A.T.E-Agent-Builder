/**
 * TOM Generator - Technisch-Organisatorische Maßnahmen (Art. 32 DSGVO)
 */

import { CompanyInfo, DEFAULT_COMPANY_INFO } from './index'

export interface TOMOptions {
    companyInfo?: CompanyInfo
    format?: 'text' | 'html' | 'json'
}

export interface TechnicalMeasure {
    category: string
    measures: {
        name: string
        description: string
        implementation: string
        status: 'implementiert' | 'geplant' | 'in Umsetzung'
    }[]
}

// Standard-TOM für M.A.T.E. Plattform
export const MATE_TECHNICAL_MEASURES: TechnicalMeasure[] = [
    {
        category: '1. Zutrittskontrolle (Physische Sicherheit)',
        measures: [
            {
                name: 'Cloud-Hosting',
                description: 'Infrastruktur bei zertifiziertem Cloud-Provider (Railway)',
                implementation: 'ISO 27001 zertifiziertes Rechenzentrum',
                status: 'implementiert'
            },
            {
                name: 'Keine lokalen Server',
                description: 'Ausschließlich Cloud-basierte Infrastruktur',
                implementation: 'Serverless/Container-Architektur',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '2. Zugangskontrolle (Systemzugang)',
        measures: [
            {
                name: 'Authentifizierung',
                description: 'Sichere Benutzerauthentifizierung',
                implementation: 'JWT-basierte Authentifizierung, bcrypt-Passwort-Hashing',
                status: 'implementiert'
            },
            {
                name: 'Session-Management',
                description: 'Sichere Sitzungsverwaltung',
                implementation: 'Token-Ablauf, Secure/HttpOnly Cookies',
                status: 'implementiert'
            },
            {
                name: 'Brute-Force-Schutz',
                description: 'Schutz vor Passwort-Rateangriffen',
                implementation: 'Rate Limiting, Account-Sperrung nach Fehlversuchen',
                status: 'implementiert'
            },
            {
                name: 'Multi-Faktor-Authentifizierung',
                description: 'Zusätzlicher Authentifizierungsfaktor für Admins',
                implementation: 'TOTP-basierte MFA (geplant)',
                status: 'geplant'
            }
        ]
    },
    {
        category: '3. Zugriffskontrolle (Berechtigungen)',
        measures: [
            {
                name: 'Rollenbasierte Zugriffskontrolle',
                description: 'Berechtigungen nach Rollen (RBAC)',
                implementation: 'User, Admin, SuperAdmin Rollen mit spezifischen Berechtigungen',
                status: 'implementiert'
            },
            {
                name: 'Mandantentrennung',
                description: 'Strikte Trennung von Kundendaten',
                implementation: 'Workspace-basierte Isolierung',
                status: 'implementiert'
            },
            {
                name: 'Least Privilege',
                description: 'Minimale Berechtigungen',
                implementation: 'Benutzer erhalten nur notwendige Rechte',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '4. Weitergabekontrolle (Transport)',
        measures: [
            {
                name: 'Transportverschlüsselung',
                description: 'Verschlüsselung aller Datenübertragungen',
                implementation: 'TLS 1.3, HTTPS-Only, HSTS',
                status: 'implementiert'
            },
            {
                name: 'API-Sicherheit',
                description: 'Sichere API-Kommunikation',
                implementation: 'API-Key-Authentifizierung, Rate Limiting',
                status: 'implementiert'
            },
            {
                name: 'Sichere Drittanbieter-Kommunikation',
                description: 'Verschlüsselte Verbindung zu LLM/Voice-Providern',
                implementation: 'TLS-gesicherte API-Aufrufe',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '5. Eingabekontrolle (Nachvollziehbarkeit)',
        measures: [
            {
                name: 'Audit-Logging',
                description: 'Protokollierung aller sicherheitsrelevanten Aktionen',
                implementation: 'Tamper-Proof Hash-Chain Audit-Log',
                status: 'implementiert'
            },
            {
                name: 'Änderungsprotokoll',
                description: 'Nachvollziehbarkeit von Datenänderungen',
                implementation: 'Timestamps, User-IDs in allen Transaktionen',
                status: 'implementiert'
            },
            {
                name: 'Log-Aufbewahrung',
                description: 'Sichere Aufbewahrung von Protokollen',
                implementation: 'Retention Policy: 90 Tage Standard, 365 Tage sicherheitsrelevant',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '6. Auftragskontrolle (Auftragsverarbeitung)',
        measures: [
            {
                name: 'AVV mit Dienstleistern',
                description: 'Auftragsverarbeitungsverträge mit allen Subprocessors',
                implementation: 'AVV mit Railway, OpenRouter, VAPI, Stripe',
                status: 'implementiert'
            },
            {
                name: 'Subprocessor-Management',
                description: 'Kontrolle und Dokumentation von Unterauftragsverarbeitern',
                implementation: 'Dokumentierte Subprocessor-Liste',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '7. Verfügbarkeitskontrolle',
        measures: [
            {
                name: 'Backup-Strategie',
                description: 'Regelmäßige Datensicherung',
                implementation: 'Automatische Datenbank-Backups, verschlüsselt',
                status: 'implementiert'
            },
            {
                name: 'Disaster Recovery',
                description: 'Wiederherstellungsverfahren',
                implementation: 'Dokumentierter Recovery-Plan',
                status: 'implementiert'
            },
            {
                name: 'Monitoring',
                description: 'Systemüberwachung',
                implementation: 'Health-Checks, Alerting bei Ausfällen',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '8. Trennungskontrolle',
        measures: [
            {
                name: 'Logische Datentrennung',
                description: 'Trennung von Daten verschiedener Zwecke',
                implementation: 'Separate Datenbank-Tabellen, Workspace-Isolation',
                status: 'implementiert'
            },
            {
                name: 'Umgebungstrennung',
                description: 'Trennung von Entwicklung und Produktion',
                implementation: 'Separate Umgebungen (Dev, Staging, Prod)',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '9. Pseudonymisierung',
        measures: [
            {
                name: 'Pseudonymisierungs-Service',
                description: 'Systematische Pseudonymisierung von PII',
                implementation: 'Konsistente Token-basierte Pseudonymisierung',
                status: 'implementiert'
            },
            {
                name: 'PII-Filterung',
                description: 'Automatische Erkennung und Maskierung',
                implementation: 'Guardrails-System mit PII-Scanner',
                status: 'implementiert'
            }
        ]
    },
    {
        category: '10. Verschlüsselung',
        measures: [
            {
                name: 'Verschlüsselung at Rest',
                description: 'Verschlüsselung gespeicherter Daten',
                implementation: 'AES-256-GCM für sensible Daten',
                status: 'implementiert'
            },
            {
                name: 'Schlüsselmanagement',
                description: 'Sichere Verwaltung von Verschlüsselungsschlüsseln',
                implementation: 'Umgebungsvariablen, regelmäßige Rotation',
                status: 'implementiert'
            }
        ]
    }
]

// Standard-Organisatorische Maßnahmen
export const MATE_ORGANIZATIONAL_MEASURES = [
    {
        category: 'Datenschutz-Management',
        measures: [
            'Datenschutzbeauftragter benannt',
            'Datenschutz-Richtlinie dokumentiert',
            'Regelmäßige Datenschutz-Schulungen',
            'Verarbeitungsverzeichnis geführt',
            'DSFA für Hochrisiko-Verarbeitungen'
        ]
    },
    {
        category: 'Incident Response',
        measures: [
            'Dokumentierter Incident-Response-Plan',
            'Meldeverfahren für Datenpannen (72h)',
            'Regelmäßige Übungen',
            'Eskalationswege definiert'
        ]
    },
    {
        category: 'Mitarbeiter',
        measures: [
            'Vertraulichkeitsverpflichtung',
            'Regelmäßige Security-Awareness-Schulungen',
            'Clean Desk Policy',
            'Onboarding/Offboarding-Prozesse'
        ]
    },
    {
        category: 'Dienstleister-Management',
        measures: [
            'Due Diligence bei Auswahl',
            'AVV mit allen Auftragsverarbeitern',
            'Regelmäßige Überprüfung',
            'Dokumentierte Subprocessor-Liste'
        ]
    },
    {
        category: 'Kontinuierliche Verbesserung',
        measures: [
            'Jährliche Überprüfung der TOM',
            'Security-Audits',
            'Penetration Testing',
            'Dokumentation von Änderungen'
        ]
    }
]

/**
 * Generiert ein vollständiges TOM-Dokument gemäß Art. 32 DSGVO
 */
export function generateTOM(options: TOMOptions = {}): string {
    const company = options.companyInfo || DEFAULT_COMPANY_INFO
    
    if (options.format === 'json') {
        return JSON.stringify({
            tom: {
                verantwortlicher: company,
                technischeMassnahmen: MATE_TECHNICAL_MEASURES,
                organisatorischeMassnahmen: MATE_ORGANIZATIONAL_MEASURES,
                erstellungsdatum: new Date().toISOString(),
                version: '1.0'
            }
        }, null, 2)
    }
    
    return generateTextTOM(company)
}

function generateTextTOM(company: CompanyInfo): string {
    const lines: string[] = []
    
    lines.push('=' .repeat(80))
    lines.push('TECHNISCH-ORGANISATORISCHE MASSNAHMEN (TOM)')
    lines.push('gemäß Art. 32 DSGVO')
    lines.push('=' .repeat(80))
    lines.push('')
    
    lines.push(`Verantwortlicher: ${company.name}`)
    lines.push('')
    
    // Technische Maßnahmen
    lines.push('TEIL A: TECHNISCHE MASSNAHMEN')
    lines.push('='.repeat(80))
    lines.push('')
    
    for (const category of MATE_TECHNICAL_MEASURES) {
        lines.push(category.category)
        lines.push('-'.repeat(60))
        
        for (const measure of category.measures) {
            lines.push(`  • ${measure.name}`)
            lines.push(`    Beschreibung: ${measure.description}`)
            lines.push(`    Umsetzung: ${measure.implementation}`)
            lines.push(`    Status: ${measure.status.toUpperCase()}`)
            lines.push('')
        }
        lines.push('')
    }
    
    // Organisatorische Maßnahmen
    lines.push('TEIL B: ORGANISATORISCHE MASSNAHMEN')
    lines.push('='.repeat(80))
    lines.push('')
    
    for (const category of MATE_ORGANIZATIONAL_MEASURES) {
        lines.push(category.category)
        lines.push('-'.repeat(40))
        for (const measure of category.measures) {
            lines.push(`  • ${measure}`)
        }
        lines.push('')
    }
    
    // Footer
    lines.push('-'.repeat(80))
    lines.push(`Erstellungsdatum: ${new Date().toLocaleDateString('de-DE')}`)
    lines.push(`Version: 1.0`)
    lines.push(`Nächste Überprüfung: ${getNextReviewDate()}`)
    lines.push('-'.repeat(80))
    
    return lines.join('\n')
}

function getNextReviewDate(): string {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toLocaleDateString('de-DE')
}
