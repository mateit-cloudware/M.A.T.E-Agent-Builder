/**
 * DSFA Generator - Datenschutz-Folgenabschätzung (Art. 35 DSGVO)
 */

import { CompanyInfo, ProcessingActivity, DEFAULT_COMPANY_INFO } from './index'

export interface DPIAOptions {
    companyInfo?: CompanyInfo
    projectName: string
    projectDescription: string
    processingActivities: ProcessingActivity[]
    format?: 'text' | 'html' | 'json'
}

export interface DPIARisk {
    id: string
    category: string
    description: string
    likelihood: 'niedrig' | 'mittel' | 'hoch'
    impact: 'niedrig' | 'mittel' | 'hoch'
    overallRisk: 'niedrig' | 'mittel' | 'hoch' | 'sehr hoch'
    mitigationMeasures: string[]
    residualRisk: 'niedrig' | 'mittel' | 'hoch'
}

// Standard-Risiken für KI-Plattformen
export const AI_PLATFORM_RISKS: DPIARisk[] = [
    {
        id: 'R-001',
        category: 'Vertraulichkeit',
        description: 'Unbefugter Zugriff auf personenbezogene Daten in KI-Konversationen',
        likelihood: 'mittel',
        impact: 'hoch',
        overallRisk: 'hoch',
        mitigationMeasures: [
            'TLS 1.3 Verschlüsselung für alle Datenübertragungen',
            'AES-256 Verschlüsselung für gespeicherte Daten',
            'Rollenbasierte Zugriffskontrolle',
            'Regelmäßige Sicherheitsaudits'
        ],
        residualRisk: 'niedrig'
    },
    {
        id: 'R-002',
        category: 'Integrität',
        description: 'Manipulation von KI-Antworten durch Prompt Injection',
        likelihood: 'mittel',
        impact: 'mittel',
        overallRisk: 'mittel',
        mitigationMeasures: [
            'Prompt Injection Detection',
            'Input-Validierung und Sanitization',
            'Guardrails-System für KI-Outputs',
            'Regelmäßige Überprüfung der KI-Antworten'
        ],
        residualRisk: 'niedrig'
    },
    {
        id: 'R-003',
        category: 'Verfügbarkeit',
        description: 'Ausfall des Dienstes durch DDoS oder Systemfehler',
        likelihood: 'niedrig',
        impact: 'mittel',
        overallRisk: 'mittel',
        mitigationMeasures: [
            'Rate Limiting',
            'Redundante Infrastruktur',
            'Automatisches Failover',
            'Regelmäßige Backups'
        ],
        residualRisk: 'niedrig'
    },
    {
        id: 'R-004',
        category: 'Datenschutz',
        description: 'Unbeabsichtigte Offenlegung von PII durch KI-Antworten',
        likelihood: 'mittel',
        impact: 'hoch',
        overallRisk: 'hoch',
        mitigationMeasures: [
            'PII-Erkennung und automatische Maskierung',
            'Guardrails für sensible Datenkategorien',
            'Regelmäßige Audits der KI-Outputs',
            'Pseudonymisierung von Trainingsdaten'
        ],
        residualRisk: 'niedrig'
    },
    {
        id: 'R-005',
        category: 'Drittlandtransfer',
        description: 'Datenübermittlung an LLM-Provider in Drittländern (USA)',
        likelihood: 'hoch',
        impact: 'mittel',
        overallRisk: 'hoch',
        mitigationMeasures: [
            'EU-US Data Privacy Framework Zertifizierung prüfen',
            'Standardvertragsklauseln (SCCs) mit Providern',
            'Transfer Impact Assessment durchgeführt',
            'Minimierung der übertragenen Daten'
        ],
        residualRisk: 'mittel'
    }
]

/**
 * Generiert eine vollständige DSFA gemäß Art. 35 DSGVO
 */
export function generateDPIA(options: DPIAOptions): string {
    const company = options.companyInfo || DEFAULT_COMPANY_INFO
    const risks = AI_PLATFORM_RISKS
    
    if (options.format === 'json') {
        return JSON.stringify({
            dsfa: {
                projektname: options.projectName,
                beschreibung: options.projectDescription,
                verantwortlicher: company,
                verarbeitungen: options.processingActivities,
                risikobewertung: risks,
                erstellungsdatum: new Date().toISOString(),
                version: '1.0'
            }
        }, null, 2)
    }
    
    return generateTextDPIA(company, options, risks)
}

