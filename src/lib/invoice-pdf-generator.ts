import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import {
  INVOICE_TERMS_PARAGRAPHS,
  INVOICE_TERMS_TITLE,
  INVOICE_THANK_YOU,
} from '@/constants/invoice-terms';
import { getStudioCompanyDetailLines } from '@/constants/studio-company';
import { buildInvoiceData, getInvoiceClientDetailRows } from '@/types/invoice';
import type { Project } from '@/types/project';
import { splitCurrencyAmount } from '@/types/project';
import type { PDFFont, PDFPage, RGB } from 'pdf-lib';

const BRAND = rgb(37 / 255, 99 / 255, 235 / 255);
const MUTED = rgb(0.42, 0.4, 0.47);
const TEXT = rgb(0.1, 0.06, 0.15);
const WARNING = rgb(0.96, 0.62, 0.04);
const DANGER = rgb(0.94, 0.27, 0.27);
const SUCCESS = rgb(0.06, 0.73, 0.51);
const BORDER = rgb(0.89, 0.87, 0.94);

function drawPdfCurrency(
  page: PDFPage,
  amount: number,
  right: number,
  y: number,
  mainSize: number,
  font: PDFFont,
  color: RGB,
  options?: { bold?: boolean; leading?: string; fontBold?: PDFFont },
) {
  const rowFont = options?.bold && options.fontBold ? options.fontBold : font;
  const decSize = Math.max(7, Math.round(mainSize * 0.68));
  const { prefix, whole, fraction } = splitCurrencyAmount(amount);
  const mainPart = `${options?.leading ?? ''}${prefix}${whole}`;
  const decPart = `.${fraction}`;
  const mainWidth = rowFont.widthOfTextAtSize(mainPart, mainSize);
  const decWidth = rowFont.widthOfTextAtSize(decPart, decSize);
  const startX = right - mainWidth - decWidth;

  page.drawText(mainPart, { x: startX, y, size: mainSize, font: rowFont, color });
  page.drawText(decPart, {
    x: startX + mainWidth,
    y: y - (mainSize - decSize) * 0.35,
    size: decSize,
    font: rowFont,
    color,
  });
}

function wrapPdfText(text: string, maxWidth: number, measure: (line: string) => number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

function drawPdfParagraph({
  page,
  text,
  x,
  y,
  maxWidth,
  size,
  font,
  color,
  lineHeight,
}: {
  page: ReturnType<Awaited<ReturnType<typeof PDFDocument.create>>['addPage']>;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  size: number;
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>;
  color: ReturnType<typeof rgb>;
  lineHeight: number;
}) {
  const lines = wrapPdfText(text, maxWidth, (line) => font.widthOfTextAtSize(line, size));
  let cursorY = y;

  for (const line of lines) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }

  return cursorY;
}

