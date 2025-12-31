/**
 * Verarbeitungsverzeichnis Generator (Art. 30 DSGVO)
 */

import { CompanyInfo, ProcessingActivity, DEFAULT_COMPANY_INFO, MATE_PROCESSING_ACTIVITIES } from './index'

export interface ProcessingRecordsOptions {
    companyInfo?: CompanyInfo
    activities?: ProcessingActivity[]
    format?: 'text' | 'html' | 'json'
    language?: 'de' | 'en'
}

/**
 * Generiert ein vollständiges Verarbeitungsverzeichnis gemäß Art. 30 DSGVO
 */
export function generateProcessingRecords(options: ProcessingRecordsOptions = {}): string {
    const company = options.companyInfo || DEFAULT_COMPANY_INFO
    const activities = options.activities || MATE_PROCESSING_ACTIVITIES
    const format = options.format || 'text'

    if (format === 'json') {
        return JSON.stringify({
            verarbeitungsverzeichnis: {
                verantwortlicher: company,
                verarbeitungstaetigkeiten: activities,
                erstellungsdatum: new Date().toISOString(),
                version: '1.0'
            }
        }, null, 2)
    }

    if (format === 'html') {
        return generateHTMLProcessingRecords(company, activities)
    }

    return generateTextProcessingRecords(company, activities)
}

function generateTextProcessingRecords(company: CompanyInfo, activities: ProcessingActivity[]): string {
    const lines: string[] = []
    
    lines.push('=' .repeat(80))
    lines.push('VERZEICHNIS VON VERARBEITUNGSTÄTIGKEITEN')
    lines.push('gemäß Art. 30 Abs. 1 DSGVO')
    lines.push('=' .repeat(80))
    lines.push('')
    
    // Verantwortlicher
    lines.push('1. VERANTWORTLICHER')
    lines.push('-'.repeat(40))
    lines.push(`Name:       ${company.name}`)
    lines.push(`Rechtsform: ${company.legalForm}`)
    lines.push(`Adresse:    ${company.address}`)
    lines.push(`Ort:        ${company.city}, ${company.country}`)
    lines.push(`E-Mail:     ${company.email}`)
    if (company.phone) lines.push(`Telefon:    ${company.phone}`)
    if (company.website) lines.push(`Website:    ${company.website}`)
    lines.push('')
    
    // Datenschutzbeauftragter
    if (company.dataProtectionOfficer) {
        lines.push('2. DATENSCHUTZBEAUFTRAGTER')
        lines.push('-'.repeat(40))
        lines.push(`Name:   ${company.dataProtectionOfficer.name}`)
        lines.push(`E-Mail: ${company.dataProtectionOfficer.email}`)
        if (company.dataProtectionOfficer.phone) {
            lines.push(`Telefon: ${company.dataProtectionOfficer.phone}`)
        }
        lines.push('')
    }
    
    // Verarbeitungstätigkeiten
    lines.push('3. VERARBEITUNGSTÄTIGKEITEN')
    lines.push('='.repeat(80))
    lines.push('')
    
    for (const activity of activities) {
        lines.push(`[${activity.id}] ${activity.name}`)
        lines.push('-'.repeat(60))
        lines.push('')
        lines.push(`Zweck der Verarbeitung:`)
        lines.push(`  ${activity.purpose}`)
        lines.push('')
        lines.push(`Rechtsgrundlage:`)
        lines.push(`  ${activity.legalBasis}`)
        lines.push('')
        lines.push(`Kategorien betroffener Personen:`)
        activity.dataSubjects.forEach(s => lines.push(`  • ${s}`))
        lines.push('')
        lines.push(`Kategorien personenbezogener Daten:`)
        activity.dataCategories.forEach(c => lines.push(`  • ${c}`))
        lines.push('')
        lines.push(`Kategorien von Empfängern:`)
        activity.recipients.forEach(r => lines.push(`  • ${r}`))
        lines.push('')
        
        if (activity.thirdCountryTransfers && activity.thirdCountryTransfers.length > 0) {
            lines.push(`Übermittlungen in Drittländer:`)
            activity.thirdCountryTransfers.forEach(t => {
                lines.push(`  • ${t.country} - Garantien: ${t.safeguards}`)
            })
            lines.push('')
        }
        
        lines.push(`Aufbewahrungsfristen:`)
        lines.push(`  ${activity.retentionPeriod}`)
        lines.push('')
        lines.push(`Technische Maßnahmen (Art. 32 DSGVO):`)
        activity.technicalMeasures.forEach(m => lines.push(`  • ${m}`))
        lines.push('')
        lines.push(`Organisatorische Maßnahmen (Art. 32 DSGVO):`)
        activity.organizationalMeasures.forEach(m => lines.push(`  • ${m}`))
        lines.push('')
        lines.push('='.repeat(80))
        lines.push('')
    }
    
    // Footer
    lines.push('')
    lines.push('-'.repeat(80))
    lines.push(`Erstellungsdatum: ${new Date().toLocaleDateString('de-DE')}`)
    lines.push(`Version: 1.0`)
    lines.push(`Nächste Überprüfung: ${getNextReviewDate()}`)
    lines.push('-'.repeat(80))
    
    return lines.join('\n')
}

