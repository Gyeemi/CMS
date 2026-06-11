const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function monthIndexFromName(name: string) {
  const lower = name.trim().toLowerCase();
  const full = MONTH_NAMES.findIndex((month) => month.toLowerCase() === lower);
  if (full >= 0) return full;
  return MONTH_NAMES.findIndex((month) => month.toLowerCase().startsWith(lower.slice(0, 3)));
}

function localDateFromParts(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function formatDisplayDate(date: Date) {
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatBalancePaidDate(iso: string) {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  return `${day} | ${month} | '${year}`;
}

function parseDisplayDateParts(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'Invalid Date') return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    return localDateFromParts(year, month, day);
  }

  const displayMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const monthIndex = monthIndexFromName(displayMatch[2]);
    const year = Number(displayMatch[3]);
    if (monthIndex >= 0) {
      return localDateFromParts(year, monthIndex, day);
    }
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    return localDateFromParts(year, month, day);
  }

  return null;
}

export function parseDisplayDate(value: string) {
  return parseDisplayDateParts(value);
}

export function isDateOnOrAfterToday(display: string) {
  const iso = displayToIsoDate(display);
  if (!iso) return false;
  return iso >= toIsoDate(startOfToday());
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isoToDisplayDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '';
  return formatDisplayDate(new Date(year, month - 1, day));
}

export function displayToIsoDate(display: string) {
  const parsed = parseDisplayDate(display);
  return parsed ? toIsoDate(parsed) : '';
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthRangeDisplay(date = new Date()) {
  return {
    from: formatDisplayDate(startOfMonth(date)),
    to: formatDisplayDate(endOfMonth(date)),
  };
}

export function getLastMonthRangeDisplay() {
  const now = new Date();
  return getMonthRangeDisplay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

export function isIsoDateInRange(iso: string, fromIso: string, toIso: string) {
  if (!iso || !fromIso || !toIso) return false;
  return iso >= fromIso && iso <= toIso;
}
