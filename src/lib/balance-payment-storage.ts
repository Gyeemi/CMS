import type {
  BalancePaymentMethod,
  BalancePaymentTransaction,
  EPaymentPlatform,
  Project,
} from '@/types/project';

const BALANCE_PAYMENT_MARKER = '[BALANCE_PAYMENT]';
const BALANCE_PAYMENT_HISTORY_MARKER = '[BALANCE_PAYMENT_HISTORY]';

export type StoredBalancePayment = {
  amount: number;
  method: BalancePaymentMethod;
  platform?: EPaymentPlatform;
  ref?: string;
  paidAt: string;
};

function stripMarkerBlock(notes: string, marker: string) {
  const index = notes.indexOf(marker);
  if (index < 0) return notes;
  return notes.slice(0, index).trim();
}

export function stripBalancePaymentFromNotes(notes: string) {
  return stripMarkerBlock(stripMarkerBlock(notes, BALANCE_PAYMENT_HISTORY_MARKER), BALANCE_PAYMENT_MARKER);
}

function parseJsonAfterMarker(notes: string, marker: string): unknown | null {
  const index = notes.indexOf(marker);
  if (index < 0) return null;

  const raw = notes.slice(index + marker.length).trim();
  const firstLine = raw.split('\n').find((line) => line.trim().length > 0)?.trim() ?? '';
  if (!firstLine) return null;

  try {
    return JSON.parse(firstLine);
  } catch {
    return null;
  }
}

function isValidTransaction(value: unknown): value is BalancePaymentTransaction {
  if (!value || typeof value !== 'object') return false;
  const tx = value as BalancePaymentTransaction;
  return tx.amount > 0 && Boolean(tx.method) && Boolean(tx.paidAt);
}

export function parseBalancePaymentFromNotes(notes: string): StoredBalancePayment | null {
  const parsed = parseJsonAfterMarker(notes, BALANCE_PAYMENT_MARKER);
  if (!parsed || typeof parsed !== 'object') return null;

  const legacy = parsed as StoredBalancePayment;
  if (!legacy.amount || !legacy.method || !legacy.paidAt) return null;
  return legacy;
}

export function readBalancePaymentHistory(notes?: string | null): BalancePaymentTransaction[] {
  if (!notes?.trim()) return [];

  const parsed = parseJsonAfterMarker(notes, BALANCE_PAYMENT_HISTORY_MARKER);
  if (Array.isArray(parsed)) {
    return parsed.filter(isValidTransaction).sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  }

  const legacy = parseBalancePaymentFromNotes(notes);
  if (!legacy) return [];

  return [
    {
      amount: legacy.amount,
      method: legacy.method,
      platform: legacy.platform,
      ref: legacy.ref,
      paidAt: legacy.paidAt,
    },
  ];
}

function mergeBalancePaymentTransactions(
  ...transactionLists: BalancePaymentTransaction[][]
): BalancePaymentTransaction[] {
  const merged = new Map<string, BalancePaymentTransaction>();

  for (const list of transactionLists) {
    for (const tx of list) {
      merged.set(`${tx.paidAt}|${tx.amount}|${tx.method}|${tx.ref ?? ''}`, tx);
    }
  }

  return [...merged.values()].sort((a, b) => a.paidAt.localeCompare(b.paidAt));
}

export function mergeBalancePaymentHistories(
  ...noteSources: (string | null | undefined)[]
): BalancePaymentTransaction[] {
  return mergeBalancePaymentTransactions(
    ...noteSources.map((notes) => readBalancePaymentHistory(notes)),
  );
}

function sumHistoryAmount(history: BalancePaymentTransaction[]) {
  return history.reduce((sum, tx) => sum + tx.amount, 0);
}

