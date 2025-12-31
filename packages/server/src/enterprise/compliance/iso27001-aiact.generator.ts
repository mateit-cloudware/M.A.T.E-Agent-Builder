/**
 * M.A.T.E. ISO 27001 & EU AI Act Compliance Framework (S4 & S5)
 * 
 * Compliance-Dokumentation und Nachweisführung für:
 * - ISO 27001:2022 Information Security Management System (ISMS)
 * - EU AI Act (Regulation 2024/1689)
 */

import { v4 as uuidv4 } from 'uuid'

// ==================== ISO 27001 FRAMEWORK ====================

export interface ISMSPolicy {
    id: string
    title: string
    description: string
    category: 'organizational' | 'people' | 'physical' | 'technological'
    controlNumber: string  // z.B. 'A.5.1'
    implementationStatus: 'planned' | 'in_progress' | 'implemented' | 'verified'
    implementationNotes?: string
    responsibleRole: string
    reviewFrequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually'
    lastReview?: Date
    nextReview?: Date
}

export interface RiskAssessment {
    id: string
    assetId: string
    assetName: string
    threatDescription: string
    vulnerabilityDescription: string
    likelihood: 1 | 2 | 3 | 4 | 5  // 1=Sehr niedrig, 5=Sehr hoch
    impact: 1 | 2 | 3 | 4 | 5
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    riskScore: number  // likelihood * impact
    treatmentOption: 'mitigate' | 'accept' | 'transfer' | 'avoid'
    controls: string[]  // Verweise auf Controls
    residualRisk?: number
    status: 'identified' | 'assessed' | 'treated' | 'monitored'
    owner: string
    createdAt: Date
    updatedAt: Date
}

export interface AssetInventory {
    id: string
    name: string
    type: 'hardware' | 'software' | 'data' | 'service' | 'personnel' | 'facility'
    description: string
    owner: string
    classification: 'public' | 'internal' | 'confidential' | 'strictly_confidential'
    location: string
    criticality: 'low' | 'medium' | 'high' | 'critical'
    dependencies: string[]
    threats: string[]
    controls: string[]
}

// ==================== EU AI ACT FRAMEWORK ====================

export enum AIRiskCategory {
    UNACCEPTABLE = 'unacceptable',
    HIGH = 'high',
    LIMITED = 'limited',
    MINIMAL = 'minimal'
}

export interface AISystemAssessment {
    id: string
    systemName: string
    description: string
    riskCategory: AIRiskCategory
    purpose: string
    useCases: string[]
    dataTypes: string[]
    humanOversight: boolean
    transparencyMeasures: string[]
    biasAssessment?: string
    conformityStatus: 'pending' | 'compliant' | 'non_compliant' | 'exempt'
}

// ==================== ISO 27001 SERVICE ====================

