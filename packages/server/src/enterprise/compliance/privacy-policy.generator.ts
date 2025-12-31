/**
 * Datenschutzerklärung Generator (Art. 13/14 DSGVO)
 */

import { CompanyInfo, ProcessingActivity, DEFAULT_COMPANY_INFO, MATE_PROCESSING_ACTIVITIES } from './index'

export interface PrivacyPolicyOptions {
    companyInfo?: CompanyInfo
    activities?: ProcessingActivity[]
    format?: 'text' | 'html'
    language?: 'de' | 'en'
}

/**
 * Generiert eine vollständige Datenschutzerklärung gemäß Art. 13/14 DSGVO
 */
export function generatePrivacyPolicy(options: PrivacyPolicyOptions = {}): string {
    const company = options.companyInfo || DEFAULT_COMPANY_INFO
    const activities = options.activities || MATE_PROCESSING_ACTIVITIES
    
    if (options.format === 'html') {
        return generateHTMLPrivacyPolicy(company, activities)
    }
    
    return generateTextPrivacyPolicy(company, activities)
}

function generateTextPrivacyPolicy(company: CompanyInfo, activities: ProcessingActivity[]): string {
    return `
================================================================================
DATENSCHUTZERKLÄRUNG
================================================================================

Stand: ${new Date().toLocaleDateString('de-DE')}

Wir freuen uns über Ihr Interesse an unserer Plattform. Der Schutz Ihrer
personenbezogenen Daten ist uns ein besonderes Anliegen. Diese
Datenschutzerklärung informiert Sie über die Verarbeitung Ihrer Daten.


1. VERANTWORTLICHER
================================================================================

${company.name}
${company.address}
${company.city}, ${company.country}
E-Mail: ${company.email}
${company.website ? `Website: ${company.website}` : ''}

${company.dataProtectionOfficer ? `
Datenschutzbeauftragter:
${company.dataProtectionOfficer.name}
E-Mail: ${company.dataProtectionOfficer.email}
${company.dataProtectionOfficer.phone ? `Telefon: ${company.dataProtectionOfficer.phone}` : ''}
` : ''}


2. WELCHE DATEN WIR ERHEBEN
================================================================================

Wir verarbeiten folgende Kategorien personenbezogener Daten:

2.1 Bestandsdaten
- Name, E-Mail-Adresse
- Unternehmensdaten (bei Geschäftskunden)
- Zugangsdaten (Passwort verschlüsselt)

2.2 Nutzungsdaten
- Gesprächsinhalte mit KI-Agenten
- Nutzungsstatistiken
- Technische Logs (IP-Adresse, Zeitstempel)

2.3 Abrechnungsdaten
- Transaktionshistorie
- Rechnungsdaten

2.4 Technische Daten
- IP-Adresse
- Browser- und Geräteinformationen
- Cookies und ähnliche Technologien


3. RECHTSGRUNDLAGEN DER VERARBEITUNG
================================================================================

Wir verarbeiten Ihre Daten auf folgenden Rechtsgrundlagen:

- Art. 6 Abs. 1 lit. a DSGVO: Ihre Einwilligung
- Art. 6 Abs. 1 lit. b DSGVO: Erfüllung eines Vertrags
- Art. 6 Abs. 1 lit. c DSGVO: Rechtliche Verpflichtung
- Art. 6 Abs. 1 lit. f DSGVO: Berechtigte Interessen


4. ZWECKE DER VERARBEITUNG
================================================================================

${activities.map(a => `
${a.name}
- Zweck: ${a.purpose}
- Rechtsgrundlage: ${a.legalBasis}
- Speicherdauer: ${a.retentionPeriod}
`).join('\n')}


5. EMPFÄNGER DER DATEN
================================================================================

Wir übermitteln Ihre Daten an folgende Kategorien von Empfängern:

5.1 Interne Empfänger
- Mitarbeiter mit berechtigtem Zugriff

5.2 Externe Dienstleister (Auftragsverarbeiter)
- Cloud-Hosting-Provider (Railway)
- LLM-Provider (OpenRouter)
- Voice-Provider (VAPI)
- Zahlungsdienstleister (Stripe)

Mit allen Auftragsverarbeitern haben wir Auftragsverarbeitungsverträge
gemäß Art. 28 DSGVO geschlossen.


6. ÜBERMITTLUNG IN DRITTLÄNDER
================================================================================

Einige unserer Dienstleister befinden sich in den USA. Die Übermittlung
erfolgt auf Grundlage von:

- EU-US Data Privacy Framework
- Standardvertragsklauseln (SCCs) gemäß Art. 46 Abs. 2 lit. c DSGVO

Eine Kopie der Garantien können Sie bei uns anfordern.


7. SPEICHERDAUER
================================================================================

Wir speichern Ihre Daten nur so lange, wie es für die jeweiligen Zwecke
erforderlich ist:

- Kontodaten: Bis zur Löschung des Kontos + 30 Tage
- Nutzungsdaten: 90 Tage (Gesprächshistorie) / 365 Tage (Statistiken)
- Abrechnungsdaten: 10 Jahre (gesetzliche Aufbewahrungspflicht)
- Audit-Logs: 90 bis 365 Tage (je nach Kategorie)


8. IHRE RECHTE
================================================================================

Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:

8.1 Auskunftsrecht (Art. 15 DSGVO)
Sie können Auskunft über Ihre bei uns gespeicherten Daten verlangen.

8.2 Recht auf Berichtigung (Art. 16 DSGVO)
Sie können die Berichtigung unrichtiger Daten verlangen.

8.3 Recht auf Löschung (Art. 17 DSGVO)
Sie können die Löschung Ihrer Daten verlangen, sofern keine gesetzlichen
Aufbewahrungspflichten entgegenstehen.

8.4 Recht auf Einschränkung (Art. 18 DSGVO)
Sie können die Einschränkung der Verarbeitung verlangen.

8.5 Recht auf Datenübertragbarkeit (Art. 20 DSGVO)
Sie können Ihre Daten in einem gängigen Format erhalten.

8.6 Widerspruchsrecht (Art. 21 DSGVO)
Sie können der Verarbeitung aus berechtigten Interessen widersprechen.

8.7 Recht auf Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO)
Sie können erteilte Einwilligungen jederzeit widerrufen.

8.8 Beschwerderecht
Sie haben das Recht, sich bei einer Aufsichtsbehörde zu beschweren.


9. COOKIES UND TRACKING
================================================================================

Wir verwenden folgende Kategorien von Cookies:

9.1 Erforderliche Cookies
Technisch notwendig für den Betrieb der Plattform.

9.2 Analyse-Cookies (nur mit Einwilligung)
Zur Verbesserung unserer Dienste.

9.3 Marketing-Cookies (nur mit Einwilligung)
Für personalisierte Werbung.

Sie können Ihre Cookie-Einstellungen jederzeit in unserem Cookie-Banner
oder im Datenschutz-Center anpassen.


10. KI-VERARBEITUNG
================================================================================

Unsere Plattform nutzt KI-Technologie (Large Language Models).

10.1 Transparenzhinweis
Konversationen werden von KI-Systemen verarbeitet. Es handelt sich um
automatisierte Entscheidungsfindung gemäß Art. 22 DSGVO.

10.2 Ihre Kontrolle
- Sie können der KI-basierten Verarbeitung widersprechen
- Sie können eine menschliche Überprüfung verlangen
- Sie können die Nutzung Ihrer Daten für KI-Training ablehnen

10.3 Guardrails
Wir setzen technische Schutzmaßnahmen ein, um:
- Personenbezogene Daten in Antworten zu maskieren
- Sensible Inhalte zu filtern
- Die Qualität der KI-Antworten zu überwachen


11. DATENSCHUTZ-CENTER
================================================================================

In unserem Datenschutz-Center können Sie:
- Ihre Einwilligungen verwalten
- Ihre Daten exportieren
- Eine Löschung beantragen
- Verarbeitungseinschränkungen setzen

Erreichbar unter: ${company.website}/privacy


12. ÄNDERUNGEN DIESER DATENSCHUTZERKLÄRUNG
================================================================================

Wir behalten uns vor, diese Datenschutzerklärung anzupassen. Die aktuelle
Version finden Sie stets auf unserer Website. Wesentliche Änderungen
werden wir Ihnen per E-Mail mitteilen.


13. KONTAKT
================================================================================

Bei Fragen zum Datenschutz wenden Sie sich bitte an:

${company.email}

${company.dataProtectionOfficer ? `
Oder direkt an unseren Datenschutzbeauftragten:
${company.dataProtectionOfficer.email}
` : ''}


================================================================================
Stand: ${new Date().toLocaleDateString('de-DE')}
Version: 1.0
================================================================================
`.trim()
}

