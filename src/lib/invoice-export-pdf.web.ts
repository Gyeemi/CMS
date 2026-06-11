import type { Project } from '@/types/project';

export async function createInvoicePdfBlobUrl(project: Project) {
  const { createInvoicePdfBlobUrl: createUrl } = await import('./invoice-pdf-generator');
  return createUrl(project);
}

export async function downloadInvoicePdf(project: Project) {
  if (typeof document === 'undefined') {
    throw new Error('PDF download is only available in the browser.');
  }

  const { downloadInvoicePdf: download } = await import('./invoice-pdf-generator');
  await download(project);
}
