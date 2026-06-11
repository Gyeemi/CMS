import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildInvoiceData } from '@/types/invoice';
import type { Project } from '@/types/project';

import { buildInvoiceHtml } from './invoice-export-html';
import { downloadInvoicePdf } from './invoice-export-pdf';
import { fetchInvoiceClientContact } from './supabase/invoice-client';
import { openWhatsAppChat } from './whatsapp';

export function buildInvoiceWhatsAppMessage(project: Project, clientName: string) {
  const data = buildInvoiceData(project);
  const { project: invoiceProject, formatted } = data;

  const lines = [
    `Hi ${clientName},`,
    '',
    'Your GroovX Studio invoice is ready.',
    '',
    `Invoice: ${data.invoiceNumber}`,
    `Project: ${invoiceProject.projectName}`,
    `Artist: ${invoiceProject.artistName}`,
    `Total: ${formatted.total}`,
    ...(data.showBalancePaymentHistory
      ? [
          'Balance payments:',
          ...data.balancePaymentHistory.map(
            (transaction) =>
              `• ${transaction.formattedAmount} on ${transaction.formattedDate} (${transaction.formattedMethod})`,
          ),
          `Total balance paid: ${data.formatted.totalBalancePaid}`,
        ]
      : data.paidBalanceLine
        ? [data.paidBalanceLine]
        : []),
    `Balance Due: ${formatted.balance}`,
  ];

  if (Platform.OS === 'web') {
    lines.push('', 'The invoice PDF has been downloaded — attach it here in WhatsApp.');
  } else {
    lines.push('', 'Please review the attached invoice PDF. Thank you!');
  }

  return lines.join('\n');
}

export async function shareInvoiceViaWhatsApp(project: Project): Promise<boolean> {
  const contact = await fetchInvoiceClientContact(project.id);

  if (!contact) {
    Alert.alert(
      'Client not found',
      'No client is linked to this project. Confirm the booking first or add the project from a client booking.',
    );
    return false;
  }

  if (!contact.phone.trim()) {
    Alert.alert(
      'No WhatsApp number',
      `${contact.name} has no phone number on file. Add one from Client Booking → client profile.`,
    );
    return false;
  }

  const message = buildInvoiceWhatsAppMessage(project, contact.name);

  if (Platform.OS === 'web') {
    await downloadInvoicePdf(project);
    return openWhatsAppChat(contact.phone, message);
  }

  const html = buildInvoiceHtml(project);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Send invoice via WhatsApp',
      UTI: 'com.adobe.pdf',
    });
    return true;
  }

  return openWhatsAppChat(contact.phone, message);
}