export function appendBalancePaymentHistoryToNotes(
  notes: string,
  transaction: BalancePaymentTransaction,
  cumulativeAmount: number,
): string {
  const visible = stripBalancePaymentFromNotes(notes);
  const history = [...readBalancePaymentHistory(notes), transaction];
  const legacySummary: StoredBalancePayment = {
    amount: cumulativeAmount,
    method: transaction.method,
    platform: transaction.platform,
    ref: transaction.ref,
    paidAt: transaction.paidAt,
  };

  return [
    visible,
    `${BALANCE_PAYMENT_HISTORY_MARKER}${JSON.stringify(history)}`,
    `${BALANCE_PAYMENT_MARKER}${JSON.stringify(legacySummary)}`,
  ]
    .filter((block) => block.trim().length > 0)
    .join('\n');
}

/** @deprecated Use appendBalancePaymentHistoryToNotes for new payments. */
export function encodeBalancePaymentInNotes(
  notes: string,
  payment: Omit<StoredBalancePayment, 'paidAt'> & { paidAt?: string },
): string {
  const transaction: BalancePaymentTransaction = {
    amount: payment.amount,
    method: payment.method,
    platform: payment.platform,
    ref: payment.ref,
    paidAt: payment.paidAt ?? new Date().toISOString(),
  };
  return appendBalancePaymentHistoryToNotes(notes, transaction, payment.amount);
}

/** Highest cumulative balance paid across project columns, studio notes, and booking notes. */
export function readCumulativeBalancePaid(sources: {
  balancePaidAmount?: number | null;
  studioNotes?: string | null;
  bookingNotes?: string | null;
}): number {
  const amounts: number[] = [];

  if (sources.balancePaidAmount != null && sources.balancePaidAmount > 0) {
    amounts.push(sources.balancePaidAmount);
  }

  const historyTotal = sumHistoryAmount(
    mergeBalancePaymentHistories(sources.studioNotes, sources.bookingNotes),
  );
  if (historyTotal > 0) {
    amounts.push(historyTotal);
  }

  const studioLegacy = parseBalancePaymentFromNotes(sources.studioNotes ?? '')?.amount;
  if (studioLegacy != null && studioLegacy > 0) {
    amounts.push(studioLegacy);
  }

  const bookingLegacy = parseBalancePaymentFromNotes(sources.bookingNotes ?? '')?.amount;
  if (bookingLegacy != null && bookingLegacy > 0) {
    amounts.push(bookingLegacy);
  }

  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

export function resolveProjectBalancePayments(
  project: Project,
  options?: { studioNotes?: string | null; bookingNotes?: string | null },
): Project {
  const history = mergeBalancePaymentTransactions(
    project.balancePaymentHistory ?? [],
    mergeBalancePaymentHistories(options?.studioNotes, options?.bookingNotes),
  );
  const paid = readCumulativeBalancePaid({
    balancePaidAmount: project.balancePaidAmount,
    studioNotes: options?.studioNotes,
    bookingNotes: options?.bookingNotes,
  });
  const historyTotal = sumHistoryAmount(history);
  const resolvedPaid = Math.max(paid, historyTotal);

  if (resolvedPaid <= 0 && history.length === 0) return project;

  const latest = history[history.length - 1];

  if (!latest) {
    return { ...project, balancePaidAmount: resolvedPaid };
  }

  return {
    ...project,
    balancePaidAmount: resolvedPaid,
    balancePaymentHistory: history,
    balancePaymentMethod: latest.method,
    balancePaymentPlatform: latest.platform,
    balancePaymentRef: latest.ref,
    balancePaidAt: latest.paidAt,
  };
}

export function clientVisibleNotes(notes?: string | null) {
  if (!notes) return '';
  return stripBalancePaymentFromNotes(notes).trim();
}

/** Apply a stored balance payment block from project studio notes or booking notes. */
export function enrichProjectFromBalanceNotes(
  project: Project,
  notes?: string | null,
): Project {
  return resolveProjectBalancePayments(project, { studioNotes: notes });
}
