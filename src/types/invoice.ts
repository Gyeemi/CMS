import { formatBalancePaidDate } from '@/lib/date-format';
import type { Project } from '@/types/project';
import {
  calculateGst,
  calculateTotal,
  formatBalancePaymentTransactionVia,
  formatCurrency,
  getDisplayAdvancePayment,
  getDisplayBalancePaidAmount,
  getOutstandingInvoiceBalance,
  getProjectBalancePaymentHistory,
  getProjectLineItems,
  getTotalBalancePaid,
  hasBalancePaymentHistory,
  isGstEnabled,
  isProjectBalancePaid,
} from '@/types/project';

export function formatPaidBalanceAmountLine(amount: string, paidAt?: string | null) {
  if (!paidAt) return `Paid Balance Amount of ${amount}`;
  return `Paid Balance Amount of ${amount} on ${formatBalancePaidDate(paidAt)}`;
}

export type Invoice = {
  id: string;
  projectId: string;
  invoiceNumber: string;
  createdAt: string;
};

export type InvoiceDetailCell = {
  label: string;
  value: string;
};

export function getInvoiceClientDetailRows(
  project: Pick<
    Project,
    | 'projectName'
    | 'artistName'
    | 'artistPhone'
    | 'producer'
    | 'projectType'
    | 'projectCategory'
    | 'audioCopyright'
  >,
): InvoiceDetailCell[][] {
  const value = (text?: string | null) => (text?.trim() ? text.trim() : '—');

  return [
    [
      { label: 'Project Name', value: value(project.projectName) },
      { label: 'Artist Name', value: value(project.artistName) },
      { label: 'Phone Number', value: value(project.artistPhone) },
    ],
    [
      { label: 'Producer', value: value(project.producer) },
      { label: 'Project Type', value: value(project.projectType) },
      { label: 'Category', value: value(project.projectCategory) },
    ],
    [{ label: 'Audio Copyright', value: value(project.audioCopyright) }],
  ];
}

export function generateInvoiceNumber(project: Project) {
  const date = new Date(project.createdAt);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const suffix = project.id.slice(-4).toUpperCase();
  return `GX-${y}${m}${d}-${suffix}`;
}

export function buildInvoiceData(project: Project) {
  const invoiceProject = {
    ...project,
    advancePayment: getDisplayAdvancePayment(project),
  };
  const subtotal = Math.max(0, invoiceProject.projectAmount - invoiceProject.discount);
  const gst = calculateGst(invoiceProject);
  const total = calculateTotal(invoiceProject);
  const balance = getOutstandingInvoiceBalance(invoiceProject);
  const balancePaid = isProjectBalancePaid(invoiceProject);
  const paidTowardBalance = getDisplayBalancePaidAmount(invoiceProject);
  const paidBalanceValue = paidTowardBalance > 0 ? paidTowardBalance : null;
  const paidBalanceAmount = paidBalanceValue != null ? formatCurrency(paidBalanceValue) : null;
  const paidBalanceDate =
    paidBalanceValue != null
      ? formatBalancePaidDate(invoiceProject.balancePaidAt ?? invoiceProject.updatedAt)
      : null;
  const paidBalanceLine =
    paidBalanceAmount != null
      ? balancePaid
        ? formatPaidBalanceAmountLine(
            paidBalanceAmount,
            invoiceProject.balancePaidAt ?? invoiceProject.updatedAt,
          )
        : `Partial balance received: ${paidBalanceAmount}`
      : null;

  const lineItems = getProjectLineItems(project).map((item) => ({
    ...item,
    formattedAmount: formatCurrency(item.amount),
  }));

  const gstEnabled = isGstEnabled(project);
  const balancePaymentHistory = getProjectBalancePaymentHistory(invoiceProject).map((transaction) => ({
    ...transaction,
    formattedAmount: formatCurrency(transaction.amount),
    formattedDate: formatBalancePaidDate(transaction.paidAt),
    formattedMethod: formatBalancePaymentTransactionVia(transaction),
  }));
  const totalBalancePaid = getTotalBalancePaid(invoiceProject);
  const showBalancePaymentHistory = hasBalancePaymentHistory(invoiceProject);

  return {
    invoiceNumber: generateInvoiceNumber(project),
    invoiceDate: new Date(project.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    project: invoiceProject,
    lineItems,
    gstEnabled,
    subtotal,
    gst,
    total,
    balance,
    balancePaid,
    paidBalanceAmount,
    paidBalanceValue,
    paidBalanceDate,
    paidBalanceLine,
    balancePaymentHistory,
    totalBalancePaid,
    showBalancePaymentHistory,
    formatted: {
      projectAmount: formatCurrency(invoiceProject.projectAmount),
      discount: formatCurrency(invoiceProject.discount),
      subtotal: formatCurrency(subtotal),
      advancePayment: formatCurrency(invoiceProject.advancePayment),
      gst: formatCurrency(gst),
      total: formatCurrency(total),
      balance: formatCurrency(balance),
      totalBalancePaid: formatCurrency(totalBalancePaid),
    },
  };
}
