/**
 * M.A.T.E. Health Scanner (G5)
 * 
 * Scanner für geschützte Gesundheitsinformationen (PHI):
 * - Medizinische Diagnosen (ICD-10 Codes)
 * - Medikamente und Wirkstoffe
 * - Behandlungen und Therapien
 * - Gesundheitszustände
 * - Laborbefunde
 * - Versicherungsnummern (Krankenversicherung)
 * 
 * HIPAA-/DSGVO-relevante Gesundheitsdaten
 */

import { BaseScanner } from './base.scanner'
import { DetectionCategory, SeverityLevel } from '../types'

// Deutsche Medikamentenliste (Top 100)
const COMMON_MEDICATIONS = [
    'ibuprofen', 'paracetamol', 'aspirin', 'metformin', 'omeprazol',
    'pantoprazol', 'ramipril', 'bisoprolol', 'simvastatin', 'metoprolol',
    'amlodipin', 'candesartan', 'torasemid', 'hydrochlorothiazid',
    'prednisolon', 'kortison', 'insulin', 'levothyroxin', 'l-thyroxin',
    'diazepam', 'lorazepam', 'tramadol', 'morphin', 'fentanyl',
    'amoxicillin', 'ciprofloxacin', 'azithromycin', 'doxycyclin',
    'fluoxetin', 'sertralin', 'escitalopram', 'citalopram', 'venlafaxin',
    'risperidon', 'quetiapin', 'olanzapin', 'aripiprazol',
    'methotrexat', 'azathioprin', 'rituximab', 'humira', 'adalimumab',
    'ventolin', 'salbutamol', 'budesonid', 'formoterol', 'tiotropium',
    'xarelto', 'rivaroxaban', 'eliquis', 'apixaban', 'warfarin', 'marcumar',
    'viagra', 'sildenafil', 'cialis', 'tadalafil',
    'ozempic', 'semaglutid', 'wegovy', 'mounjaro', 'tirzepatid'
]

// Medizinische Fachbegriffe (Diagnosen)
const MEDICAL_CONDITIONS = [
    'diabetes', 'hypertonie', 'bluthochdruck', 'herzinsuffizienz',
    'koronare herzkrankheit', 'khk', 'herzinfarkt', 'myokardinfarkt',
    'schlaganfall', 'apoplex', 'stroke', 'tumor', 'krebs', 'karzinom',
    'leukämie', 'lymphom', 'melanom', 'demenz', 'alzheimer', 'parkinson',
    'multiple sklerose', 'epilepsie', 'depression', 'angststörung',
    'bipolare störung', 'schizophrenie', 'psychose', 'sucht', 'abhängigkeit',
    'hiv', 'aids', 'hepatitis', 'zirrhose', 'niereninsuffizienz',
    'dialyse', 'transplantation', 'arthritis', 'rheuma', 'osteoporose',
    'asthma', 'copd', 'lungenfibrose', 'pneumonie', 'lungenentzündung',
    'colitis', 'morbus crohn', 'zöliakie', 'gastritis',
    'schwangerschaft', 'fehlgeburt', 'abort', 'sterilität', 'unfruchtbarkeit'
]

export class HealthScanner extends BaseScanner {
    readonly name = 'Health Scanner'
    readonly category = DetectionCategory.HEALTH
    readonly version = '1.0.0'

    private medicationPatterns: RegExp[]
    private conditionPatterns: RegExp[]

    constructor() {
        super()
        this.medicationPatterns = []
        this.conditionPatterns = []
        this.initializePatterns()
    }