class ISO27001ComplianceService {
    // ISO 27001:2022 Annex A Controls (vereinfacht)
    private readonly ISO_CONTROLS: ISMSPolicy[] = [
        // A.5 Organizational Controls
        {
            id: uuidv4(),
            title: 'Policies for information security',
            description: 'Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel.',
            category: 'organizational',
            controlNumber: 'A.5.1',
            implementationStatus: 'implemented',
            responsibleRole: 'Information Security Officer',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Information security roles and responsibilities',
            description: 'Information security roles and responsibilities shall be defined and allocated according to the organization needs.',
            category: 'organizational',
            controlNumber: 'A.5.2',
            implementationStatus: 'implemented',
            responsibleRole: 'HR Manager',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Segregation of duties',
            description: 'Conflicting duties and conflicting areas of responsibility shall be segregated.',
            category: 'organizational',
            controlNumber: 'A.5.3',
            implementationStatus: 'implemented',
            responsibleRole: 'Operations Manager',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Management responsibilities',
            description: 'Management shall require all personnel to apply information security in accordance with the established policies and procedures.',
            category: 'organizational',
            controlNumber: 'A.5.4',
            implementationStatus: 'implemented',
            responsibleRole: 'CEO',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Contact with authorities',
            description: 'Appropriate contacts with relevant authorities shall be maintained.',
            category: 'organizational',
            controlNumber: 'A.5.5',
            implementationStatus: 'implemented',
            responsibleRole: 'Legal Counsel',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Threat intelligence',
            description: 'Information relating to information security threats shall be collected and analysed to produce threat intelligence.',
            category: 'organizational',
            controlNumber: 'A.5.7',
            implementationStatus: 'implemented',
            responsibleRole: 'Security Operations',
            reviewFrequency: 'monthly'
        },
        {
            id: uuidv4(),
            title: 'Information security in project management',
            description: 'Information security shall be integrated into project management.',
            category: 'organizational',
            controlNumber: 'A.5.8',
            implementationStatus: 'implemented',
            responsibleRole: 'Project Manager',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Inventory of information and other associated assets',
            description: 'An inventory of information and other associated assets shall be developed and maintained.',
            category: 'organizational',
            controlNumber: 'A.5.9',
            implementationStatus: 'implemented',
            responsibleRole: 'IT Manager',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Classification of information',
            description: 'Information shall be classified according to the information security needs of the organization.',
            category: 'organizational',
            controlNumber: 'A.5.12',
            implementationStatus: 'implemented',
            responsibleRole: 'Data Protection Officer',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Access control policy',
            description: 'An access control policy shall be established, documented and reviewed based on business and information security requirements.',
            category: 'organizational',
            controlNumber: 'A.5.15',
            implementationStatus: 'implemented',
            responsibleRole: 'Security Officer',
            reviewFrequency: 'annually'
        },

        // A.6 People Controls
        {
            id: uuidv4(),
            title: 'Screening',
            description: 'Background verification checks on all candidates for employment shall be carried out.',
            category: 'people',
            controlNumber: 'A.6.1',
            implementationStatus: 'implemented',
            responsibleRole: 'HR Manager',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Terms and conditions of employment',
            description: 'The employment contractual agreements shall state the personnel\'s and the organization\'s responsibilities for information security.',
            category: 'people',
            controlNumber: 'A.6.2',
            implementationStatus: 'implemented',
            responsibleRole: 'HR Manager',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Information security awareness, education and training',
            description: 'All personnel shall receive appropriate awareness education and training and regular updates of policies and procedures relevant to their job function.',
            category: 'people',
            controlNumber: 'A.6.3',
            implementationStatus: 'implemented',
            responsibleRole: 'Training Manager',
            reviewFrequency: 'annually'
        },

        // A.7 Physical Controls
        {
            id: uuidv4(),
            title: 'Physical security perimeters',
            description: 'Security perimeters shall be defined and used to protect areas that contain information and other associated assets.',
            category: 'physical',
            controlNumber: 'A.7.1',
            implementationStatus: 'implemented',
            implementationNotes: 'N/A - Cloud-hosted infrastructure via Railway',
            responsibleRole: 'Facilities Manager',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Securing offices, rooms and facilities',
            description: 'Physical security for offices, rooms and facilities shall be designed and implemented.',
            category: 'physical',
            controlNumber: 'A.7.3',
            implementationStatus: 'implemented',
            implementationNotes: 'Remote-first company with encrypted home office setups',
            responsibleRole: 'Facilities Manager',
            reviewFrequency: 'annually'
        },

        // A.8 Technological Controls
        {
            id: uuidv4(),
            title: 'User endpoint devices',
            description: 'Information stored on, processed by or accessible via user endpoint devices shall be protected.',
            category: 'technological',
            controlNumber: 'A.8.1',
            implementationStatus: 'implemented',
            responsibleRole: 'IT Security',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Privileged access rights',
            description: 'The allocation and use of privileged access rights shall be restricted and managed.',
            category: 'technological',
            controlNumber: 'A.8.2',
            implementationStatus: 'implemented',
            responsibleRole: 'IT Security',
            reviewFrequency: 'monthly'
        },
        {
            id: uuidv4(),
            title: 'Secure authentication',
            description: 'Secure authentication technologies and procedures shall be implemented.',
            category: 'technological',
            controlNumber: 'A.8.5',
            implementationStatus: 'implemented',
            implementationNotes: 'MFA enforced for all admin accounts',
            responsibleRole: 'IT Security',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Protection against malware',
            description: 'Protection against malware shall be implemented and supported by appropriate user awareness.',
            category: 'technological',
            controlNumber: 'A.8.7',
            implementationStatus: 'implemented',
            responsibleRole: 'IT Security',
            reviewFrequency: 'monthly'
        },
        {
            id: uuidv4(),
            title: 'Management of technical vulnerabilities',
            description: 'Information about technical vulnerabilities of information systems in use shall be obtained, exposure evaluated and appropriate measures taken.',
            category: 'technological',
            controlNumber: 'A.8.8',
            implementationStatus: 'implemented',
            implementationNotes: 'Automated vulnerability scanning service',
            responsibleRole: 'IT Security',
            reviewFrequency: 'monthly'
        },
        {
            id: uuidv4(),
            title: 'Networks security',
            description: 'Networks and network devices shall be secured, managed and controlled to protect information in systems and applications.',
            category: 'technological',
            controlNumber: 'A.8.20',
            implementationStatus: 'implemented',
            implementationNotes: 'TLS 1.3 enforced, Railway managed infrastructure',
            responsibleRole: 'Network Security',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Security of network services',
            description: 'Security mechanisms, service levels and service requirements of network services shall be identified, implemented and monitored.',
            category: 'technological',
            controlNumber: 'A.8.21',
            implementationStatus: 'implemented',
            responsibleRole: 'Network Security',
            reviewFrequency: 'quarterly'
        },
        {
            id: uuidv4(),
            title: 'Use of cryptography',
            description: 'Rules for the effective use of cryptography shall be defined and implemented.',
            category: 'technological',
            controlNumber: 'A.8.24',
            implementationStatus: 'implemented',
            implementationNotes: 'AES-256-GCM encryption, TLS 1.3',
            responsibleRole: 'Security Architect',
            reviewFrequency: 'annually'
        },
        {
            id: uuidv4(),
            title: 'Logging',
            description: 'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analysed.',
            category: 'technological',
            controlNumber: 'A.8.15',
            implementationStatus: 'implemented',
            implementationNotes: 'Comprehensive audit logging with 365-day retention',
            responsibleRole: 'Security Operations',
            reviewFrequency: 'monthly'
        },
        {
            id: uuidv4(),
            title: 'Monitoring activities',
            description: 'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.',
            category: 'technological',
            controlNumber: 'A.8.16',
            implementationStatus: 'implemented',
            implementationNotes: 'Threat detection service with real-time alerts',
            responsibleRole: 'Security Operations',
            reviewFrequency: 'monthly'
        },
        {
            id: uuidv4(),
            title: 'Data masking',
            description: 'Data masking shall be used in accordance with the organization\'s topic-specific policy on access control and other related policies and business requirements, taking applicable legislation into consideration.',
            category: 'technological',
            controlNumber: 'A.8.11',
            implementationStatus: 'implemented',
            implementationNotes: 'AI Guardrails with PII masking',
            responsibleRole: 'Data Protection Officer',
            reviewFrequency: 'quarterly'
        }
    ]

