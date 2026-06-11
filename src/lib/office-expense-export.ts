import { Platform } from 'react-native';
import * as Print from 'expo-print';

import { buildOfficeExpenseReportHtml } from '@/lib/office-expense-export-html';
import {
  navigateToOfficeExpensePrintPage,
  stageOfficeExpensePrintDraft,
} from '@/lib/office-expense-print';
import type { OfficeExpensePrintReport } from '@/types/office-expense-report';

export async function printOfficeExpenseReport(report: OfficeExpensePrintReport) {
  if (Platform.OS === 'web') {
    stageOfficeExpensePrintDraft(report);
    navigateToOfficeExpensePrintPage(report.id);
    return;
  }

  const html = buildOfficeExpenseReportHtml(report);
  await Print.printAsync({ html });
}
