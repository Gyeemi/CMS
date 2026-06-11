import { Platform } from 'react-native';
import * as Print from 'expo-print';

import type { Project } from '@/types/project';

import { buildInvoiceHtml } from './invoice-export-html';
import { openInvoicePrintPage, stageInvoicePrintDraft } from './invoice-print';

export { buildInvoiceHtml } from './invoice-export-html';
export { downloadInvoicePdf as saveInvoicePdf } from './invoice-export-pdf';

export async function printInvoice(project: Project) {
  if (Platform.OS === 'web') {
    stageInvoicePrintDraft(project);
    openInvoicePrintPage(project.id);
    return;
  }

  const html = buildInvoiceHtml(project);
  await Print.printAsync({ html });
}