    // Risiko-Inventar für M.A.T.E.
    private risks: RiskAssessment[] = []
    
    // Asset-Inventar
    private assets: AssetInventory[] = [
        {
            id: uuidv4(),
            name: 'M.A.T.E. Voice Agent Platform',
            type: 'software',
            description: 'Hauptanwendung für Voice-Agent-Entwicklung',
            owner: 'CTO',
            classification: 'confidential',
            location: 'Railway Cloud (EU)',
            criticality: 'critical',
            dependencies: ['PostgreSQL Database', 'Railway Infrastructure', 'OpenRouter API', 'VAPI API'],
            threats: ['Data breach', 'Service disruption', 'Unauthorized access'],
            controls: ['A.8.24', 'A.8.5', 'A.8.15']
        },
        {
            id: uuidv4(),
            name: 'PostgreSQL Database',
            type: 'data',
            description: 'Primäre Datenspeicherung für Benutzerdaten, Wallets, Audit-Logs',
            owner: 'Database Administrator',
            classification: 'strictly_confidential',
            location: 'Railway Cloud (EU)',
            criticality: 'critical',
            dependencies: ['Railway Infrastructure'],
            threats: ['Data breach', 'Data corruption', 'Unauthorized access'],
            controls: ['A.8.24', 'A.8.15', 'A.5.9']
        },
        {
            id: uuidv4(),
            name: 'User Personal Data',
            type: 'data',
            description: 'Personenbezogene Daten der Benutzer (E-Mail, Name, etc.)',
            owner: 'Data Protection Officer',
            classification: 'strictly_confidential',
            location: 'PostgreSQL Database',
            criticality: 'critical',
            dependencies: ['PostgreSQL Database'],
            threats: ['GDPR violation', 'Data breach', 'Identity theft'],
            controls: ['A.5.12', 'A.8.11', 'A.8.24']
        },
        {
            id: uuidv4(),
            name: 'OpenRouter API Integration',
            type: 'service',
            description: 'LLM-Proxy für KI-Modellzugriff',
            owner: 'Integration Lead',
            classification: 'confidential',
            location: 'External (OpenRouter)',
            criticality: 'high',
            dependencies: [],
            threats: ['API key compromise', 'Service disruption', 'Data leakage'],
            controls: ['A.5.19', 'A.8.24']
        },
        {
            id: uuidv4(),
            name: 'VAPI Voice Platform',
            type: 'service',
            description: 'Voice-Agent-Infrastruktur',
            owner: 'Voice Platform Lead',
            classification: 'confidential',
            location: 'External (VAPI)',
            criticality: 'high',
            dependencies: [],
            threats: ['API key compromise', 'Voice data interception'],
            controls: ['A.5.19', 'A.8.24']
        }
    ]

