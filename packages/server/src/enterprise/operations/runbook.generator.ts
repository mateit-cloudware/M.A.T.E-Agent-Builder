/**
 * M.A.T.E. Operations Runbook
 * 
 * Betriebshandbuch für das M.A.T.E. Platform Operations Team.
 * Enthält Prozeduren für:
 * - Incident Response
 * - Deployment
 * - Rollback
 * - Monitoring
 * - Backup & Recovery
 * - Wartung
 * 
 * @since 2024-12-31
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RunbookProcedure {
    id: string
    title: string
    category: RunbookCategory
    severity?: 'critical' | 'high' | 'medium' | 'low'
    estimatedTime: string
    prerequisites: string[]
    steps: RunbookStep[]
    verification: string[]
    rollback?: string[]
}

export interface RunbookStep {
    order: number
    action: string
    command?: string
    expected?: string
    warning?: string
}

export enum RunbookCategory {
    INCIDENT = 'incident',
    DEPLOYMENT = 'deployment',
    ROLLBACK = 'rollback',
    MONITORING = 'monitoring',
    BACKUP = 'backup',
    MAINTENANCE = 'maintenance',
    SECURITY = 'security'
}

// ============================================================================
// RUNBOOK GENERATOR
// ============================================================================

export class RunbookGenerator {

    private readonly RUNBOOK_PROCEDURES: RunbookProcedure[] = [
        // ================================================================
        // DEPLOYMENT PROCEDURES
        // ================================================================
        {
            id: 'DEPLOY-001',
            title: 'Standard Production Deployment',
            category: RunbookCategory.DEPLOYMENT,
            estimatedTime: '15-30 Minuten',
            prerequisites: [
                'Alle Tests auf main Branch erfolgreich',
                'Deployment-Fenster bestätigt (außerhalb Peak-Zeiten)',
                'Rollback-Strategie vorbereitet',
                'Stakeholder informiert'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Git Status prüfen',
                    command: 'git status && git log -1',
                    expected: 'Clean working directory, korrekter Commit'
                },
                {
                    order: 2,
                    action: 'Build lokal testen',
                    command: 'pnpm build',
                    expected: 'Build erfolgreich ohne Fehler'
                },
                {
                    order: 3,
                    action: 'Push zu main Branch',
                    command: 'git push origin main',
                    expected: 'Push erfolgreich'
                },
                {
                    order: 4,
                    action: 'Railway Auto-Deploy überwachen',
                    command: 'Railway Dashboard öffnen: https://railway.app/project/mate',
                    expected: 'Build startet automatisch'
                },
                {
                    order: 5,
                    action: 'Build-Logs überwachen',
                    expected: 'Keine Fehler im Build-Prozess'
                },
                {
                    order: 6,
                    action: 'Health Check durchführen',
                    command: 'curl -f https://getmate.ai/api/v1/health',
                    expected: 'HTTP 200, Status: healthy'
                },
                {
                    order: 7,
                    action: 'Smoke Tests durchführen',
                    expected: 'Login, Agent-Erstellung, Billing funktionieren'
                }
            ],
            verification: [
                'Health Endpoint antwortet mit 200',
                'Login funktioniert',
                'Neue Features verfügbar',
                'Keine Fehler in Sentry'
            ],
            rollback: [
                'ROLLBACK-001 Prozedur initiieren'
            ]
        },

        // ================================================================
        // ROLLBACK PROCEDURES
        // ================================================================
        {
            id: 'ROLLBACK-001',
            title: 'Emergency Rollback zu vorheriger Version',
            category: RunbookCategory.ROLLBACK,
            severity: 'critical',
            estimatedTime: '5-10 Minuten',
            prerequisites: [
                'Kritischer Bug in Production identifiziert',
                'Rollback-Entscheidung durch On-Call Engineer'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Letzten stabilen Commit identifizieren',
                    command: 'git log --oneline -10',
                    expected: 'Stabiler Commit gefunden'
                },
                {
                    order: 2,
                    action: 'Zu stabilem Commit revertieren',
                    command: 'git revert HEAD --no-edit && git push origin main',
                    warning: 'NICHT git reset verwenden!'
                },
                {
                    order: 3,
                    action: 'Railway Redeploy überwachen',
                    expected: 'Neuer Build mit Revert startet'
                },
                {
                    order: 4,
                    action: 'Health Check nach Rollback',
                    command: 'curl -f https://getmate.ai/api/v1/health',
                    expected: 'HTTP 200'
                },
                {
                    order: 5,
                    action: 'Incident dokumentieren',
                    expected: 'Incident Report erstellt'
                }
            ],
            verification: [
                'System ist wieder stabil',
                'Kritischer Bug nicht mehr reproduzierbar',
                'Alle User können arbeiten'
            ]
        },

        // ================================================================
        // INCIDENT RESPONSE
        // ================================================================
        {
            id: 'INCIDENT-001',
            title: 'Service Outage Response',
            category: RunbookCategory.INCIDENT,
            severity: 'critical',
            estimatedTime: '30-120 Minuten',
            prerequisites: [
                'Outage bestätigt durch Monitoring',
                'On-Call Engineer alarmiert'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Umfang des Outages bestimmen',
                    command: 'curl https://getmate.ai/api/v1/health',
                    expected: 'Identifiziere betroffene Services'
                },
                {
                    order: 2,
                    action: 'Status Page aktualisieren',
                    expected: 'Kunden über Outage informiert'
                },
                {
                    order: 3,
                    action: 'Railway Logs prüfen',
                    command: 'Railway Dashboard > Deployments > Logs',
                    expected: 'Fehlerursache identifiziert'
                },
                {
                    order: 4,
                    action: 'Datenbank-Status prüfen',
                    expected: 'PostgreSQL erreichbar und responsiv'
                },
                {
                    order: 5,
                    action: 'Externe Abhängigkeiten prüfen',
                    expected: 'OpenRouter, Vapi, Stripe erreichbar'
                },
                {
                    order: 6,
                    action: 'Korrekturmaßnahmen durchführen',
                    expected: 'Je nach identifizierter Ursache'
                },
                {
                    order: 7,
                    action: 'Service-Recovery verifizieren',
                    command: 'curl -f https://getmate.ai/api/v1/health',
                    expected: 'Alle Services operational'
                },
                {
                    order: 8,
                    action: 'Status Page auf "Operational" setzen',
                    expected: 'Kunden informiert'
                },
                {
                    order: 9,
                    action: 'Post-Incident Review planen',
                    expected: 'PIR Meeting innerhalb 48h'
                }
            ],
            verification: [
                'Alle Services antworten',
                'Keine Fehler in Logs',
                'Kunden-Feedback positiv'
            ]
        },
        {
            id: 'INCIDENT-002',
            title: 'Security Incident Response',
            category: RunbookCategory.SECURITY,
            severity: 'critical',
            estimatedTime: '60-240 Minuten',
            prerequisites: [
                'Sicherheitsvorfall identifiziert',
                'Security Team alarmiert'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Vorfall bestätigen und kategorisieren',
                    expected: 'Art des Vorfalls dokumentiert'
                },
                {
                    order: 2,
                    action: 'Betroffene Systeme isolieren',
                    warning: 'Keine Beweise zerstören!',
                    expected: 'Kompromittierte Systeme isoliert'
                },
                {
                    order: 3,
                    action: 'Kompromittierte Credentials rotieren',
                    expected: 'API Keys, Tokens, Passwörter rotiert'
                },
                {
                    order: 4,
                    action: 'Audit Logs sichern',
                    expected: 'Logs für Forensik gesichert'
                },
                {
                    order: 5,
                    action: 'Betroffene User identifizieren',
                    expected: 'Liste betroffener Accounts'
                },
                {
                    order: 6,
                    action: 'DSGVO-Meldepflicht prüfen',
                    warning: 'Bei Datenverlust: 72h Frist!',
                    expected: 'Meldepflicht bewertet'
                },
                {
                    order: 7,
                    action: 'Betroffene Kunden benachrichtigen',
                    expected: 'DSGVO-konforme Benachrichtigung'
                },
                {
                    order: 8,
                    action: 'Forensische Analyse durchführen',
                    expected: 'Root Cause identifiziert'
                },
                {
                    order: 9,
                    action: 'Remediation-Maßnahmen implementieren',
                    expected: 'Schwachstelle geschlossen'
                },
                {
                    order: 10,
                    action: 'Security Incident Report erstellen',
                    expected: 'Vollständige Dokumentation'
                }
            ],
            verification: [
                'Alle kompromittierten Credentials rotiert',
                'Schwachstelle geschlossen',
                'Betroffene informiert',
                'Incident Report vollständig'
            ]
        },

        // ================================================================
        // BACKUP & RECOVERY
        // ================================================================
        {
            id: 'BACKUP-001',
            title: 'Database Backup Verification',
            category: RunbookCategory.BACKUP,
            estimatedTime: '30 Minuten',
            prerequisites: [
                'Zugang zu Railway Dashboard',
                'Backup-Zeitfenster (Low-Traffic)'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Aktuellen Backup-Status prüfen',
                    command: 'Railway Dashboard > PostgreSQL > Backups',
                    expected: 'Tägliche Backups vorhanden'
                },
                {
                    order: 2,
                    action: 'Letztes Backup-Datum verifizieren',
                    expected: 'Backup nicht älter als 24h'
                },
                {
                    order: 3,
                    action: 'Backup-Größe plausibilisieren',
                    expected: 'Größe entspricht erwartetem Wachstum'
                },
                {
                    order: 4,
                    action: 'Test-Restore in Staging (monatlich)',
                    warning: 'Nur in Staging-Umgebung!',
                    expected: 'Daten korrekt wiederhergestellt'
                }
            ],
            verification: [
                'Backup vorhanden und aktuell',
                'Backup-Größe plausibel',
                'Monatlicher Restore-Test erfolgreich'
            ]
        },
        {
            id: 'BACKUP-002',
            title: 'Database Point-in-Time Recovery',
            category: RunbookCategory.BACKUP,
            severity: 'high',
            estimatedTime: '60-120 Minuten',
            prerequisites: [
                'Datenverlust oder Korruption bestätigt',
                'Recovery-Zeitpunkt identifiziert',
                'Management-Genehmigung'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Application in Maintenance Mode setzen',
                    expected: 'Keine neuen Transaktionen'
                },
                {
                    order: 2,
                    action: 'Aktuellen Stand sichern',
                    expected: 'Snapshot vor Recovery'
                },
                {
                    order: 3,
                    action: 'Railway PITR initiieren',
                    command: 'Railway Dashboard > PostgreSQL > Restore',
                    expected: 'Recovery-Punkt auswählen'
                },
                {
                    order: 4,
                    action: 'Recovery-Status überwachen',
                    expected: 'Restore erfolgreich'
                },
                {
                    order: 5,
                    action: 'Datenintegrität prüfen',
                    expected: 'Kritische Daten vorhanden'
                },
                {
                    order: 6,
                    action: 'Application aus Maintenance Mode nehmen',
                    expected: 'Service wieder verfügbar'
                }
            ],
            verification: [
                'Alle Daten bis zum Recovery-Punkt vorhanden',
                'Application funktioniert',
                'Keine Inkonsistenzen'
            ]
        },

        // ================================================================
        // MONITORING
        // ================================================================
        {
            id: 'MONITOR-001',
            title: 'Daily Health Check',
            category: RunbookCategory.MONITORING,
            estimatedTime: '15 Minuten',
            prerequisites: [
                'Zugang zu Monitoring-Tools'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Health Endpoints prüfen',
                    command: 'curl https://getmate.ai/api/v1/health',
                    expected: 'HTTP 200 für alle Services'
                },
                {
                    order: 2,
                    action: 'Error Rate in Sentry prüfen',
                    expected: 'Error Rate < 0.1%'
                },
                {
                    order: 3,
                    action: 'Response Times prüfen',
                    expected: 'P95 < 500ms'
                },
                {
                    order: 4,
                    action: 'Disk Usage prüfen',
                    expected: 'Usage < 80%'
                },
                {
                    order: 5,
                    action: 'Memory Usage prüfen',
                    expected: 'Usage < 85%'
                },
                {
                    order: 6,
                    action: 'Pending Alerts prüfen',
                    expected: 'Keine kritischen Alerts offen'
                },
                {
                    order: 7,
                    action: 'Backup Status prüfen',
                    expected: 'Letzte Backup < 24h'
                }
            ],
            verification: [
                'Alle Checks bestanden',
                'Keine offenen kritischen Issues'
            ]
        },

        // ================================================================
        // MAINTENANCE
        // ================================================================
        {
            id: 'MAINT-001',
            title: 'Scheduled Maintenance Window',
            category: RunbookCategory.MAINTENANCE,
            estimatedTime: '60-120 Minuten',
            prerequisites: [
                'Wartungsfenster angekündigt (72h vorher)',
                'Status Page aktualisiert',
                'Rollback-Plan vorbereitet'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Status Page auf "Maintenance" setzen',
                    expected: 'Kunden informiert'
                },
                {
                    order: 2,
                    action: 'Aktive Sessions beenden lassen',
                    expected: '5-Minuten Grace Period'
                },
                {
                    order: 3,
                    action: 'Application stoppen',
                    expected: 'Graceful Shutdown'
                },
                {
                    order: 4,
                    action: 'Geplante Wartungsarbeiten durchführen',
                    expected: 'Je nach Wartungsplan'
                },
                {
                    order: 5,
                    action: 'Application starten',
                    expected: 'Startup ohne Fehler'
                },
                {
                    order: 6,
                    action: 'Health Checks durchführen',
                    command: 'curl -f https://getmate.ai/api/v1/health',
                    expected: 'Alle Services healthy'
                },
                {
                    order: 7,
                    action: 'Smoke Tests durchführen',
                    expected: 'Kritische Funktionen OK'
                },
                {
                    order: 8,
                    action: 'Status Page auf "Operational" setzen',
                    expected: 'Kunden informiert'
                }
            ],
            verification: [
                'Wartung erfolgreich abgeschlossen',
                'Alle Services operational',
                'Keine Fehler in Logs'
            ]
        },
        {
            id: 'MAINT-002',
            title: 'Database Migration',
            category: RunbookCategory.MAINTENANCE,
            severity: 'high',
            estimatedTime: '30-60 Minuten',
            prerequisites: [
                'Migrations-Script getestet in Staging',
                'Backup erstellt',
                'Wartungsfenster geplant'
            ],
            steps: [
                {
                    order: 1,
                    action: 'Aktuelles Schema sichern',
                    expected: 'Schema Backup erstellt'
                },
                {
                    order: 2,
                    action: 'Pending Migrations prüfen',
                    command: 'npm run typeorm migration:show',
                    expected: 'Pending Migrations angezeigt'
                },
                {
                    order: 3,
                    action: 'Migration ausführen',
                    command: 'npm run typeorm migration:run',
                    expected: 'Migration erfolgreich'
                },
                {
                    order: 4,
                    action: 'Schema-Änderungen verifizieren',
                    expected: 'Erwartete Änderungen vorhanden'
                },
                {
                    order: 5,
                    action: 'Application Health Check',
                    command: 'curl -f https://getmate.ai/api/v1/health',
                    expected: 'HTTP 200'
                }
            ],
            verification: [
                'Migration erfolgreich',
                'Datenintegrität OK',
                'Application funktioniert'
            ],
            rollback: [
                'npm run typeorm migration:revert',
                'Schema Backup wiederherstellen'
            ]
        }
    ]

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Generiert vollständiges Runbook als Markdown
     */
    public generateFullRunbook(): string {
        const categories = Object.values(RunbookCategory)
        
        let markdown = `# M.A.T.E. Operations Runbook

**Version:** 1.0  
**Stand:** ${new Date().toLocaleDateString('de-DE')}  
**Klassifizierung:** Intern / Operations Team

---

## Inhaltsverzeichnis

${categories.map(cat => `- [${this.formatCategory(cat)}](#${cat})`).join('\n')}

---

## Kontakte

| Rolle | Kontakt |
|-------|---------|
| On-Call Engineer | oncall@getmate.ai |
| Security Team | security@getmate.ai |
| Platform Team | platform@getmate.ai |
| Escalation | cto@getmate.ai |

---

`
        for (const category of categories) {
            const procedures = this.RUNBOOK_PROCEDURES.filter(p => p.category === category)
            if (procedures.length === 0) continue

            markdown += `## ${this.formatCategory(category)} {#${category}}\n\n`
            
            for (const procedure of procedures) {
                markdown += this.formatProcedure(procedure)
            }
        }

        markdown += `
---

## Glossar

| Begriff | Bedeutung |
|---------|-----------|
| PIR | Post-Incident Review |
| PITR | Point-in-Time Recovery |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| SLA | Service Level Agreement |

---

*Dieses Runbook wird regelmäßig aktualisiert. Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE')}*
`
        return markdown
    }

    /**
     * Gibt eine spezifische Prozedur zurück
     */
    public getProcedure(id: string): RunbookProcedure | undefined {
        return this.RUNBOOK_PROCEDURES.find(p => p.id === id)
    }

    /**
     * Gibt alle Prozeduren einer Kategorie zurück
     */
    public getProceduresByCategory(category: RunbookCategory): RunbookProcedure[] {
        return this.RUNBOOK_PROCEDURES.filter(p => p.category === category)
    }

    /**
     * Generiert Runbook als JSON für API
     */
    public generateRunbookData(): object {
        return {
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            procedures: this.RUNBOOK_PROCEDURES,
            categories: Object.values(RunbookCategory).map(cat => ({
                id: cat,
                name: this.formatCategory(cat),
                procedureCount: this.RUNBOOK_PROCEDURES.filter(p => p.category === cat).length
            }))
        }
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    private formatCategory(category: RunbookCategory): string {
        const names: Record<RunbookCategory, string> = {
            [RunbookCategory.INCIDENT]: 'Incident Response',
            [RunbookCategory.DEPLOYMENT]: 'Deployment',
            [RunbookCategory.ROLLBACK]: 'Rollback',
            [RunbookCategory.MONITORING]: 'Monitoring',
            [RunbookCategory.BACKUP]: 'Backup & Recovery',
            [RunbookCategory.MAINTENANCE]: 'Wartung',
            [RunbookCategory.SECURITY]: 'Sicherheit'
        }
        return names[category]
    }

    private formatProcedure(procedure: RunbookProcedure): string {
        let md = `### ${procedure.id}: ${procedure.title}\n\n`
        
        if (procedure.severity) {
            md += `**Severity:** ${procedure.severity.toUpperCase()}\n\n`
        }
        
        md += `**Geschätzte Zeit:** ${procedure.estimatedTime}\n\n`
        
        md += `**Voraussetzungen:**\n`
        for (const prereq of procedure.prerequisites) {
            md += `- [ ] ${prereq}\n`
        }
        md += '\n'

        md += `**Schritte:**\n\n`
        for (const step of procedure.steps) {
            md += `${step.order}. **${step.action}**\n`
            if (step.command) {
                md += `   \`\`\`bash\n   ${step.command}\n   \`\`\`\n`
            }
            if (step.expected) {
                md += `   *Erwartet:* ${step.expected}\n`
            }
            if (step.warning) {
                md += `   ⚠️ **Warnung:** ${step.warning}\n`
            }
            md += '\n'
        }

        md += `**Verifizierung:**\n`
        for (const verify of procedure.verification) {
            md += `- [ ] ${verify}\n`
        }
        md += '\n'

        if (procedure.rollback && procedure.rollback.length > 0) {
            md += `**Rollback:**\n`
            for (const rb of procedure.rollback) {
                md += `- ${rb}\n`
            }
            md += '\n'
        }

        md += '---\n\n'
        return md
    }
}

// Singleton Export
export const runbookGenerator = new RunbookGenerator()