    private initializePatterns(): void {
        // ==================== ICD-10 CODES ====================
        
        // ICD-10-GM (Deutsche Modifikation) - Format: A00-Z99.x
        this.patterns.set('icd10_code', {
            regex: /\b[A-Z][0-9]{2}(?:\.[0-9]{1,4})?(?:\s*[+-])?(?!\d)\b/g,
            severity: SeverityLevel.HIGH
        })

        // ICD-10 mit Präfix
        this.patterns.set('icd10_labeled', {
            regex: /(?:ICD[\s-]?10|Diagnose(?:code)?|DRG)[\s:]*[A-Z][0-9]{2}(?:\.[0-9]{1,4})?/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== VERSICHERUNG ====================
        
        // Deutsche Krankenversicherungsnummer (10 Zeichen)
        this.patterns.set('kvnr_de', {
            regex: /(?:KVNR|Krankenversicherungsnummer|Versichertennummer)[\s:]*[A-Z][0-9]{9}/gi,
            severity: SeverityLevel.HIGH
        })

        // Krankenkassen-IK-Nummer (9 Ziffern)
        this.patterns.set('ik_nummer', {
            regex: /(?:IK|Institutionskennzeichen)[\s:]*[0-9]{9}/gi,
            severity: SeverityLevel.MEDIUM
        })

        // US Health Insurance ID (National Provider Identifier)
        this.patterns.set('npi_us', {
            regex: /(?:NPI|Provider[\s-]?ID)[\s:]*[0-9]{10}/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== LABORBEFUNDE ====================
        
        // Laborwerte mit Einheiten
        this.patterns.set('lab_values', {
            regex: /(?:HbA1c|Blutzucker|Glukose|Cholesterin|HDL|LDL|Triglyceride|Kreatinin|GFR|Hämoglobin|Leukozyten|Thrombozyten|TSH|T3|T4|PSA|CRP|BNP)[\s:]*[0-9]+(?:[.,][0-9]+)?[\s]*(?:mg\/dl|mmol\/l|ng\/ml|μg\/l|U\/l|%|g\/dl|fL|\/μl)?/gi,
            severity: SeverityLevel.MEDIUM
        })

        // Blutgruppe
        this.patterns.set('blood_type', {
            regex: /\b(?:Blutgruppe[\s:]*)?(?:A|B|AB|0)[+-]?\s*(?:Rh[esus]?[\s-]?)?(?:positiv|negativ|pos|neg|\+|-)\b/gi,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== BEHANDLUNGEN ====================
        
        // OP-Codes (OPS)
        this.patterns.set('ops_code', {
            regex: /(?:OPS|Prozedur(?:code)?)[\s:]*[0-9]{1}-[0-9]{2,3}(?:\.[0-9]{1,2})?/gi,
            severity: SeverityLevel.HIGH
        })

        // Behandlungstermine
        this.patterns.set('treatment_date', {
            regex: /(?:OP|Operation|Behandlung|Therapie|Eingriff)[\s-]*(?:am|vom)?[\s:]*(?:0[1-9]|[12][0-9]|3[01])[./-](?:0[1-9]|1[0-2])[./-](?:19|20)\d{2}/gi,
            severity: SeverityLevel.MEDIUM
        })

        // ==================== GESUNDHEITSZUSTAND ====================
        
        // BMI
        this.patterns.set('bmi', {
            regex: /\bBMI[\s:]*[0-9]{2}(?:[.,][0-9])?(?:\s*kg\/m²)?\b/gi,
            severity: SeverityLevel.LOW
        })

        // Schwangerschaftswoche
        this.patterns.set('pregnancy_week', {
            regex: /(?:SSW|Schwangerschaftswoche)[\s:]*(?:[1-4]?[0-9])(?:\+[0-6])?/gi,
            severity: SeverityLevel.HIGH
        })

        // ==================== ARZT/KRANKENHAUS ====================
        
        // Arztpraxis/Krankenhaus-Kontext
        this.patterns.set('medical_context', {
            regex: /(?:Dr\.?\s*med\.?|Facharzt|Chefarzt|Oberarzt|Hausarzt|Klinik|Krankenhaus|Hospital|Praxis)[\s:]+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*/gi,
            severity: SeverityLevel.LOW
        })

        // Krankschreibung
        this.patterns.set('sick_leave', {
            regex: /(?:Krankschreibung|Arbeitsunfähigkeit|AU)[\s:]+(?:vom|bis|ab)[\s]*(?:0[1-9]|[12][0-9]|3[01])[./-](?:0[1-9]|1[0-2])[./-](?:19|20)\d{2}/gi,
            severity: SeverityLevel.MEDIUM
        })

        // Medikamente und Bedingungen als dynamische Patterns initialisieren
        this.initializeMedicationPatterns()
        this.initializeConditionPatterns()
    }

    private initializeMedicationPatterns(): void {
        // Medikamente-Pattern erstellen
        const medPattern = COMMON_MEDICATIONS.join('|')
        
        // Medikamentenname mit Dosierung
        this.patterns.set('medication_dosage', {
            regex: new RegExp(
                `(?:${medPattern})\\s*(?:[0-9]+(?:[.,][0-9]+)?\\s*(?:mg|g|ml|µg|IE|Einheiten))`,
                'gi'
            ),
            severity: SeverityLevel.HIGH
        })

        // Medikamentenname allein
        this.patterns.set('medication_name', {
            regex: new RegExp(`\\b(?:${medPattern})\\b`, 'gi'),
            severity: SeverityLevel.MEDIUM
        })

        // Für quickMask Zugriff speichern
        this.medicationPatterns = [
            new RegExp(`\\b(?:${medPattern})\\b`, 'gi')
        ]
    }

    private initializeConditionPatterns(): void {
        // Medizinische Bedingungen Pattern
        const condPattern = MEDICAL_CONDITIONS.join('|')
        
        // Diagnose im Kontext
        this.patterns.set('diagnosis_context', {
            regex: new RegExp(
                `(?:Diagnose|diagnostiziert|leidet\\s+an|behandelt\\s+wegen)[\\s:]*(?:${condPattern})`,
                'gi'
            ),
            severity: SeverityLevel.HIGH
        })

        // Bedingung allein (geringere Konfidenz)
        this.patterns.set('condition_name', {
            regex: new RegExp(`\\b(?:${condPattern})\\b`, 'gi'),
            severity: SeverityLevel.MEDIUM
        })

        this.conditionPatterns = [
            new RegExp(`\\b(?:${condPattern})\\b`, 'gi')
        ]
    }

    /**
     * Maskiert Gesundheitsdaten basierend auf Typ
     */
    protected maskValue(value: string, type: string): string {
        switch (type) {
            case 'icd10_code':
            case 'icd10_labeled':
                // ICD-Code: A12.3 -> [ICD-CODE]
                return '[ICD-CODE]'
            
            case 'kvnr_de':
                // KVNR: A123456789 -> KVNR: A*******89
                return value.replace(/[A-Z][0-9]{9}/, (m) => m[0] + '*******' + m.slice(-2))
            
            case 'ik_nummer':
                return value.replace(/[0-9]{9}/, '*****' + value.slice(-4))
            
            case 'npi_us':
                return value.replace(/[0-9]{10}/, '******' + value.slice(-4))
            
            case 'lab_values':
                // "HbA1c: 7.2%" -> "[LABORWERT]"
                return '[LABORWERT]'
            
            case 'blood_type':
                return '[BLUTGRUPPE]'
            
            case 'ops_code':
                return '[OP-CODE]'
            
            case 'treatment_date':
                // Datum maskieren
                return value.replace(
                    /(?:0[1-9]|[12][0-9]|3[01])[./-](?:0[1-9]|1[0-2])[./-](?:19|20)\d{2}/,
                    '[DATUM]'
                )
            
            case 'bmi':
                return 'BMI: [WERT]'
            
            case 'pregnancy_week':
                return 'SSW [WOCHE]'
            
            case 'medication_dosage':
                return '[MEDIKAMENT + DOSIERUNG]'
            
            case 'medication_name':
                return '[MEDIKAMENT]'
            
            case 'diagnosis_context':
            case 'condition_name':
                return '[MEDIZINISCHE_INFORMATION]'
            
            case 'medical_context':
                // Arzt/Klinik Namen maskieren
                return value.replace(
                    /[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*/,
                    '[NAME]'
                )
            
            case 'sick_leave':
                return value.replace(
                    /(?:0[1-9]|[12][0-9]|3[01])[./-](?:0[1-9]|1[0-2])[./-](?:19|20)\d{2}/g,
                    '[DATUM]'
                )
            
            default:
                return '[GESUNDHEITSDATEN]'
        }
    }

    /**
     * Berechnet Konfidenz für Match
     */
    protected calculateConfidence(value: string, type: string): number {
        switch (type) {
            case 'icd10_code':
                // Prüfe ob gültiger ICD-10-Bereich
                const codeMatch = value.match(/[A-Z][0-9]{2}/)
                if (codeMatch) {
                    const letter = codeMatch[0][0]
                    // A00-T98 sind medizinische Codes
                    if (letter >= 'A' && letter <= 'T') return 0.95
                    // U-Z sind spezielle Codes
                    if (letter >= 'U' && letter <= 'Z') return 0.7
                }
                return 0.5
            
            case 'icd10_labeled':
            case 'diagnosis_context':
                return 0.95 // Mit Label/Kontext sehr zuverlässig
            
            case 'kvnr_de':
            case 'npi_us':
                return 0.9
            
            case 'lab_values':
                // Mit Einheit höhere Konfidenz
                if (/mg\/dl|mmol\/l|ng\/ml|U\/l/i.test(value)) return 0.9
                return 0.7
            
            case 'medication_dosage':
                return 0.95 // Mit Dosierung sehr eindeutig
            
            case 'medication_name':
                return 0.75 // Ohne Dosierung könnte auch anders gemeint sein
            
            case 'condition_name':
                // Alleinstehendes Wort - geringere Konfidenz
                return 0.6
            
            case 'blood_type':
                if (/Blutgruppe/i.test(value)) return 0.95
                return 0.7
            
            case 'bmi':
                return 0.85
            
            case 'pregnancy_week':
                return 0.95
            
            default:
                return 0.7
        }
    }

    /**
     * Prüft ob Text medizinische Diagnosen enthält
     */
    public containsDiagnosis(text: string): boolean {
        const diagnosisTypes = ['icd10_code', 'icd10_labeled', 'diagnosis_context', 'condition_name']
        
        for (const type of diagnosisTypes) {
            const pattern = this.patterns.get(type)
            if (pattern && pattern.regex.test(text)) {
                return true
            }
        }
        
        return false
    }

    /**
     * Prüft ob Text Medikamente enthält
     */
    public containsMedication(text: string): boolean {
        const medTypes = ['medication_dosage', 'medication_name']
        
        for (const type of medTypes) {
            const pattern = this.patterns.get(type)
            if (pattern && pattern.regex.test(text)) {
                return true
            }
        }
        
        return false
    }

    /**
     * Extrahiert alle medizinischen Informationen für Audit
     */
    public extractHealthInfo(text: string): {
        diagnoses: string[]
        medications: string[]
        labValues: string[]
        insuranceIds: string[]
    } {
        const result = {
            diagnoses: [] as string[],
            medications: [] as string[],
            labValues: [] as string[],
            insuranceIds: [] as string[]
        }

        // ICD-10 Codes
        const icdPattern = this.patterns.get('icd10_code')
        if (icdPattern) {
            const matches = text.match(icdPattern.regex)
            if (matches) result.diagnoses.push(...matches)
        }

        // Medikamente
        for (const type of ['medication_dosage', 'medication_name']) {
            const pattern = this.patterns.get(type)
            if (pattern) {
                const matches = text.match(pattern.regex)
                if (matches) result.medications.push(...matches)
            }
        }

        // Laborwerte
        const labPattern = this.patterns.get('lab_values')
        if (labPattern) {
            const matches = text.match(labPattern.regex)
            if (matches) result.labValues.push(...matches)
        }

        // Versicherungsnummern
        const kvnrPattern = this.patterns.get('kvnr_de')
        if (kvnrPattern) {
            const matches = text.match(kvnrPattern.regex)
            if (matches) result.insuranceIds.push(...matches)
        }

        // Duplikate entfernen
        result.diagnoses = [...new Set(result.diagnoses)]
        result.medications = [...new Set(result.medications)]
        result.labValues = [...new Set(result.labValues)]
        result.insuranceIds = [...new Set(result.insuranceIds)]

        return result
    }

    /**
     * HIPAA/DSGVO-Compliance Check
     */
    public isHIPAACompliant(text: string): {
        compliant: boolean
        violations: string[]
    } {
        const violations: string[] = []

        // Prüfe auf unverschlüsselte PHI
        const healthInfo = this.extractHealthInfo(text)
        
        if (healthInfo.diagnoses.length > 0) {
            violations.push(`${healthInfo.diagnoses.length} Diagnose(n) gefunden`)
        }
        
        if (healthInfo.medications.length > 0) {
            violations.push(`${healthInfo.medications.length} Medikament(e) gefunden`)
        }
        
        if (healthInfo.insuranceIds.length > 0) {
            violations.push(`${healthInfo.insuranceIds.length} Versicherungsnummer(n) gefunden`)
        }

        return {
            compliant: violations.length === 0,
            violations
        }
    }
}
