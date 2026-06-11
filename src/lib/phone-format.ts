const BHUTAN_PREFIX = '+975 ';

export function formatBhutanPhone(value: string | null | undefined) {
  const input = value ?? '';
  if (!input.trim()) return BHUTAN_PREFIX;

  const digits = input.replace(/\D/g, '');
  const local = digits.startsWith('975') ? digits.slice(3) : digits;
  const trimmed = local.slice(0, 8);

  let formatted = '+975';
  if (trimmed.length > 0) formatted += ` ${trimmed.slice(0, 3)}`;
  if (trimmed.length > 3) formatted += ` ${trimmed.slice(3, 5)}`;
  if (trimmed.length > 5) formatted += ` ${trimmed.slice(5, 8)}`;

  return formatted;
}

export function resolveArtistPhone(artistPhone: string, clientPhone?: string | null) {
  if (artistPhone.trim()) return artistPhone;
  if (!clientPhone?.trim()) return '';
  return formatBhutanPhone(clientPhone);
}

export function normalizeBhutanPhoneDigits(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.startsWith('975') ? digits.slice(3) : digits;
}

export function isValidBhutanPhone(value: string) {
  return normalizeBhutanPhoneDigits(value).length === 8;
}