async function buildPdfBytes(project: Project) {
  const data = buildInvoiceData(project);
  const p = project;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const right = width - 50;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  const brandSize = 26;
  page.drawText('Groov', { x: 50, y, size: brandSize, font: fontBold, color: rgb(0, 0, 0) });
  const groovWidth = fontBold.widthOfTextAtSize('Groov', brandSize);
  page.drawText('X', { x: 50 + groovWidth, y, size: brandSize, font: fontBold, color: BRAND });
  page.drawText('Turning Vibes into Hits', { x: 50, y: y - 18, size: 10, font, color: MUTED });

  let companyY = y - 32;
  for (const line of getStudioCompanyDetailLines()) {
    page.drawText(line, { x: 50, y: companyY, size: 9, font, color: MUTED });
    companyY -= 12;
  }

  const invoiceTitle = 'INVOICE';
  page.drawText(invoiceTitle, {
    x: right - fontBold.widthOfTextAtSize(invoiceTitle, 20),
    y,
    size: 20,
    font: fontBold,
    color: TEXT,
  });
  page.drawText(data.invoiceNumber, {
    x: right - font.widthOfTextAtSize(data.invoiceNumber, 10),
    y: y - 16,
    size: 10,
    font,
    color: TEXT,
  });
  const dateLine = `Date: ${data.invoiceDate}`;
  page.drawText(dateLine, {
    x: right - font.widthOfTextAtSize(dateLine, 10),
    y: y - 30,
    size: 10,
    font,
    color: MUTED,
  });

  y = companyY - 12;
  page.drawLine({ start: { x: 50, y }, end: { x: right, y }, thickness: 1.5, color: BRAND });
  y -= 25;

  page.drawText('CLIENT & PROJECT', { x: 50, y, size: 8, font: fontBold, color: MUTED });
  y -= 14;

  const detailColumns = [50, 205, 360];
  for (const row of getInvoiceClientDetailRows(p)) {
    row.forEach((cell, columnIndex) => {
      const x = detailColumns[columnIndex];
      page.drawText(cell.label, { x, y, size: 7, font, color: MUTED });
      page.drawText(cell.value, { x, y: y - 10, size: 9, font: fontBold, color: TEXT });
    });
    y -= 22;
  }

  y -= 6;
  page.drawRectangle({ x: 50, y: y - 4, width: right - 50, height: 22, color: rgb(0.94, 0.93, 0.96) });
  page.drawText('DESCRIPTION', { x: 55, y: y + 3, size: 8, font: fontBold, color: MUTED });
  const amountHeader = 'AMOUNT';
  page.drawText(amountHeader, {
    x: right - fontBold.widthOfTextAtSize(amountHeader, 8),
    y: y + 3,
    size: 8,
    font: fontBold,
    color: MUTED,
  });
  y -= 22;

  for (const item of data.lineItems) {
    page.drawText(item.description, { x: 55, y, size: 10, font: fontBold, color: TEXT });
    drawPdfCurrency(page, item.amount, right, y, 10, font, TEXT, { bold: true, fontBold });
    y -= 14;
    page.drawText(p.projectName || '—', { x: 55, y, size: 9, font, color: MUTED });
    y -= 20;
  }

  if (p.discount > 0) {
    page.drawText('Discount', { x: 55, y, size: 10, font, color: TEXT });
    drawPdfCurrency(page, p.discount, right, y, 10, font, TEXT, { leading: '- ' });
    y -= 20;
  }

  page.drawLine({ start: { x: 50, y }, end: { x: right, y }, thickness: 0.5, color: BORDER });
  y -= 25;

  const totals: { label: string; amount: number; style?: 'total' | 'balance' }[] = [
    ...(data.gstEnabled ? [{ label: 'GST (5%)', amount: data.gst }] : []),
    {
      label: data.gstEnabled ? 'Total (incl. GST)' : 'Total',
      amount: data.total,
      style: 'total',
    },
    { label: 'Advance Paid', amount: p.advancePayment },
    { label: 'Balance Due', amount: data.balance, style: 'balance' },
  ];

  const labelX = 320;
  for (const row of totals.slice(0, -1)) {
    const size = row.style === 'total' ? 12 : 10;
    const rowFont = row.style ? fontBold : font;
    const color = row.style === 'total' ? BRAND : TEXT;

    page.drawText(row.label, { x: labelX, y, size, font: rowFont, color });
    drawPdfCurrency(page, row.amount, right, y, size, font, color, {
      bold: Boolean(row.style),
      fontBold,
    });
    y -= row.style === 'total' ? 22 : 18;
  }

  if (data.showBalancePaymentHistory) {
    y -= 8;
    page.drawText('Payment history', { x: 50, y, size: 11, font: fontBold, color: TEXT });
    y -= 18;
    page.drawText('Amount', { x: 50, y, size: 9, font: fontBold, color: MUTED });
    page.drawText('Date', { x: 170, y, size: 9, font: fontBold, color: MUTED });
    page.drawText('Method', { x: 300, y, size: 9, font: fontBold, color: MUTED });
    y -= 14;

    for (const transaction of data.balancePaymentHistory) {
      drawPdfCurrency(page, transaction.amount, 145, y, 10, font, SUCCESS, { fontBold });
      page.drawText(transaction.formattedDate, { x: 170, y, size: 9, font, color: MUTED });
      page.drawText(transaction.formattedMethod, { x: 300, y, size: 9, font, color: TEXT });
      y -= 16;
    }

    page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: right, y: y + 6 }, thickness: 0.5, color: BORDER });
    y -= 10;
    page.drawText('Total balance paid', { x: 170, y, size: 10, font: fontBold, color: TEXT });
    drawPdfCurrency(page, data.totalBalancePaid, 145, y, 10, font, SUCCESS, {
      bold: true,
      fontBold,
    });
    y -= 18;
  } else if (data.paidBalanceValue != null) {
    page.drawText('Paid Balance Amount of', { x: labelX, y, size: 11, font: fontBold, color: SUCCESS });
    drawPdfCurrency(page, data.paidBalanceValue, right, y, 11, font, SUCCESS, {
      bold: true,
      fontBold,
    });
    y -= 14;
    if (data.paidBalanceDate) {
      page.drawText(`on ${data.paidBalanceDate}`, { x: labelX, y, size: 9, font, color: MUTED });
      y -= 12;
    }
    y -= 4;
  }

  const balanceRow = totals[totals.length - 1];
  const balanceColor = data.balance <= 0 ? WARNING : DANGER;
  page.drawText(balanceRow.label, { x: labelX, y, size: 11, font: fontBold, color: balanceColor });
  drawPdfCurrency(page, balanceRow.amount, right, y, 11, font, balanceColor, {
    bold: true,
    fontBold,
  });
  y -= 18;

  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: right, y }, thickness: 0.5, color: BORDER });
  y -= 25;

  page.drawText(INVOICE_THANK_YOU, {
    x: (width - font.widthOfTextAtSize(INVOICE_THANK_YOU, 9)) / 2,
    y,
    size: 9,
    font,
    color: MUTED,
  });

  y -= 28;
  page.drawLine({ start: { x: 50, y }, end: { x: right, y }, thickness: 0.5, color: BORDER });
  y -= 18;

  page.drawText(INVOICE_TERMS_TITLE, { x: 50, y, size: 10, font: fontBold, color: TEXT });
  y -= 16;

  const termsWidth = right - 50;
  for (const paragraph of INVOICE_TERMS_PARAGRAPHS) {
    y = drawPdfParagraph({
      page,
      text: paragraph,
      x: 50,
      y,
      maxWidth: termsWidth,
      size: 8,
      font,
      color: MUTED,
      lineHeight: 11,
    });
    y -= 8;
  }

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, invoiceNumber: data.invoiceNumber };
}

export async function createInvoicePdfBlobUrl(project: Project) {
  const { pdfBytes, invoiceNumber } = await buildPdfBytes(project);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return { url, invoiceNumber };
}

export async function downloadInvoicePdf(project: Project) {
  const { pdfBytes, invoiceNumber } = await buildPdfBytes(project);
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const filename = `${invoiceNumber}-GroovX-Invoice.pdf`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}