function generateTextDPIA(company: CompanyInfo, options: DPIAOptions, risks: DPIARisk[]): string {
    const lines: string[] = []
    
    lines.push('=' .repeat(80))
    lines.push('DATENSCHUTZ-FOLGENABSCHÄTZUNG (DSFA)')
    lines.push('gemäß Art. 35 DSGVO')
    lines.push('=' .repeat(80))
    lines.push('')
    
    // 1. Projektübersicht
    lines.push('1. PROJEKTÜBERSICHT')
    lines.push('-'.repeat(40))
    lines.push(`Projektname:    ${options.projectName}`)
    lines.push(`Verantwortlich: ${company.name}`)
    lines.push('')
    lines.push('Beschreibung:')
    lines.push(options.projectDescription)
    lines.push('')
    
    // 2. Notwendigkeit der DSFA
    lines.push('2. NOTWENDIGKEIT DER DSFA')
    lines.push('-'.repeat(40))
    lines.push('Die DSFA ist erforderlich, da folgende Kriterien erfüllt sind:')
    lines.push('  • Systematische und umfassende Bewertung persönlicher Aspekte (Profiling)')
    lines.push('  • Verwendung neuer Technologien (KI/Machine Learning)')
    lines.push('  • Verarbeitung sensibler Daten in großem Umfang möglich')
    lines.push('')
    
    // 3. Verarbeitungsvorgänge
    lines.push('3. BESCHREIBUNG DER VERARBEITUNGSVORGÄNGE')
    lines.push('-'.repeat(40))
    for (const activity of options.processingActivities) {
        lines.push(`[${activity.id}] ${activity.name}`)
        lines.push(`  Zweck: ${activity.purpose}`)
        lines.push(`  Rechtsgrundlage: ${activity.legalBasis}`)
        lines.push('')
    }
    
    // 4. Risikobewertung
    lines.push('4. RISIKOBEWERTUNG')
    lines.push('='.repeat(80))
    lines.push('')
    
    for (const risk of risks) {
        lines.push(`[${risk.id}] ${risk.category}`)
        lines.push('-'.repeat(60))
        lines.push(`Beschreibung: ${risk.description}`)
        lines.push(`Eintrittswahrscheinlichkeit: ${risk.likelihood.toUpperCase()}`)
        lines.push(`Auswirkung: ${risk.impact.toUpperCase()}`)
        lines.push(`Gesamtrisiko (vor Maßnahmen): ${risk.overallRisk.toUpperCase()}`)
        lines.push('')
        lines.push('Abhilfemaßnahmen:')
        risk.mitigationMeasures.forEach(m => lines.push(`  • ${m}`))
        lines.push('')
        lines.push(`Restrisiko (nach Maßnahmen): ${risk.residualRisk.toUpperCase()}`)
        lines.push('')
        lines.push('='.repeat(80))
        lines.push('')
    }
    
    // 5. Erforderlichkeit und Verhältnismäßigkeit
    lines.push('5. ERFORDERLICHKEIT UND VERHÄLTNISMÄßIGKEIT')
    lines.push('-'.repeat(40))
    lines.push('Die Verarbeitung ist erforderlich für:')
    lines.push('  • Bereitstellung der vertraglich vereinbarten KI-Dienste')
    lines.push('  • Abrechnung der Nutzung')
    lines.push('  • Sicherheit und Missbrauchsprävention')
    lines.push('')
    lines.push('Verhältnismäßigkeit wird gewährleistet durch:')
    lines.push('  • Datenminimierung (nur notwendige Daten)')
    lines.push('  • Pseudonymisierung wo möglich')
    lines.push('  • Begrenzte Speicherfristen')
    lines.push('  • Transparenz gegenüber Betroffenen')
    lines.push('')
    
    // 6. Betroffenenrechte
    lines.push('6. MASSNAHMEN ZUR WAHRUNG DER BETROFFENENRECHTE')
    lines.push('-'.repeat(40))
    lines.push('  • Datenschutzerklärung mit vollständigen Informationen (Art. 13/14)')
    lines.push('  • Datenschutz-Center für Selbstverwaltung')
    lines.push('  • Datenexport auf Anfrage (Art. 15 & 20)')
    lines.push('  • Löschung auf Anfrage mit 30-Tage-Frist (Art. 17)')
    lines.push('  • Einschränkung der Verarbeitung möglich (Art. 18)')
    lines.push('  • Widerspruchsrecht gegen Verarbeitung (Art. 21)')
    lines.push('  • Consent-Management mit granularer Kontrolle')
    lines.push('')
    
    // 7. Fazit
    lines.push('7. FAZIT UND GENEHMIGUNG')
    lines.push('-'.repeat(40))
    lines.push('Nach Bewertung aller Risiken und implementierten Maßnahmen ist die')
    lines.push('Verarbeitung unter Einhaltung der dokumentierten Schutzmaßnahmen')
    lines.push('DSGVO-konform durchführbar.')
    lines.push('')
    lines.push('Das Restrisiko ist als AKZEPTABEL einzustufen.')
    lines.push('')
    lines.push('Eine Konsultation der Aufsichtsbehörde gem. Art. 36 DSGVO ist')
    lines.push('NICHT ERFORDERLICH.')
    lines.push('')
    
    // Footer
    lines.push('-'.repeat(80))
    lines.push(`Erstellungsdatum: ${new Date().toLocaleDateString('de-DE')}`)
    lines.push(`Version: 1.0`)
    lines.push(`Nächste Überprüfung: ${getNextReviewDate()}`)
    lines.push('')
    lines.push('Verantwortlicher:')
    lines.push(`${company.name}`)
    lines.push(`${company.email}`)
    if (company.dataProtectionOfficer) {
        lines.push('')
        lines.push('Datenschutzbeauftragter:')
        lines.push(`${company.dataProtectionOfficer.name}`)
        lines.push(`${company.dataProtectionOfficer.email}`)
    }
    lines.push('-'.repeat(80))
    
    return lines.join('\n')
}

function getNextReviewDate(): string {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toLocaleDateString('de-DE')
}
