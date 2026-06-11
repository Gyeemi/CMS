import { isoToDisplayDate } from '@/lib/date-format';
import type { OfficeExpensePrintReport } from '@/types/office-expense-report';
import { formatCurrencyHtml } from '@/types/project';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCategorySubtotals(report: OfficeExpensePrintReport) {
  const totals = new Map<string, number>();

  for (const expense of report.expenses) {
    totals.set(expense.categoryGroup, (totals.get(expense.categoryGroup) ?? 0) + expense.amount);
  }

  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const REPORT_STYLES = `
  * { box-sizing: border-box; }
  #office-expense-report-root {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    color: #0f172a;
    padding: 24px;
    background: #fff;
  }
  #office-expense-report-root h1 {
    margin: 0 0 4px;
    font-size: 24px;
  }
  #office-expense-report-root .meta {
    color: #475569;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 20px;
  }
  #office-expense-report-root table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  #office-expense-report-root th,
  #office-expense-report-root td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  #office-expense-report-root th {
    background: #f1f5f9;
    font-weight: 600;
  }
  #office-expense-report-root .amount {
    text-align: right;
    white-space: nowrap;
  }
  #office-expense-report-root .section-title {
    margin: 24px 0 8px;
    font-size: 16px;
    font-weight: 600;
  }
  #office-expense-report-root .grand-total {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    font-size: 18px;
    font-weight: 700;
    gap: 16px;
  }
  #office-expense-report-root .print-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  #office-expense-report-root .print-actions button {
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    cursor: pointer;
    background: #2563eb;
    color: #fff;
  }
  @media print {
    #office-expense-report-root .print-actions { display: none !important; }
    #office-expense-report-root { padding: 0; }
  }
`;

function buildOfficeExpenseReportContent(report: OfficeExpensePrintReport) {
  const categorySubtotals = buildCategorySubtotals(report);
  const printedAt = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rows = report.expenses
    .map(
      (expense) => `
      <tr>
        <td>${escapeHtml(isoToDisplayDate(expense.expenseDate))}</td>
        <td>${escapeHtml(expense.categoryGroup)}</td>
        <td>${escapeHtml(expense.categoryItem)}</td>
        <td>${escapeHtml(expense.description.trim() || '—')}</td>
        <td class="amount">${formatCurrencyHtml(expense.amount)}</td>
      </tr>`,
    )
    .join('');

  const subtotalRows = categorySubtotals
    .map(
      ([category, amount]) => `
      <tr>
        <td colspan="4">${escapeHtml(category)}</td>
        <td class="amount">${formatCurrencyHtml(amount)}</td>
      </tr>`,
    )
    .join('');

  return `
  <div class="print-actions">
    <button type="button" onclick="window.print()">Print Report</button>
  </div>

  <h1>GroovX Office Expense Report</h1>
  <div class="meta">
    <div><strong>Period:</strong> ${escapeHtml(report.fromDate)} — ${escapeHtml(report.toDate)}</div>
    <div><strong>Category:</strong> ${escapeHtml(report.categoryFilter)}</div>
    <div><strong>Records:</strong> ${report.expenses.length}</div>
    <div><strong>Printed:</strong> ${escapeHtml(printedAt)}</div>
  </div>

  <div class="section-title">Expense details</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Category</th>
        <th>Expense type</th>
        <th>Notes</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5">No expenses in this period.</td></tr>'}
    </tbody>
  </table>

  ${
    categorySubtotals.length > 1
      ? `<div class="section-title">Category subtotals</div>
  <table>
    <tbody>${subtotalRows}</tbody>
  </table>`
      : ''
  }

  <div class="grand-total">
    <span>Grand total</span>
    <span>${formatCurrencyHtml(report.total)}</span>
  </div>`;
}

export function buildOfficeExpenseReportHtml(report: OfficeExpensePrintReport) {
  const content = buildOfficeExpenseReportContent(report);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GroovX Office Expense Report</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
  <div id="office-expense-report-root">${content}</div>
</body>
</html>`;
}

export function buildOfficeExpenseReportWebContent(report: OfficeExpensePrintReport) {
  const content = buildOfficeExpenseReportContent(report);
  return `<style>${REPORT_STYLES}</style><div id="office-expense-report-root">${content}</div>`;
}
