/**
 * M.A.T.E. Invoice Service
 * 
 * Generiert Rechnungen und PDFs für Nutzungsabrechnungen.
 * 
 * Features:
 * - Monatliche Rechnungsdaten
 * - PDF-Generierung mit professionellem Layout
 * - Rechnungsnummern-Verwaltung
 * - Steuerberechnung (optional)
 */

import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'
import { billingService } from './billing.service'
import { WalletService } from './wallet.service'
import { UserService } from './user.service'

// ==================== TYPES ====================

export interface InvoiceLineItem {
    description: string
    quantity: number
    unit: string
    unitPriceCents: number
    totalCents: number
}

export interface Invoice {
    id: string
    invoiceNumber: string
    userId: string
    userEmail: string
    userName: string
    
    // Adressdaten
    billingAddress?: {
        company?: string
        name: string
        street?: string
        city?: string
        postalCode?: string
        country: string
        vatId?: string
    }
    
    // Zeitraum
    periodStart: Date
    periodEnd: Date
    
    // Positionen
    items: InvoiceLineItem[]
    
    // Beträge (in Cents)
    subtotalCents: number
    discountCents: number
    netCents: number
    vatPercent: number
    vatCents: number
    totalCents: number
    
    // Metadaten
    currency: string
    createdAt: Date
    dueDate: Date
    status: 'draft' | 'issued' | 'paid' | 'cancelled'
    paidAt?: Date
    
    // Referenzen
    transactionIds: string[]
}

// ==================== SERVICE ====================

class InvoiceService {
    private static instance: InvoiceService
    private walletService: WalletService
    private userService: UserService

    private constructor() {
        this.walletService = new WalletService()
        this.userService = new UserService()
    }

    public static getInstance(): InvoiceService {
        if (!InvoiceService.instance) {
            InvoiceService.instance = new InvoiceService()
        }
        return InvoiceService.instance
    }

    /**
     * Generiert Rechnungsdaten für einen Monat
     */
    public async generateInvoice(userId: string, year: number, month: number): Promise<Invoice> {
        // Nutzungsdaten holen
        const usageSummary = await billingService.getMonthlyUsageSummary(userId, year, month)
        
        // Benutzerinformationen
        const appServer = getRunningExpressApp()
        const dataSource = appServer.AppDataSource
        
        let userEmail = ''
        let userName = ''
        
        try {
            const queryRunner = dataSource.createQueryRunner()
            await queryRunner.connect()
            const user = await this.userService.readUserById(userId, queryRunner)
            await queryRunner.release()
            
            if (user) {
                userEmail = user.email || ''
                userName = user.name || user.email || ''
            }
        } catch (error) {
            logger.warn('[InvoiceService] User not found:', { userId })
        }

        // Rechnungsnummer generieren
        const invoiceNumber = this.generateInvoiceNumber(userId, year, month)
        
        // Positionen erstellen
        const items: InvoiceLineItem[] = []

        // LLM Token-Nutzung
        if (usageSummary.tokens.total > 0) {
            items.push({
                description: `LLM Token-Nutzung (${this.formatNumber(usageSummary.tokens.total)} Tokens)`,
                quantity: usageSummary.tokens.total,
                unit: 'Tokens',
                unitPriceCents: Math.round(usageSummary.tokens.costCents / usageSummary.tokens.total * 1000) / 1000,
                totalCents: usageSummary.tokens.costCents
            })
        }

        // Voice-Nutzung
        if (usageSummary.voice.totalMinutes > 0) {
            items.push({
                description: `Voice-Nutzung (${usageSummary.voice.totalMinutes} Minuten)`,
                quantity: usageSummary.voice.totalMinutes,
                unit: 'Minuten',
                unitPriceCents: Math.round(usageSummary.voice.costCents / usageSummary.voice.totalMinutes * 100) / 100,
                totalCents: usageSummary.voice.costCents
            })
        }

        // Top-Modelle als Details
        if (usageSummary.topModels && usageSummary.topModels.length > 0) {
            for (const model of usageSummary.topModels.slice(0, 3)) {
                items.push({
                    description: `  └ ${model.model}`,
                    quantity: model.tokens,
                    unit: 'Tokens',
                    unitPriceCents: 0, // Detail-Zeile
                    totalCents: model.costCents
                })
            }
        }

        const subtotalCents = usageSummary.total.costCents
        const discountCents = usageSummary.total.discountAppliedCents
        const netCents = subtotalCents - discountCents
        
        // USt (19% für DE - kann angepasst werden)
        const vatPercent = 0 // Keine USt auf SaaS für B2B mit VAT-ID
        const vatCents = Math.round(netCents * vatPercent / 100)
        const totalCents = netCents + vatCents

        const invoice: Invoice = {
            id: `inv_${year}${String(month).padStart(2, '0')}_${userId.substring(0, 8)}`,
            invoiceNumber,
            userId,
            userEmail,
            userName,
            periodStart: usageSummary.period.startDate,
            periodEnd: usageSummary.period.endDate,
            items,
            subtotalCents,
            discountCents,
            netCents,
            vatPercent,
            vatCents,
            totalCents,
            currency: 'EUR',
            createdAt: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 Tage
            status: 'issued',
            transactionIds: []
        }

        return invoice
    }