function generateHTMLPrivacyPolicy(company: CompanyInfo, activities: ProcessingActivity[]): string {
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Datenschutzerklärung - ${company.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #2c3e50; border-bottom: 2px solid #00B894; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 40px; }
        h3 { color: #7f8c8d; }
        ul, ol { padding-left: 25px; }
        .highlight { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .contact { background: #e8f5e9; padding: 20px; border-radius: 5px; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f5f5f5; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>Datenschutzerklärung</h1>
    <p><strong>Stand:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
    
    <p>Wir freuen uns über Ihr Interesse an unserer Plattform. Der Schutz Ihrer personenbezogenen Daten ist uns ein besonderes Anliegen.</p>
    
    <h2>1. Verantwortlicher</h2>
    <div class="highlight">
        <strong>${company.name}</strong><br>
        ${company.address}<br>
        ${company.city}, ${company.country}<br>
        E-Mail: <a href="mailto:${company.email}">${company.email}</a><br>
        ${company.website ? `Website: <a href="${company.website}">${company.website}</a>` : ''}
    </div>
    
    ${company.dataProtectionOfficer ? `
    <h3>Datenschutzbeauftragter</h3>
    <p>
        ${company.dataProtectionOfficer.name}<br>
        E-Mail: <a href="mailto:${company.dataProtectionOfficer.email}">${company.dataProtectionOfficer.email}</a>
    </p>
    ` : ''}
    
    <h2>2. Welche Daten wir erheben</h2>
    <h3>2.1 Bestandsdaten</h3>
    <ul>
        <li>Name, E-Mail-Adresse</li>
        <li>Unternehmensdaten (bei Geschäftskunden)</li>
        <li>Zugangsdaten (Passwort verschlüsselt)</li>
    </ul>
    
    <h3>2.2 Nutzungsdaten</h3>
    <ul>
        <li>Gesprächsinhalte mit KI-Agenten</li>
        <li>Nutzungsstatistiken</li>
        <li>Technische Logs</li>
    </ul>
    
    <h2>3. Zwecke der Verarbeitung</h2>
    <table>
        <tr><th>Verarbeitung</th><th>Zweck</th><th>Rechtsgrundlage</th></tr>
        ${activities.map(a => `<tr><td>${a.name}</td><td>${a.purpose}</td><td>${a.legalBasis}</td></tr>`).join('')}
    </table>
    
    <h2>4. Ihre Rechte</h2>
    <ul>
        <li><strong>Auskunft</strong> (Art. 15 DSGVO)</li>
        <li><strong>Berichtigung</strong> (Art. 16 DSGVO)</li>
        <li><strong>Löschung</strong> (Art. 17 DSGVO)</li>
        <li><strong>Einschränkung</strong> (Art. 18 DSGVO)</li>
        <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
        <li><strong>Widerspruch</strong> (Art. 21 DSGVO)</li>
    </ul>
    
    <h2>5. Datenschutz-Center</h2>
    <p>In unserem Datenschutz-Center können Sie Ihre Einwilligungen verwalten, Daten exportieren und Löschungen beantragen.</p>
    
    <div class="contact">
        <h3>Kontakt</h3>
        <p>Bei Fragen zum Datenschutz: <a href="mailto:${company.email}">${company.email}</a></p>
    </div>
    
    <div class="footer">
        <p>Stand: ${new Date().toLocaleDateString('de-DE')} | Version 1.0</p>
    </div>
</body>
</html>`
}