    // ==================== ISMS POLICY GENERATION ====================

    /**
     * Generiert die ISMS-Richtlinie
     */
    public generateISMSPolicy(company: { name: string; ceo: string }): string {
        return `
# ISMS Policy
## Information Security Management System

**Organisation:** ${company.name}
**Freigegeben durch:** ${company.ceo}, CEO
**Version:** 1.0
**Datum:** ${new Date().toLocaleDateString('de-DE')}

---

## 1. Geltungsbereich

Dieses ISMS gilt für alle Informationswerte, Systeme, Prozesse und Mitarbeiter 
von ${company.name}, die an der Entwicklung, dem Betrieb und der Wartung 
der M.A.T.E. Voice-Agent-Plattform beteiligt sind.

## 2. Informationssicherheitsziele

- **Vertraulichkeit:** Schutz vor unbefugtem Zugriff auf Informationen
- **Integrität:** Sicherstellung der Korrektheit und Vollständigkeit von Informationen
- **Verfügbarkeit:** Gewährleistung des Zugriffs auf Informationen bei Bedarf

## 3. Risikomanagement

${company.name} verfolgt einen risikobasierten Ansatz gemäß ISO 27001:2022.
Risiken werden identifiziert, bewertet und angemessen behandelt.

## 4. Rollen und Verantwortlichkeiten

| Rolle | Verantwortlichkeiten |
|-------|---------------------|
| CEO | Gesamtverantwortung für ISMS |
| CISO | Operatives Sicherheitsmanagement |
| DPO | Datenschutz-Compliance |
| IT Security | Technische Sicherheitsmaßnahmen |

## 5. Kontinuierliche Verbesserung

Das ISMS wird jährlich auf Wirksamkeit überprüft und kontinuierlich verbessert.

---
*Dieses Dokument ist vertraulich.*
`
    }

