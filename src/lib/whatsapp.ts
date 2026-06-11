import { Alert, Linking } from 'react-native';

export function formatPhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export function getWhatsAppUrl(phone: string, message?: string): string | null {
  const digits = formatPhoneForWhatsApp(phone);
  if (!digits) return null;

  const base = `https://wa.me/${digits}`;
  if (!message?.trim()) return base;

  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export async function openWhatsAppChat(phone: string, message?: string): Promise<boolean> {
  const url = getWhatsAppUrl(phone, message);
  if (!url) {
    Alert.alert('Invalid number', 'This phone number cannot be opened in WhatsApp.');
    return false;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Unable to open WhatsApp', 'Could not launch WhatsApp for this number.');
    return false;
  }
}
