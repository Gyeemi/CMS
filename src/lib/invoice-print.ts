import { useEffect } from 'react';
import { Platform } from 'react-native';

const PRINT_DRAFT_KEY = 'groovx-print-draft';

export function stageInvoicePrintDraft(project: unknown) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PRINT_DRAFT_KEY, JSON.stringify(project));
}

export function consumeInvoicePrintDraft<T>(projectId: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(PRINT_DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as T & { id?: string };
    sessionStorage.removeItem(PRINT_DRAFT_KEY);

    if (draft.id !== projectId) return null;
    return draft;
  } catch {
    sessionStorage.removeItem(PRINT_DRAFT_KEY);
    return null;
  }
}

export function openInvoicePrintPage(projectId: string) {
  if (typeof window === 'undefined') {
    throw new Error('Print is only available in the browser.');
  }

  const url = `${window.location.origin}/invoice/print/${encodeURIComponent(projectId)}`;
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer,width=960,height=720');

  if (!printWindow) {
    throw new Error('Unable to open print window. Allow pop-ups and try again.');
  }
}

export function closeInvoicePrintPage(onFallback: () => void) {
  if (typeof window === 'undefined') {
    onFallback();
    return;
  }

  window.close();

  // Browsers often block window.close() on tabs opened via window.open().
  window.setTimeout(() => {
    if (!window.closed) onFallback();
  }, 150);
}

export function useAutoPrintOnWeb(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [enabled]);
}