    /**
     * Generiert das Risk Assessment Framework
     */
    public generateRiskAssessmentFramework(): string {
        return `
# Risk Assessment Framework
## ISO 27001 Risikobewertung

### Risikobewertungsmethodik

**Likelihood-Skala:**
| Wert | Beschreibung | Wahrscheinlichkeit |
|------|--------------|-------------------|
| 1 | Sehr niedrig | < 1% pro Jahr |
| 2 | Niedrig | 1-10% pro Jahr |
| 3 | Mittel | 10-50% pro Jahr |
| 4 | Hoch | 50-90% pro Jahr |
| 5 | Sehr hoch | > 90% pro Jahr |

**Impact-Skala:**
| Wert | Beschreibung | Auswirkung |
|------|--------------|-----------|
| 1 | Unwesentlich | Keine messbaren Auswirkungen |
| 2 | Gering | Temporäre Beeinträchtigung |
| 3 | Moderat | Signifikante Beeinträchtigung |
| 4 | Schwer | Erheblicher Schaden |
| 5 | Katastrophal | Existenzbedrohend |

**Risikomatrix:**
\`\`\`
              Impact
Likelihood   1   2   3   4   5
    5        M   H   H   C   C
    4        L   M   H   H   C
    3        L   M   M   H   H
    2        L   L   M   M   H
    1        L   L   L   M   M

L = Low, M = Medium, H = High, C = Critical
\`\`\`

### Risikobehandlungsoptionen

1. **Mitigate:** Implementierung von Kontrollen zur Risikoreduktion
2. **Accept:** Akzeptanz des Risikos mit dokumentierter Begründung
3. **Transfer:** Übertragung des Risikos (z.B. Versicherung)
4. **Avoid:** Vermeidung der risikoreichen Aktivität
`
    }

    /**
     * Generiert das Statement of Applicability (SoA)
     */
    public generateStatementOfApplicability(): string {
        let soa = `
# Statement of Applicability (SoA)
## ISO 27001:2022 Control Implementation

**Datum:** ${new Date().toLocaleDateString('de-DE')}
**Version:** 1.0

| Control # | Control Title | Status | Justification |
|-----------|--------------|--------|---------------|
`

        for (const control of this.ISO_CONTROLS) {
            const status = control.implementationStatus === 'implemented' ? '✅ Implemented' :
                          control.implementationStatus === 'in_progress' ? '🔄 In Progress' :
                          control.implementationStatus === 'planned' ? '📋 Planned' : '✓ Verified'
            
            soa += `| ${control.controlNumber} | ${control.title} | ${status} | ${control.implementationNotes || 'Standard implementation'} |\n`
        }

        return soa
    }

    /**
     * Gibt Asset-Inventar zurück
     */
    public getAssetInventory(): AssetInventory[] {
        return this.assets
    }

    /**
     * Gibt alle Controls zurück
     */
    public getControls(): ISMSPolicy[] {
        return this.ISO_CONTROLS
    }
}

// ==================== EU AI ACT SERVICE ====================

