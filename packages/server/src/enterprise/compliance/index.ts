/**
 * M.A.T.E. Compliance Documentation Generator
 * 
 * Generiert automatisch:
 * - S2.3a: Verarbeitungsverzeichnis (Art. 30 DSGVO)
 * - S2.3b: DSFA - Datenschutz-Folgenabschätzung (Art. 35 DSGVO)
 * - S2.3c: TOM - Technisch-Organisatorische Maßnahmen (Art. 32 DSGVO)
 * - S2.3d: AVV - Auftragsverarbeitungsvertrag Template (Art. 28 DSGVO)
 * - S2.3e: Datenschutzerklärung (Art. 13/14 DSGVO)
 */

export interface CompanyInfo {
    name: string
    legalForm: string
    address: string
    city: string
    country: string
    email: string
    phone?: string
    website?: string
    registrationNumber?: string
    vatId?: string
    dataProtectionOfficer?: {
        name: string
        email: string
        phone?: string
    }
}

export interface ProcessingActivity {
    id: string
    name: string
    purpose: string
    legalBasis: string
    dataSubjects: string[]
    dataCategories: string[]
    recipients: string[]
    thirdCountryTransfers?: {
        country: string
        safeguards: string
    }[]
    retentionPeriod: string
    technicalMeasures: string[]
    organizationalMeasures: string[]
}

// Standard-Firmendaten (kann überschrieben werden)
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
    name: 'MATEIT CLOUDWARE GmbH',
    legalForm: 'GmbH',
    address: '[Adresse einfügen]',
    city: '[Stadt einfügen]',
    country: 'Deutschland',
    email: 'datenschutz@getmate.ai',
    website: 'https://getmate.ai',
    dataProtectionOfficer: {
        name: '[DSB Name einfügen]',
        email: 'dsb@getmate.ai'
    }
}

