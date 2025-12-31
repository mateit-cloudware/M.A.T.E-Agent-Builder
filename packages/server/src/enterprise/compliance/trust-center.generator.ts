/**
 * M.A.T.E. Trust Center & Public Compliance Documentation Generator
 * 
 * Generiert öffentliche Sicherheits- und Compliance-Dokumentation:
 * - Trust Center Page Content
 * - Security Whitepaper
 * - Subprocessor Liste
 * - Compliance Badges & Certifications
 * - Status Page Information
 * 
 * @since 2024-12-31
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TrustCenterSection {
    id: string
    title: string
    icon: string
    description: string
    content: string[]
    badges?: ComplianceBadge[]
}

export interface ComplianceBadge {
    name: string
    status: 'achieved' | 'in_progress' | 'planned'
    icon: string
    description: string
    validUntil?: string
}

export interface Subprocessor {
    name: string
    purpose: string
    location: string
    dataCategories: string[]
    dpaStatus: 'signed' | 'pending' | 'not_required'
    securityMeasures: string[]
}

export interface ServiceStatus {
    name: string
    status: 'operational' | 'degraded' | 'outage' | 'maintenance'
    uptime: number
    lastIncident?: string
    description: string
}

export interface WhitepaperSection {
    title: string
    content: string
}

// ============================================================================
// TRUST CENTER GENERATOR
// ============================================================================

export class TrustCenterGenerator {
    
    /**
     * Trust Center Hauptsektionen
     */
    private readonly TRUST_CENTER_SECTIONS: TrustCenterSection[] = [
        {
            id: 'security',
            title: 'Sicherheit',
            icon: '🔒',
            description: 'Unsere Sicherheitsmaßnahmen schützen Ihre Daten auf höchstem Niveau.',
            content: [
                'AES-256-GCM Verschlüsselung für alle Daten at-rest',
                'TLS 1.3 für alle Datenübertragungen',
                'Zero-Trust Architektur mit granularen Zugriffskontrollen',
                'Multi-Faktor-Authentifizierung (MFA) für alle Admin-Konten',
                'Regelmäßige Penetrationstests durch unabhängige Sicherheitsexperten',
                'Automatisierte Schwachstellen-Scans',
                '24/7 Security Monitoring und Alerting',
                'Incident Response Team mit < 1 Stunde Reaktionszeit'
            ],
            badges: [
                {
                    name: 'SOC 2 Type II',
                    status: 'in_progress',
                    icon: '🛡️',
                    description: 'Service Organization Control Audit'
                },
                {
                    name: 'ISO 27001',
                    status: 'in_progress',
                    icon: '📋',
                    description: 'Information Security Management System'
                }
            ]
        },
        {
            id: 'privacy',
            title: 'Datenschutz',
            icon: '🔐',
            description: 'DSGVO-konform und transparent im Umgang mit Ihren Daten.',
            content: [
                'Vollständige DSGVO-Compliance (EU-Verordnung 2016/679)',
                'Datenverarbeitung ausschließlich in der EU (Frankfurt, Deutschland)',
                'Recht auf Auskunft, Berichtigung und Löschung',
                'Datenportabilität in standardisierten Formaten',
                'Automatische Datenlöschung nach konfigurierbarer Aufbewahrungsfrist',
                'Datenschutz-Folgenabschätzung (DSFA) durchgeführt',
                'Auftragsverarbeitungsverträge (AVV) mit allen Partnern',
                'Datenschutzbeauftragter erreichbar unter datenschutz@getmate.ai'
            ],
            badges: [
                {
                    name: 'DSGVO-konform',
                    status: 'achieved',
                    icon: '🇪🇺',
                    description: 'EU-Datenschutz-Grundverordnung'
                }
            ]
        },
        {
            id: 'ai-safety',
            title: 'KI-Sicherheit',
            icon: '🤖',
            description: 'Verantwortungsvoller Einsatz von Künstlicher Intelligenz.',
            content: [
                'EU AI Act konform (Verordnung 2024/1689)',
                'Transparente KI-Kennzeichnung bei Sprachassistenten',
                'Menschliche Aufsicht bei allen KI-Entscheidungen',
                'AI Guardrails zum Schutz sensibler Informationen',
                'Keine Speicherung von Gesprächen ohne explizite Einwilligung',
                'PII-Erkennung und automatische Maskierung',
                'Prompt Injection Schutz und Content Filtering',
                'Regelmäßige Bias-Audits und Fairness-Tests'
            ],
            badges: [
                {
                    name: 'EU AI Act Ready',
                    status: 'achieved',
                    icon: '🤖',
                    description: 'Limited Risk Classification'
                }
            ]
        },
        {
            id: 'infrastructure',
            title: 'Infrastruktur',
            icon: '☁️',
            description: 'Enterprise-grade Cloud-Infrastruktur mit höchster Verfügbarkeit.',
            content: [
                'Hosting auf Railway.app mit EU-Rechenzentrum',
                'Automatische Skalierung bei Lastspitzen',
                '99.9% Verfügbarkeits-SLA',
                'Tägliche automatische Backups',
                'Point-in-Time Recovery für Datenbanken',
                'DDoS-Schutz und Web Application Firewall',
                'Verschlüsselte Backup-Speicherung',
                'Disaster Recovery Plan mit RTO < 4 Stunden'
            ]
        },
        {
            id: 'compliance',
            title: 'Compliance',
            icon: '📜',
            description: 'Einhaltung internationaler Standards und Vorschriften.',
            content: [
                'SOC 2 Type II Audit in Vorbereitung',
                'ISO 27001 Zertifizierung geplant',
                'Jährliche externe Sicherheitsaudits',
                'Dokumentierte Sicherheitsrichtlinien und Verfahren',
                'Change Management Prozess nach ITIL',
                'Business Continuity Plan',
                'Incident Response Plan',
                'Vendor Risk Management'
            ]
        }
    ]

    /**
     * Subprocessor-Liste (DSGVO Art. 28)
     */
    private readonly SUBPROCESSORS: Subprocessor[] = [
        {
            name: 'Railway Corporation',
            purpose: 'Cloud-Hosting und Infrastruktur',
            location: 'USA (EU-Rechenzentrum verfügbar)',
            dataCategories: ['Anwendungsdaten', 'Logs', 'Metriken'],
            dpaStatus: 'signed',
            securityMeasures: ['SOC 2', 'ISO 27001', 'Verschlüsselung at-rest/in-transit']
        },
        {
            name: 'OpenRouter',
            purpose: 'LLM-Provider (Kimi 2, GPT-4)',
            location: 'USA',
            dataCategories: ['Prompt-Daten (anonymisiert)', 'Model Responses'],
            dpaStatus: 'signed',
            securityMeasures: ['Zero Data Retention', 'No Training on Customer Data', 'TLS 1.3']
        },
        {
            name: 'Vapi.ai',
            purpose: 'Voice-AI-Plattform (Telefonie)',
            location: 'USA',
            dataCategories: ['Sprachdaten', 'Transkriptionen', 'Call Metadata'],
            dpaStatus: 'signed',
            securityMeasures: ['HIPAA-konform', 'SOC 2', 'Verschlüsselung']
        },
        {
            name: 'Stripe',
            purpose: 'Zahlungsabwicklung',
            location: 'USA/EU',
            dataCategories: ['Zahlungsdaten', 'Transaktionshistorie'],
            dpaStatus: 'signed',
            securityMeasures: ['PCI DSS Level 1', 'SOC 2', 'Strong Customer Authentication']
        },
        {
            name: 'Deepgram',
            purpose: 'Speech-to-Text Transkription',
            location: 'USA',
            dataCategories: ['Audio-Daten', 'Transkriptionen'],
            dpaStatus: 'signed',
            securityMeasures: ['SOC 2', 'HIPAA-konform', 'No Audio Retention']
        },
        {
            name: 'Sentry',
            purpose: 'Error Tracking und Monitoring',
            location: 'USA (EU-Datacenter)',
            dataCategories: ['Error Logs', 'Performance Daten'],
            dpaStatus: 'signed',
            securityMeasures: ['SOC 2', 'GDPR-konform', 'PII Scrubbing']
        }
    ]

    /**
     * Service Status Übersicht
     */
    private readonly SERVICES: ServiceStatus[] = [
        {
            name: 'M.A.T.E. Platform',
            status: 'operational',
            uptime: 99.95,
            description: 'Hauptanwendung und Agent Builder'
        },
        {
            name: 'Voice API',
            status: 'operational',
            uptime: 99.9,
            description: 'Vapi Voice Agent Schnittstelle'
        },
        {
            name: 'LLM Proxy',
            status: 'operational',
            uptime: 99.99,
            description: 'OpenRouter LLM Gateway'
        },
        {
            name: 'Database',
            status: 'operational',
            uptime: 99.99,
            description: 'PostgreSQL Datenbank'
        },
        {
            name: 'Billing System',
            status: 'operational',
            uptime: 100,
            description: 'Wallet und Zahlungsabwicklung'
        }
    ]

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Generiert Trust Center JSON für API/Frontend
     */
    public generateTrustCenterData(): object {
        return {
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            company: {
                name: 'Mateit Cloudware',
                product: 'M.A.T.E. - Most Advanced Technology Ever',
                website: 'https://getmate.ai',
                trustCenterUrl: 'https://trust.getmate.ai',
                contact: {
                    security: 'security@getmate.ai',
                    privacy: 'datenschutz@getmate.ai',
                    support: 'support@getmate.ai'
                }
            },
            sections: this.TRUST_CENTER_SECTIONS,
            certifications: this.getAllBadges(),
            subprocessors: this.SUBPROCESSORS,
            serviceStatus: this.SERVICES
        }
    }

    /**
     * Generiert Security Whitepaper (Markdown)
     */
    public generateSecurityWhitepaper(): string {
        const sections: WhitepaperSection[] = [
            this.generateExecutiveSummary(),
            this.generateArchitectureOverview(),
            this.generateDataSecurity(),
            this.generateAccessControl(),
            this.generateAISecurity(),
            this.generateComplianceSection(),
            this.generateIncidentResponse(),
            this.generateVendorSecurity()
        ]

        return `# M.A.T.E. Security Whitepaper

**Version:** 1.0  
**Stand:** ${new Date().toLocaleDateString('de-DE')}  
**Klassifizierung:** Öffentlich

---

## Inhaltsverzeichnis

${sections.map((s, i) => `${i + 1}. [${s.title}](#${s.title.toLowerCase().replace(/\s+/g, '-')})`).join('\n')}

---

${sections.map(s => '## ' + s.title + '\n\n' + s.content).join('\n\n---\n\n')}

---

## Kontakt

**Security Team:**  
security@getmate.ai

**Datenschutzbeauftragter:**  
datenschutz@getmate.ai

**Meldung von Sicherheitslücken:**  
security@getmate.ai (PGP-Key auf Anfrage)

---

*Dieses Dokument wird regelmäßig aktualisiert. Stand: ${new Date().toLocaleDateString('de-DE')}*
`
    }

    /**
     * Generiert Subprocessor-Liste (DSGVO-konform)
     */
    public generateSubprocessorList(): string {
        return `# Liste der Auftragsverarbeiter (Subprocessor List)

**Verantwortlicher:** Mateit Cloudware  
**Produkt:** M.A.T.E. Platform  
**Stand:** ${new Date().toLocaleDateString('de-DE')}

Gemäß Art. 28 DSGVO informieren wir Sie über folgende Auftragsverarbeiter:

---

${this.SUBPROCESSORS.map((sp, i) => `
## ${i + 1}. ${sp.name}

| Aspekt | Details |
|--------|---------|
| **Zweck** | ${sp.purpose} |
| **Standort** | ${sp.location} |
| **Datenkategorien** | ${sp.dataCategories.join(', ')} |
| **AVV-Status** | ${sp.dpaStatus === 'signed' ? '✅ Unterzeichnet' : sp.dpaStatus === 'pending' ? '⏳ In Bearbeitung' : '➖ Nicht erforderlich'} |
| **Sicherheitsmaßnahmen** | ${sp.securityMeasures.join(', ')} |
`).join('\n---\n')}

---

## Änderungsprotokoll

| Datum | Änderung |
|-------|----------|
| ${new Date().toLocaleDateString('de-DE')} | Initiale Erstellung |

---

## Widerspruchsrecht

Sie haben das Recht, Änderungen an dieser Subprocessor-Liste innerhalb von 30 Tagen zu widersprechen. Bitte kontaktieren Sie uns unter datenschutz@getmate.ai.

---

*Diese Liste wird bei jeder Änderung aktualisiert und 30 Tage vor Inkrafttreten neuer Subprocessors kommuniziert.*
`
    }

    /**
     * Generiert Status Page Daten
     */
    public generateStatusPageData(): object {
        const overallStatus = this.calculateOverallStatus()
        const uptime30Days = this.calculateAverageUptime()

        return {
            generatedAt: new Date().toISOString(),
            overall: {
                status: overallStatus,
                statusText: this.getStatusText(overallStatus),
                uptime30Days: uptime30Days,
                uptimeDisplay: `${uptime30Days.toFixed(2)}%`
            },
            services: this.SERVICES.map(s => ({
                ...s,
                statusIcon: this.getStatusIcon(s.status),
                uptimeDisplay: `${s.uptime.toFixed(2)}%`
            })),
            incidents: this.getRecentIncidents(),
            scheduledMaintenance: this.getScheduledMaintenance(),
            lastUpdated: new Date().toISOString()
        }
    }

    /**
     * Generiert Compliance Badges für Frontend
     */
    public generateComplianceBadges(): ComplianceBadge[] {
        return this.getAllBadges()
    }

    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================

    private getAllBadges(): ComplianceBadge[] {
        const badges: ComplianceBadge[] = []
        this.TRUST_CENTER_SECTIONS.forEach(section => {
            if (section.badges) {
                badges.push(...section.badges)
            }
        })
        return badges
    }

    private generateExecutiveSummary(): WhitepaperSection {
        return {
            title: 'Executive Summary',
            content: `M.A.T.E. (Most Advanced Technology Ever) ist eine Enterprise Voice-AI-Plattform, die höchste Sicherheitsstandards mit modernster KI-Technologie vereint.

**Unsere Sicherheitsphilosophie:**

- **Security by Design:** Sicherheit ist integraler Bestandteil jeder Entwicklungsentscheidung
- **Defense in Depth:** Mehrschichtige Sicherheitsmaßnahmen
- **Zero Trust:** Kein implizites Vertrauen, kontinuierliche Verifizierung
- **Compliance First:** Einhaltung regulatorischer Anforderungen als Grundlage

**Wichtigste Sicherheitsmerkmale:**

- AES-256-GCM Verschlüsselung aller Daten
- TLS 1.3 für alle Kommunikation
- Multi-Faktor-Authentifizierung
- DSGVO-Compliance mit EU-Datenresidenz
- EU AI Act konform
- AI Guardrails für sensible Daten`
        }
    }

    private generateArchitectureOverview(): WhitepaperSection {
        return {
            title: 'Sicherheitsarchitektur',
            content: `### Übersicht

Die M.A.T.E.-Plattform basiert auf einer modernen Microservices-Architektur mit klarer Trennung von Verantwortlichkeiten.

### Komponenten

| Komponente | Zweck | Sicherheitsmaßnahmen |
|------------|-------|---------------------|
| Agent Builder | Visual Flow-Design | RBAC, Session Management |
| Voice Gateway | VAPI-Integration | Webhook-Signatur, TLS |
| LLM Proxy | AI-Modell-Zugriff | Rate Limiting, Guardrails |
| Billing Service | Abrechnung | PCI-DSS via Stripe |
| Database | Persistenz | Encryption at Rest |

### Netzwerksicherheit

- Alle externen Verbindungen über TLS 1.3
- Web Application Firewall (WAF)
- DDoS-Schutz
- VPN-freier Zugriff durch Zero-Trust-Architektur`
        }
    }

    private generateDataSecurity(): WhitepaperSection {
        return {
            title: 'Datensicherheit',
            content: `### Verschlüsselung

**At Rest (Ruhende Daten):**
- AES-256-GCM für alle Datenbankfelder
- Verschlüsselte Backups
- Key Management über Railway Secrets

**In Transit (Übertragung):**
- TLS 1.3 (Minimum) für alle Verbindungen
- HSTS aktiviert
- Perfect Forward Secrecy

### Datenkategorisierung

| Kategorie | Beispiele | Schutzmaßnahmen |
|-----------|-----------|-----------------|
| Hochsensibel | API-Keys, Passwörter | Verschlüsselt, nie geloggt |
| Personenbezogen | E-Mail, Name | DSGVO-konform, Löschbar |
| Nutzungsdaten | Tokens, Minuten | Aggregiert, Anonymisiert |
| Systemdaten | Logs, Metriken | 90 Tage Retention |

### Backup & Recovery

- Tägliche automatische Backups
- 30 Tage Backup-Retention
- Point-in-Time Recovery (PITR)
- Verschlüsselte Off-Site-Speicherung`
        }
    }

    private generateAccessControl(): WhitepaperSection {
        return {
            title: 'Zugriffskontrolle',
            content: `### Authentifizierung

- Passwort-Policy: Min. 12 Zeichen, Komplexitätsanforderungen
- Multi-Faktor-Authentifizierung (MFA) für Admin-Konten
- JWT-basierte Session-Tokens
- Automatische Session-Invalidierung nach Inaktivität

### Autorisierung

**Role-Based Access Control (RBAC):**

| Rolle | Berechtigungen |
|-------|----------------|
| User | Eigene Flows erstellen und verwalten |
| Organization Admin | Team-Verwaltung, Billing |
| Super Admin | Plattform-Konfiguration |

### Audit-Trail

- Alle sicherheitsrelevanten Aktionen werden protokolliert
- Tamper-Proof Logs mit Blockchain-ähnlicher Verkettung
- 365 Tage Log-Retention
- Export in CSV/JSON für Compliance-Audits`
        }
    }

    private generateAISecurity(): WhitepaperSection {
        return {
            title: 'KI-Sicherheit (AI Guardrails)',
            content: `### Datenschutz in AI-Interaktionen

**Automatische PII-Erkennung:**
- E-Mail-Adressen
- Telefonnummern
- Kreditkartennummern
- IBAN/Bankdaten
- Gesundheitsdaten

**Schutzmaßnahmen:**
- Automatische Maskierung vor LLM-Anfragen
- Keine Speicherung von Rohdaten
- Audit-Log für alle erkannten sensiblen Daten

### Prompt Injection Schutz

- Erkennung von Manipulation-Versuchen
- Sandbox-Umgebung für LLM-Ausführung
- Input-Validierung und Sanitization
- Rate Limiting pro User

### EU AI Act Compliance

**Risikoklassifizierung:**
- M.A.T.E. Voice Agent: Limited Risk (Art. 50)
- M.A.T.E. Agent Builder: Minimal Risk

**Transparenzmaßnahmen:**
- Automatische Ansage bei Voice-Agents: "Sie sprechen mit einem KI-Assistenten"
- Menschliche Aufsicht über Supervisor Dashboard
- Notfall-Stopp für alle Agents`
        }
    }

    private generateComplianceSection(): WhitepaperSection {
        return {
            title: 'Compliance & Zertifizierungen',
            content: `### Aktuelle Compliance

| Standard | Status | Details |
|----------|--------|---------|
| DSGVO | ✅ Erreicht | Vollständige Compliance seit Tag 1 |
| EU AI Act | ✅ Ready | Limited Risk Klassifizierung |
| SOC 2 Type II | 🔄 In Vorbereitung | Audit geplant für Q2 2025 |
| ISO 27001 | 📋 Geplant | Implementierung 2025 |

### Regelmäßige Audits

- Jährliche externe Penetrationstests
- Quartärliche interne Sicherheitsreviews
- Kontinuierliches Vulnerability Scanning
- Compliance-Audits durch externe Prüfer

### Dokumentation

Verfügbare Dokumente auf Anfrage:
- Verarbeitungsverzeichnis
- Datenschutz-Folgenabschätzung (DSFA)
- Technisch-Organisatorische Maßnahmen (TOM)
- Auftragsverarbeitungsvertrag (AVV)`
        }
    }

    private generateIncidentResponse(): WhitepaperSection {
        return {
            title: 'Incident Response',
            content: `### Incident Response Team (IRT)

- Dediziertes Security Team
- 24/7 Monitoring und Alerting
- Erreichbar unter security@getmate.ai

### Response-Zeiten

| Schweregrad | Reaktionszeit | Eskalation |
|-------------|---------------|------------|
| Kritisch (P1) | < 1 Stunde | Sofort |
| Hoch (P2) | < 4 Stunden | 2 Stunden |
| Mittel (P3) | < 24 Stunden | 8 Stunden |
| Niedrig (P4) | < 72 Stunden | 24 Stunden |

### Meldepflichten

- DSGVO Art. 33: Meldung an Aufsichtsbehörde binnen 72 Stunden
- Benachrichtigung betroffener Kunden binnen 24 Stunden
- Transparente Kommunikation über Status-Seite

### Responsible Disclosure

Wir bieten ein Bug Bounty Programm für verantwortungsvolle Offenlegung von Sicherheitslücken. Kontaktieren Sie security@getmate.ai.`
        }
    }

    private generateVendorSecurity(): WhitepaperSection {
        return {
            title: 'Vendor & Supply Chain Security',
            content: `### Vendor Risk Management

Alle Drittanbieter werden nach folgenden Kriterien bewertet:

- Sicherheitszertifizierungen (SOC 2, ISO 27001)
- Datenschutz-Compliance (DSGVO, SCCs)
- Auftragsverarbeitungsvertrag
- Regelmäßige Überprüfung

### Subprocessor Management

- Vollständige Liste öffentlich verfügbar
- 30 Tage Vorabmitteilung bei Änderungen
- Widerspruchsrecht für Kunden
- Jährliche Überprüfung aller Subprocessors

### Software Supply Chain

- Automatisierte Dependency Scanning
- SBOM (Software Bill of Materials) verfügbar
- Signierte Container Images
- Regelmäßige Updates und Patches`
        }
    }

    private calculateOverallStatus(): ServiceStatus['status'] {
        if (this.SERVICES.some(s => s.status === 'outage')) return 'outage'
        if (this.SERVICES.some(s => s.status === 'maintenance')) return 'maintenance'
        if (this.SERVICES.some(s => s.status === 'degraded')) return 'degraded'
        return 'operational'
    }

    private calculateAverageUptime(): number {
        const sum = this.SERVICES.reduce((acc, s) => acc + s.uptime, 0)
        return sum / this.SERVICES.length
    }

    private getStatusText(status: ServiceStatus['status']): string {
        const texts = {
            operational: 'Alle Systeme funktionieren normal',
            degraded: 'Teilweise Beeinträchtigungen',
            outage: 'Systemausfall',
            maintenance: 'Geplante Wartung'
        }
        return texts[status]
    }

    private getStatusIcon(status: ServiceStatus['status']): string {
        const icons = {
            operational: '🟢',
            degraded: '🟡',
            outage: '🔴',
            maintenance: '🔵'
        }
        return icons[status]
    }

    private getRecentIncidents(): object[] {
        // In Produktion würde dies aus einer Datenbank kommen
        return [
            {
                date: '2024-12-30',
                title: 'Geplante Wartung erfolgreich abgeschlossen',
                severity: 'low',
                resolved: true,
                duration: '30 Minuten'
            }
        ]
    }

    private getScheduledMaintenance(): object[] {
        return [
            {
                date: '2025-01-15',
                title: 'Datenbank-Upgrade',
                duration: '1 Stunde',
                impact: 'Kurze Unterbrechung möglich'
            }
        ]
    }
}

// Singleton Export
export const trustCenterGenerator = new TrustCenterGenerator()