class EUAIActComplianceService {
    // AI-Systeme von M.A.T.E.
    private aiSystems: AISystemAssessment[] = [
        {
            id: uuidv4(),
            systemName: 'M.A.T.E. Voice Agent',
            description: 'KI-gestützter Sprachassistent für Kundeninteraktionen',
            riskCategory: AIRiskCategory.LIMITED,
            purpose: 'Automatisierte Kundeninteraktion und Geschäftsprozesse',
            useCases: [
                'Kundenservice-Automatisierung',
                'Terminbuchungen',
                'FAQ-Beantwortung',
                'Lead-Qualifizierung'
            ],
            dataTypes: ['Gesprächstranskripte', 'Benutzerpräferenzen', 'Geschäftsdaten'],
            humanOversight: true,
            transparencyMeasures: [
                'Ansage als KI-System zu Gesprächsbeginn',
                'Möglichkeit zur Weiterleitung an Menschen',
                'Protokollierung aller Interaktionen'
            ],
            conformityStatus: 'compliant'
        },
        {
            id: uuidv4(),
            systemName: 'M.A.T.E. AI Guardrails',
            description: 'KI-basierte Inhaltsfilterfung für PII und sensible Daten',
            riskCategory: AIRiskCategory.MINIMAL,
            purpose: 'Automatische Erkennung und Maskierung sensibler Informationen',
            useCases: [
                'PII-Erkennung',
                'Prompt-Injection-Prävention',
                'Content-Moderation'
            ],
            dataTypes: ['Texteingaben', 'Modellantworten'],
            humanOversight: true,
            transparencyMeasures: [
                'Logging aller Filteraktionen',
                'Konfigurierbare Filterregeln',
                'Audit-Trail'
            ],
            conformityStatus: 'compliant'
        },
        {
            id: uuidv4(),
            systemName: 'M.A.T.E. Agent Builder Wizard',
            description: 'KI-gestützte Unterstützung bei der Agent-Erstellung',
            riskCategory: AIRiskCategory.MINIMAL,
            purpose: 'Automatische Generierung von Agent-Konfigurationen',
            useCases: [
                'Prompt-Generierung',
                'Template-Vorschläge',
                'Konfigurationsoptimierung'
            ],
            dataTypes: ['Benutzereingaben', 'Geschäftsbeschreibungen'],
            humanOversight: true,
            transparencyMeasures: [
                'Editierbare Vorschläge',
                'Benutzervalidierung vor Aktivierung',
                'Änderungshistorie'
            ],
            conformityStatus: 'compliant'
        }
    ]

    // ==================== AI RISK CLASSIFICATION ====================

    /**
     * Generiert AI-System-Risikoklassifizierung
     */
    public generateAIRiskClassification(): string {
        return `
# EU AI Act Risk Classification
## M.A.T.E. AI Systems Assessment

**Datum:** ${new Date().toLocaleDateString('de-DE')}
**Verordnung:** EU AI Act (Regulation 2024/1689)

---

## Risikoklassen gemäß EU AI Act

### Verbotene Praktiken (Art. 5)
❌ **Nicht anwendbar** - M.A.T.E. verwendet keine verbotenen KI-Praktiken:
- Keine subliminale Beeinflussung
- Keine Ausnutzung von Schwächen
- Kein Social Scoring
- Keine biometrische Echtzeit-Identifizierung

### Hochrisiko-Systeme (Art. 6)
❌ **Nicht anwendbar** - M.A.T.E. Systeme fallen nicht unter:
- Biometrische Identifizierung
- Kritische Infrastruktur
- Bildung und Berufsausbildung
- Beschäftigung und Personalmanagement
- Zugang zu wesentlichen Dienstleistungen
- Strafverfolgung
- Migration und Grenzkontrolle
- Justizverwaltung

### Systeme mit begrenztem Risiko (Art. 50)
✅ **M.A.T.E. Voice Agent** - Transparenzpflichten:
- Benutzer müssen informiert werden, dass sie mit KI interagieren
- ✅ Implementiert: Ansage zu Gesprächsbeginn

### Systeme mit minimalem Risiko
✅ **AI Guardrails & Agent Builder** - Keine spezifischen Pflichten

---

## Implementierte Compliance-Maßnahmen

${this.aiSystems.map(sys => `
### ${sys.systemName}
- **Risikokategorie:** ${sys.riskCategory.toUpperCase()}
- **Zweck:** ${sys.purpose}
- **Menschliche Aufsicht:** ${sys.humanOversight ? '✅ Ja' : '❌ Nein'}
- **Transparenzmaßnahmen:**
${sys.transparencyMeasures.map(t => `  - ${t}`).join('\n')}
- **Konformitätsstatus:** ${sys.conformityStatus.toUpperCase()}
`).join('\n')}

---

## Dokumentationspflichten (Art. 11)

✅ Technische Dokumentation vorhanden
✅ Risikomanagementsystem implementiert
✅ Datenqualitätsmanagement (AI Guardrails)
✅ Logging und Monitoring
✅ Menschliche Aufsicht gewährleistet
`
    }