// M.A.T.E. Standard-Verarbeitungstätigkeiten
export const MATE_PROCESSING_ACTIVITIES: ProcessingActivity[] = [
    {
        id: 'VA-001',
        name: 'Benutzerkontenverwaltung',
        purpose: 'Verwaltung von Benutzerkonten, Authentifizierung und Autorisierung für die Nutzung der M.A.T.E. Plattform',
        legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)',
        dataSubjects: ['Registrierte Benutzer', 'Organisationsadministratoren'],
        dataCategories: ['Name', 'E-Mail-Adresse', 'Passwort (gehasht)', 'Erstellungsdatum', 'Letzte Anmeldung'],
        recipients: ['Interne IT-Abteilung'],
        retentionPeriod: 'Bis zur Kontolöschung + 30 Tage Karenzzeit',
        technicalMeasures: ['Passwort-Hashing (bcrypt)', 'TLS 1.3 Verschlüsselung', 'JWT-Token-basierte Authentifizierung'],
        organizationalMeasures: ['Zugriffskontrolle nach Rollen', 'Regelmäßige Sicherheitsaudits']
    },
    {
        id: 'VA-002',
        name: 'Wallet und Abrechnung',
        purpose: 'Verwaltung von Guthaben, Abrechnung von Dienstleistungen und Zahlungsabwicklung',
        legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung)',
        dataSubjects: ['Zahlende Kunden'],
        dataCategories: ['Kontostand', 'Transaktionshistorie', 'Nutzungsdaten', 'Rechnungsdaten'],
        recipients: ['Zahlungsdienstleister (Stripe)', 'Steuerberater (aggregiert)'],
        retentionPeriod: '10 Jahre (gesetzliche Aufbewahrungspflicht gem. §257 HGB)',
        technicalMeasures: ['AES-256 Verschlüsselung für sensible Daten', 'Sichere API-Kommunikation'],
        organizationalMeasures: ['Finanzabteilung Zugriffsbeschränkung', 'Regelmäßige Audits']
    },
    {
        id: 'VA-003',
        name: 'KI-Agent-Nutzung',
        purpose: 'Bereitstellung und Betrieb von KI-Agenten für Voice- und Chat-Interaktionen',
        legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Art. 6 Abs. 1 lit. a DSGVO (Einwilligung für KI-Training)',
        dataSubjects: ['Endnutzer der KI-Agenten', 'Agent-Ersteller'],
        dataCategories: ['Gesprächsinhalte', 'Sprachaufnahmen (temporär)', 'Nutzungsstatistiken'],
        recipients: ['LLM-Provider (OpenRouter)', 'Voice-Provider (VAPI)'],
        thirdCountryTransfers: [
            { country: 'USA', safeguards: 'EU-US Data Privacy Framework' }
        ],
        retentionPeriod: 'Gesprächshistorie: 90 Tage, Nutzungsstatistiken: 365 Tage',
        technicalMeasures: ['TLS 1.3', 'Prompt Injection Detection', 'PII-Filterung', 'Pseudonymisierung'],
        organizationalMeasures: ['Guardrails-System', 'Regelmäßige Überprüfung der KI-Outputs']
    },
    {
        id: 'VA-004',
        name: 'Audit-Logging',
        purpose: 'Protokollierung von Systemaktivitäten für Sicherheit, Compliance und Fehlerbehebung',
        legalBasis: 'Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung), Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)',
        dataSubjects: ['Alle Systemnutzer'],
        dataCategories: ['IP-Adressen', 'Benutzer-IDs', 'Aktionen', 'Zeitstempel', 'User-Agent'],
        recipients: ['Interne Sicherheitsabteilung'],
        retentionPeriod: 'Standard: 90 Tage, Sicherheitsrelevant: 365 Tage, Compliance: 7 Jahre',
        technicalMeasures: ['Tamper-Proof Hash-Chain', 'Verschlüsselte Speicherung', 'Backup'],
        organizationalMeasures: ['Beschränkter Admin-Zugriff', 'Regelmäßige Log-Reviews']
    },
    {
        id: 'VA-005',
        name: 'Consent Management',
        purpose: 'Verwaltung und Dokumentation von Einwilligungen gemäß DSGVO',
        legalBasis: 'Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung)',
        dataSubjects: ['Alle Benutzer'],
        dataCategories: ['Einwilligungsstatus', 'Zeitstempel', 'IP-Adresse', 'Consent-Version'],
        recipients: ['Keine Weitergabe'],
        retentionPeriod: 'Dauer der Geschäftsbeziehung + 3 Jahre',
        technicalMeasures: ['Versionierung', 'Unveränderliche Speicherung'],
        organizationalMeasures: ['Jährliche Review der Consent-Texte']
    }
]

// Re-export Generators
import { generateProcessingRecords } from './processing-records.generator'
import { generateDPIA, AI_PLATFORM_RISKS } from './dpia.generator'
import { generateTOM, MATE_TECHNICAL_MEASURES, MATE_ORGANIZATIONAL_MEASURES } from './tom.generator'
import { generateAVV } from './avv.generator'
import { generatePrivacyPolicy } from './privacy-policy.generator'
import {
    generateInformationSecurityPolicy,
    generateAccessControlPolicy,
    generateChangeManagementProcess,
    generateIncidentResponsePlan,
    generateBusinessContinuityPlan
} from './soc2-policies.generator'

export {
    // GDPR Generators
    generateProcessingRecords,
    generateDPIA,
    generateTOM,
    generateAVV,
    generatePrivacyPolicy,
    AI_PLATFORM_RISKS,
    MATE_TECHNICAL_MEASURES,
    MATE_ORGANIZATIONAL_MEASURES,
    
    // SOC 2 Policy Generators
    generateInformationSecurityPolicy,
    generateAccessControlPolicy,
    generateChangeManagementProcess,
    generateIncidentResponsePlan,
    generateBusinessContinuityPlan
}
