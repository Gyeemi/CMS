import {
  INVOICE_TERMS_PARAGRAPHS,
  INVOICE_TERMS_TITLE,
  INVOICE_THANK_YOU,
} from '@/constants/invoice-terms';
import { getStudioCompanyDetailLines } from '@/constants/studio-company';
import { buildInvoiceData, getInvoiceClientDetailRows } from '@/types/invoice';
import type { Project } from '@/types/project';
import { formatCurrencyHtml } from '@/types/project';

export function buildInvoiceHtml(project: Project) {
  const data = buildInvoiceData(project);
  const { project: p } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${data.invoiceNumber} - GroovX</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1025; padding: 40px; max-width: 800px; margin: 0 auto; -webkit-font-smoothing: antialiased; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #2563eb; padding-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 700; }
    .brand-groov { color: #000000; }
    .brand-x { color: #2563eb; }
    .tagline { color: #6b6578; font-size: 14px; margin-top: 4px; }
    .company-details { margin-top: 8px; }
    .company-details p { color: #6b6578; font-size: 12px; line-height: 1.5; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 22px; margin-bottom: 8px; }
    .invoice-meta p { color: #6b6578; font-size: 14px; line-height: 1.6; }
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6578; margin-bottom: 8px; }
    .details-grid { display: flex; flex-direction: column; gap: 6px; }
    .details-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .detail-item label { display: block; font-size: 10px; color: #6b6578; margin-bottom: 1px; line-height: 1.2; }
    .detail-item span { font-size: 11px; font-weight: 600; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2dff0; }
    th { font-size: 12px; text-transform: uppercase; color: #6b6578; font-weight: 600; }
    td.amount { text-align: right; font-variant-numeric: tabular-nums; }
    .currency-fraction { font-size: 0.68em; }
    .totals { margin-left: auto; width: 280px; }
    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2dff0; }
    .totals .row.total { font-weight: 700; font-size: 18px; border-bottom: none; color: #6ba3be; padding-top: 12px; }
    .totals .row.balance { font-weight: 600; }
    .totals .row.balance.outstanding { color: #ef4444; }
    .totals .row.balance.clear { color: #f59e0b; }
    .totals .row.paid-balance { font-weight: 600; color: #10b981; }
    .totals .row.paid-balance small { display: block; font-size: 12px; font-weight: 400; color: #6b6578; margin-top: 2px; }
    .payment-history { margin: 20px 0 8px; }
    .payment-history h4 { font-size: 13px; margin-bottom: 10px; color: #1a1025; }
    .payment-history table { margin: 0; }
    .payment-history th, .payment-history td { font-size: 13px; }
    .payment-history .total-row td { font-weight: 700; border-top: 1px solid #e2dff0; }
    .payment-history .amount-paid { color: #10b981; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2dff0; font-size: 13px; color: #6b6578; text-align: center; }
    .terms { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2dff0; }
    .terms h4 { font-size: 13px; margin-bottom: 12px; color: #1a1025; }
    .terms p { font-size: 12px; line-height: 1.6; color: #6b6578; margin-bottom: 10px; }
    .print-actions {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #ffffff;
      padding: 16px;
      text-align: center;
      border-bottom: 1px solid #e2dff0;
      margin: -40px -40px 24px;
    }
    .print-actions button {
      padding: 10px 24px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    @media print {
      .print-actions { display: none !important; }
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button type="button" onclick="window.print()">Print Invoice</button>
  </div>
  <div class="header">
    <div>
      <div class="brand"><span class="brand-groov">Groov</span><span class="brand-x">X</span></div>
      <div class="tagline">Turning Vibes into Hits</div>
      <div class="company-details">
        ${getStudioCompanyDetailLines()
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('')}
      </div>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>${data.invoiceNumber}</strong></p>
      <p>Date: ${data.invoiceDate}</p>
    </div>
  </div>

  <div class="section">
    <h3>Client &amp; Project</h3>
    <div class="details-grid">
      ${getInvoiceClientDetailRows(p)
        .map(
          (row) => `
      <div class="details-row">
        ${row
          .map(
            (cell) => `
        <div class="detail-item"><label>${escapeHtml(cell.label)}</label><span>${escapeHtml(cell.value)}</span></div>`,
          )
          .join('')}
        ${Array.from({ length: Math.max(0, 3 - row.length) })
          .map(() => '<div class="detail-item"></div>')
          .join('')}
      </div>`,
        )
        .join('')}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${data.lineItems
        .map(
          (item) => `
      <tr>
        <td>${escapeHtml(item.description)}<br/><small>${escapeHtml(p.projectName)}</small></td>
        <td class="amount">${formatCurrencyHtml(item.amount)}</td>
      </tr>`,
        )
        .join('')}
      ${p.discount > 0 ? `<tr><td>Discount</td><td class="amount">${formatCurrencyHtml(p.discount, { leading: '− ' })}</td></tr>` : ''}
    </tbody>
  </table>

  <div class="totals">
    ${data.gstEnabled ? `<div class="row"><span>GST (5%)</span><span>${formatCurrencyHtml(data.gst)}</span></div>` : ''}
    <div class="row total"><span>${data.gstEnabled ? 'Total (incl. GST)' : 'Total'}</span><span>${formatCurrencyHtml(data.total)}</span></div>
    <div class="row"><span>Advance Paid</span><span>${formatCurrencyHtml(p.advancePayment)}</span></div>
    ${
      !data.showBalancePaymentHistory && data.paidBalanceValue != null
        ? `<div class="row paid-balance"><span>Paid Balance Amount of${data.paidBalanceDate ? `<small>on ${escapeHtml(data.paidBalanceDate)}</small>` : ''}</span><span>${formatCurrencyHtml(data.paidBalanceValue)}</span></div>`
        : ''
    }
  </div>

  ${
    data.showBalancePaymentHistory
      ? `<div class="payment-history">
    <h4>Payment history</h4>
    <table>
      <thead>
        <tr>
          <th>Amount</th>
          <th>Date</th>
          <th>Method</th>
        </tr>
      </thead>
      <tbody>
        ${data.balancePaymentHistory
          .map(
            (transaction) => `
        <tr>
          <td class="amount amount-paid">${formatCurrencyHtml(transaction.amount)}</td>
          <td>${escapeHtml(transaction.formattedDate)}</td>
          <td>${escapeHtml(transaction.formattedMethod)}</td>
        </tr>`,
          )
          .join('')}
        <tr class="total-row">
          <td class="amount amount-paid">${formatCurrencyHtml(data.totalBalancePaid)}</td>
          <td colspan="2">Total balance paid</td>
        </tr>
      </tbody>
    </table>
  </div>`
      : ''
  }

  <div class="totals">
    <div class="row balance ${data.balance <= 0 ? 'clear' : 'outstanding'}"><span>Balance Due</span><span>${formatCurrencyHtml(data.balance)}</span></div>
  </div>

  <div class="footer">
    ${escapeHtml(INVOICE_THANK_YOU)}
  </div>
  <div class="terms">
    <h4>${escapeHtml(INVOICE_TERMS_TITLE)}</h4>
    ${INVOICE_TERMS_PARAGRAPHS.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 500);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