    /**
     * Generiert Transparenzhinweise
     */
    public generateTransparencyNotices(): string {
        return `
# Transparenzhinweise gemäß EU AI Act

## Pflichtinformation für Benutzer

### M.A.T.E. Voice Agent

**Hinweis bei Gesprächsbeginn:**
"Hallo, ich bin M.A.T.E., ein KI-gestützter Sprachassistent von [Firmenname]. 
Sie sprechen mit einem automatisierten System. Wenn Sie lieber mit einem 
Menschen sprechen möchten, sagen Sie einfach 'Weiterleitung'."

**Hinweis in der Dokumentation:**
M.A.T.E. verwendet künstliche Intelligenz für:
- Sprachverarbeitung und Antwortgenerierung
- Automatische Erkennung sensibler Informationen
- Personalisierte Interaktionen

Die KI-Systeme sind darauf ausgelegt, transparent zu arbeiten und ermöglichen 
jederzeit die Einschaltung menschlicher Mitarbeiter.

### Technische Informationen

| Aspekt | Details |
|--------|---------|
| LLM-Provider | OpenRouter (via API) |
| Voice-Provider | VAPI |
| Datenverarbeitung | EU-Region (Railway Cloud) |
| Datenspeicherung | Verschlüsselt (AES-256-GCM) |
| Aufbewahrung | Gemäß DSGVO-Richtlinien |

### Kontakt für AI-bezogene Anfragen

Für Fragen zu unseren KI-Systemen kontaktieren Sie:
ai-compliance@getmate.ai
`
    }

    /**
     * Generiert Human Oversight Dokumentation
     */
    public generateHumanOversightMechanism(): string {
        return `
# Human Oversight Mechanism
## Menschliche Aufsicht über KI-Systeme

### Übersicht

Gemäß Art. 14 EU AI Act sind geeignete Maßnahmen zur menschlichen Aufsicht implementiert.

### Aufsichtsmaßnahmen

#### 1. Echtzeit-Überwachung
- Dashboard für KI-Interaktionen
- Alerting bei ungewöhnlichem Verhalten
- Live-Monitoring für kritische Gespräche

#### 2. Eskalationsmechanismen
- Automatische Weiterleitung bei Unsicherheit
- Benutzerinitiierte Weiterleitung ("Weiterleitung")
- Supervisor-Eingriffsmöglichkeit

#### 3. Qualitätskontrolle
- Stichprobenprüfung von Gesprächen
- Regelmäßige Bias-Audits
- Performance-Monitoring

#### 4. Abschaltungsmechanismen
- Notfall-Shutdown-Funktion
- Graduelle Deaktivierung möglich
- Fallback auf menschliche Bearbeitung

### Verantwortlichkeiten

| Rolle | Verantwortung |
|-------|---------------|
| AI Operations Manager | Tägliche Überwachung |
| Quality Assurance | Wöchentliche Stichproben |
| Compliance Officer | Monatliche Audits |
| CTO | Quartalsweise Reviews |
`
    }

    /**
     * Gibt alle AI-Systeme zurück
     */
    public getAISystems(): AISystemAssessment[] {
        return this.aiSystems
    }
}

// ==================== SINGLETON INSTANZEN ====================

export const iso27001Service = new ISO27001ComplianceService()
export const euAIActService = new EUAIActComplianceService()