function generateHTMLProcessingRecords(company: CompanyInfo, activities: ProcessingActivity[]): string {
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verarbeitungsverzeichnis - ${company.name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #bdc3c7; padding: 10px; text-align: left; }
        th { background-color: #ecf0f1; }
        .activity { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .activity-id { color: #3498db; font-weight: bold; }
        ul { margin: 5px 0; padding-left: 25px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7; font-size: 0.9em; color: #7f8c8d; }
    </style>
</head>
<body>
    <h1>Verzeichnis von Verarbeitungstätigkeiten</h1>
    <p>gemäß Art. 30 Abs. 1 DSGVO</p>
    
    <h2>1. Verantwortlicher</h2>
    <table>
        <tr><th>Name</th><td>${company.name}</td></tr>
        <tr><th>Rechtsform</th><td>${company.legalForm}</td></tr>
        <tr><th>Adresse</th><td>${company.address}, ${company.city}, ${company.country}</td></tr>
        <tr><th>E-Mail</th><td>${company.email}</td></tr>
        ${company.website ? `<tr><th>Website</th><td>${company.website}</td></tr>` : ''}
    </table>
    
    ${company.dataProtectionOfficer ? `
    <h2>2. Datenschutzbeauftragter</h2>
    <table>
        <tr><th>Name</th><td>${company.dataProtectionOfficer.name}</td></tr>
        <tr><th>E-Mail</th><td>${company.dataProtectionOfficer.email}</td></tr>
        ${company.dataProtectionOfficer.phone ? `<tr><th>Telefon</th><td>${company.dataProtectionOfficer.phone}</td></tr>` : ''}
    </table>
    ` : ''}
    
    <h2>3. Verarbeitungstätigkeiten</h2>
    
    ${activities.map(a => `
    <div class="activity">
        <h3><span class="activity-id">[${a.id}]</span> ${a.name}</h3>
        
        <p><strong>Zweck:</strong> ${a.purpose}</p>
        <p><strong>Rechtsgrundlage:</strong> ${a.legalBasis}</p>
        
        <h4>Betroffene Personen:</h4>
        <ul>${a.dataSubjects.map(s => `<li>${s}</li>`).join('')}</ul>
        
        <h4>Datenkategorien:</h4>
        <ul>${a.dataCategories.map(c => `<li>${c}</li>`).join('')}</ul>
        
        <h4>Empfänger:</h4>
        <ul>${a.recipients.map(r => `<li>${r}</li>`).join('')}</ul>
        
        ${a.thirdCountryTransfers && a.thirdCountryTransfers.length > 0 ? `
        <h4>Drittlandübermittlungen:</h4>
        <ul>${a.thirdCountryTransfers.map(t => `<li>${t.country} - ${t.safeguards}</li>`).join('')}</ul>
        ` : ''}
        
        <p><strong>Aufbewahrungsfrist:</strong> ${a.retentionPeriod}</p>
        
        <h4>Technische Maßnahmen:</h4>
        <ul>${a.technicalMeasures.map(m => `<li>${m}</li>`).join('')}</ul>
        
        <h4>Organisatorische Maßnahmen:</h4>
        <ul>${a.organizationalMeasures.map(m => `<li>${m}</li>`).join('')}</ul>
    </div>
    `).join('')}
    
    <div class="footer">
        <p>Erstellungsdatum: ${new Date().toLocaleDateString('de-DE')}</p>
        <p>Version: 1.0</p>
        <p>Nächste Überprüfung: ${getNextReviewDate()}</p>
    </div>
</body>
</html>`
}

function getNextReviewDate(): string {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toLocaleDateString('de-DE')
}