    /**
     * Generiert PDF als HTML (für einfache PDF-Konvertierung)
     */
    public generateInvoiceHTML(invoice: Invoice): string {
        const formatEur = (cents: number) => `€${(cents / 100).toFixed(2)}`
        const formatDate = (date: Date) => {
            const d = new Date(date)
            return d.toLocaleDateString('de-DE', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        }

        const monthName = new Date(invoice.periodStart).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

        return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechnung ${invoice.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            padding: 40px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #F9B200;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1B1D1E;
        }
        .logo span {
            color: #F9B200;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-number {
            font-size: 16px;
            font-weight: bold;
            color: #F9B200;
        }
        .addresses {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .address-block h3 {
            font-size: 10px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 8px;
        }
        .period-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .period-info strong {
            color: #F9B200;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th {
            background: #1B1D1E;
            color: white;
            padding: 12px;
            text-align: left;
        }
        th:last-child, td:last-child {
            text-align: right;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        .detail-row td {
            color: #666;
            font-size: 11px;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals table {
            margin-bottom: 0;
        }
        .totals td {
            border: none;
        }
        .total-row {
            font-size: 16px;
            font-weight: bold;
            background: #F9B200;
            color: white;
        }
        .total-row td {
            padding: 15px 12px;
        }
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        .payment-info {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .payment-info h4 {
            color: #1B1D1E;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">M.A.T.<span>E.</span></div>
        <div class="invoice-info">
            <div class="invoice-number">Rechnung ${invoice.invoiceNumber}</div>
            <div>Datum: ${formatDate(invoice.createdAt)}</div>
            <div>Fällig: ${formatDate(invoice.dueDate)}</div>
        </div>
    </div>

    <div class="addresses">
        <div class="address-block">
            <h3>Rechnungsadresse</h3>
            <div><strong>${invoice.userName || 'Kunde'}</strong></div>
            <div>${invoice.userEmail}</div>
        </div>
        <div class="address-block">
            <h3>Leistungserbringer</h3>
            <div><strong>mateit-cloudware GmbH</strong></div>
            <div>KI-Plattform M.A.T.E.</div>
            <div>Deutschland</div>
        </div>
    </div>

    <div class="period-info">
        <strong>Abrechnungszeitraum:</strong> ${monthName}
        (${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)})
    </div>

    <table>
        <thead>
            <tr>
                <th>Beschreibung</th>
                <th>Menge</th>
                <th>Einheit</th>
                <th>Betrag</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr class="${item.description.startsWith('  └') ? 'detail-row' : ''}">
                    <td>${item.description}</td>
                    <td>${item.description.startsWith('  └') ? '' : this.formatNumber(item.quantity)}</td>
                    <td>${item.description.startsWith('  └') ? '' : item.unit}</td>
                    <td>${item.description.startsWith('  └') ? '' : formatEur(item.totalCents)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Zwischensumme:</td>
                <td>${formatEur(invoice.subtotalCents)}</td>
            </tr>
            ${invoice.discountCents > 0 ? `
            <tr>
                <td>Volumen-Rabatt:</td>
                <td>-${formatEur(invoice.discountCents)}</td>
            </tr>
            ` : ''}
            <tr>
                <td>Nettobetrag:</td>
                <td>${formatEur(invoice.netCents)}</td>
            </tr>
            ${invoice.vatPercent > 0 ? `
            <tr>
                <td>USt (${invoice.vatPercent}%):</td>
                <td>${formatEur(invoice.vatCents)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
                <td>Gesamtbetrag:</td>
                <td>${formatEur(invoice.totalCents)}</td>
            </tr>
        </table>
    </div>

    <div class="payment-info">
        <h4>Zahlungsinformation</h4>
        <p>Der Betrag wurde automatisch von Ihrem M.A.T.E. Guthaben abgebucht.</p>
        <p>Bei Fragen wenden Sie sich bitte an: billing@getmate.ai</p>
    </div>

    <div class="footer">
        <p>mateit-cloudware GmbH · M.A.T.E. KI-Plattform</p>
        <p>Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.</p>
    </div>
</body>
</html>
`
    }

    /**
     * Generiert eine eindeutige Rechnungsnummer
     */
    private generateInvoiceNumber(userId: string, year: number, month: number): string {
        const userPrefix = userId.substring(0, 4).toUpperCase()
        return `INV-${year}${String(month).padStart(2, '0')}-${userPrefix}`
    }

    private formatNumber(num: number): string {
        if (num >= 1_000_000) {
            return `${(num / 1_000_000).toFixed(1)}M`
        }
        if (num >= 1_000) {
            return `${(num / 1_000).toFixed(1)}K`
        }
        return num.toLocaleString('de-DE')
    }
}

export const invoiceService = InvoiceService.getInstance()
