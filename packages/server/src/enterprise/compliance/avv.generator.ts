/**
 * AVV Generator - Auftragsverarbeitungsvertrag Template (Art. 28 DSGVO)
 */

import { CompanyInfo, DEFAULT_COMPANY_INFO } from './index'

export interface AVVOptions {
    companyInfo?: CompanyInfo
    customerName?: string
    format?: 'text' | 'html'
}

/**
 * Generiert ein AVV-Template gemäß Art. 28 DSGVO
 */
export function generateAVV(options: AVVOptions = {}): string {
    const company = options.companyInfo || DEFAULT_COMPANY_INFO
    const customer = options.customerName || '[AUFTRAGGEBER]'
    
    return generateTextAVV(company, customer)
}

function generateTextAVV(company: CompanyInfo, customer: string): string {
    return `
================================================================================
AUFTRAGSVERARBEITUNGSVERTRAG (AVV)
gemäß Art. 28 DSGVO
================================================================================

zwischen

${customer}
- nachfolgend "Auftraggeber" genannt -

und

${company.name}
${company.address}
${company.city}, ${company.country}
E-Mail: ${company.email}
${company.website ? `Website: ${company.website}` : ''}

- nachfolgend "Auftragnehmer" genannt -


PRÄAMBEL

Der Auftraggeber nutzt die Dienste des Auftragnehmers (M.A.T.E. Plattform).
Im Rahmen dieser Nutzung verarbeitet der Auftragnehmer personenbezogene Daten
im Auftrag des Auftraggebers. Die Parteien schließen daher diesen
Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO.


§ 1 GEGENSTAND UND DAUER DER VERARBEITUNG

(1) Der Auftragnehmer verarbeitet personenbezogene Daten im Auftrag des
    Auftraggebers im Rahmen der Nutzung der M.A.T.E. Plattform für:
    
    • Bereitstellung von KI-basierten Voice- und Chat-Agenten
    • Verwaltung von Benutzerkonten und Workspaces
    • Abrechnung von Dienstleistungen
    • Technischer Support

(2) Die Dauer der Verarbeitung entspricht der Laufzeit des Hauptvertrags.


§ 2 ART UND ZWECK DER VERARBEITUNG

(1) Art der Verarbeitung:
    • Erhebung, Speicherung, Nutzung personenbezogener Daten
    • Übermittlung an Unterauftragsverarbeiter (LLM-Provider, Voice-Provider)
    • Löschung nach Vertragsende oder auf Anforderung

(2) Zweck der Verarbeitung:
    • Bereitstellung der vertraglich vereinbarten Dienste
    • Abrechnung und Buchhaltung
    • Technische Wartung und Support


§ 3 KATEGORIEN BETROFFENER PERSONEN

Folgende Kategorien betroffener Personen können betroffen sein:
    • Mitarbeiter des Auftraggebers
    • Kunden des Auftraggebers
    • Endnutzer der vom Auftraggeber erstellten KI-Agenten
    • Geschäftspartner des Auftraggebers


§ 4 KATEGORIEN PERSONENBEZOGENER DATEN

Folgende Kategorien personenbezogener Daten können verarbeitet werden:
    • Kontaktdaten (Name, E-Mail)
    • Nutzungsdaten (Gesprächsinhalte, Interaktionen)
    • Technische Daten (IP-Adressen, Geräteinformationen)
    • Zahlungsdaten (über Zahlungsdienstleister)


§ 5 PFLICHTEN DES AUFTRAGNEHMERS

(1) Der Auftragnehmer verarbeitet die personenbezogenen Daten nur auf
    dokumentierte Weisung des Auftraggebers.

(2) Der Auftragnehmer gewährleistet, dass sich die zur Verarbeitung
    befugten Personen zur Vertraulichkeit verpflichtet haben.

(3) Der Auftragnehmer trifft alle gemäß Art. 32 DSGVO erforderlichen
    technisch-organisatorischen Maßnahmen (siehe Anlage TOM).

(4) Der Auftragnehmer setzt Unterauftragsverarbeiter nur nach vorheriger
    schriftlicher Genehmigung des Auftraggebers ein. Die aktuell
    genehmigten Unterauftragsverarbeiter sind in Anlage 1 aufgeführt.

(5) Der Auftragnehmer unterstützt den Auftraggeber bei:
    • Beantwortung von Betroffenenanfragen
    • Einhaltung der Pflichten aus Art. 32-36 DSGVO
    • Datenschutz-Folgenabschätzungen

(6) Der Auftragnehmer löscht nach Wahl des Auftraggebers alle
    personenbezogenen Daten nach Beendigung des Auftrags oder gibt sie
    zurück, sofern nicht eine gesetzliche Aufbewahrungspflicht besteht.

(7) Der Auftragnehmer stellt dem Auftraggeber alle erforderlichen
    Informationen zum Nachweis der Einhaltung der Pflichten zur Verfügung.


§ 6 UNTERAUFTRAGSVERARBEITER

(1) Der Auftraggeber erteilt hiermit seine allgemeine Genehmigung für die
    Beauftragung von Unterauftragsverarbeitern. Der Auftragnehmer
    informiert den Auftraggeber über jede beabsichtigte Änderung.

(2) Aktuelle Unterauftragsverarbeiter (Anlage 1):

    | Unternehmen    | Zweck                | Land   | Garantien           |
    |----------------|----------------------|--------|---------------------|
    | Railway        | Cloud-Hosting        | USA    | EU-US DPF           |
    | OpenRouter     | LLM-API-Gateway      | USA    | SCCs                |
    | VAPI           | Voice-Dienste        | USA    | EU-US DPF           |
    | Stripe         | Zahlungsabwicklung   | USA    | EU-US DPF, SCCs     |


§ 7 KONTROLLRECHTE

(1) Der Auftraggeber ist berechtigt, die Einhaltung der datenschutz-
    rechtlichen Vorschriften und der Vereinbarungen dieses Vertrags
    zu überprüfen.

(2) Der Auftragnehmer stellt dem Auftraggeber auf Anfrage folgende
    Nachweise zur Verfügung:
    • Aktuelle TOM-Dokumentation
    • Subprocessor-Liste
    • Relevante Zertifizierungen
    • Audit-Berichte (soweit vorhanden)


§ 8 MITTEILUNGSPFLICHTEN

(1) Der Auftragnehmer informiert den Auftraggeber unverzüglich über:
    • Verletzung des Schutzes personenbezogener Daten (Datenpanne)
    • Wesentliche Verstöße gegen diesen Vertrag
    • Prüfungen durch Aufsichtsbehörden

(2) Die Meldung einer Datenpanne erfolgt innerhalb von 24 Stunden nach
    Kenntnisnahme an: [E-Mail des Auftraggebers]


§ 9 HAFTUNG

Die Haftung richtet sich nach den Bestimmungen des Hauptvertrags und
den gesetzlichen Regelungen der DSGVO, insbesondere Art. 82 DSGVO.


§ 10 SCHLUSSBESTIMMUNGEN

(1) Änderungen und Ergänzungen dieses Vertrags bedürfen der Schriftform.

(2) Sollten einzelne Bestimmungen dieses Vertrags unwirksam sein, bleibt
    die Wirksamkeit der übrigen Bestimmungen unberührt.

(3) Es gilt deutsches Recht. Gerichtsstand ist [Ort].

(4) Dieser Vertrag tritt mit Unterzeichnung in Kraft und gilt für die
    Dauer des Hauptvertrags.


ANLAGEN:
--------
- Anlage 1: Aktuelle Liste der Unterauftragsverarbeiter
- Anlage 2: Technisch-Organisatorische Maßnahmen (TOM)


================================================================================

Ort, Datum: _______________________


Auftraggeber:                           Auftragnehmer:

_____________________________           _____________________________
(Unterschrift, Stempel)                 (Unterschrift, Stempel)

Name: _______________________           Name: _______________________
Position: ___________________           Position: ___________________

================================================================================

Erstellt: ${new Date().toLocaleDateString('de-DE')}
Version: 1.0

HINWEIS: Dieses Template dient als Grundlage und sollte von einem
Rechtsanwalt überprüft und an die spezifischen Anforderungen angepasst werden.

================================================================================
`.trim()
}
