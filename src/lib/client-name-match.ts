/** Collapse whitespace and lowercase for name comparison. */
export function normalizeNameForMatch(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function nameFirstToken(value: string): string {
  const normalized = normalizeNameForMatch(value);
  if (!normalized) return '';
  return normalized.split(' ')[0] ?? '';
}

function nameLastToken(value: string): string {
  const normalized = normalizeNameForMatch(value);
  if (!normalized) return '';
  const parts = normalized.split(' ');
  return parts.length === 1 ? parts[0] : (parts[parts.length - 1] ?? '');
}

/** Full name match, or same first + last name (middle/second name may differ). */
export function clientNamesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeNameForMatch(left);
  const b = normalizeNameForMatch(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return nameFirstToken(a) === nameFirstToken(b) && nameLastToken(a) === nameLastToken(b);
}
