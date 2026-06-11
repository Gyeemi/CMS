import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { OfficeExpensePrintReport } from '@/types/office-expense-report';

const PRINT_DRAFT_KEY = 'groovx-office-expense-print-draft';

export function stageOfficeExpensePrintDraft(report: OfficeExpensePrintReport) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PRINT_DRAFT_KEY, JSON.stringify(report));
}

export function readOfficeExpensePrintDraft(reportId: string): OfficeExpensePrintReport | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(PRINT_DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as OfficeExpensePrintReport;
    if (draft.id !== reportId) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearOfficeExpensePrintDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PRINT_DRAFT_KEY);
}

export function navigateToOfficeExpensePrintPage(reportId: string) {
  if (Platform.OS !== 'web') {
    throw new Error('Print is only available in the browser.');
  }

  router.push(`/office/expenses/print/${reportId}`);
}

export function closeOfficeExpensePrintPage(onFallback: () => void) {
  clearOfficeExpensePrintDraft();
  onFallback();
}

export function useAutoPrintOfficeExpensesOnWeb(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [enabled]);
}
