/** Bhutanese Ngultrum display: Nu. 12,345.67 */

export const CURRENCY_PREFIX = 'Nu. ';
export const CURRENCY_SYMBOL = 'Nu.';
export const CURRENCY_INPUT_PLACEHOLDER = 'Nu. 0.00';
export const AMOUNT_INPUT_PLACEHOLDER = '0.00';

export function splitCurrencyAmount(amount: number) {
  const normalized = Number.isFinite(amount) ? amount : 0;
  const [whole, fraction = '00'] = normalized.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).split('.');

  return { prefix: CURRENCY_PREFIX, whole, fraction };
}

export function formatCurrency(amount: number) {
  const { prefix, whole, fraction } = splitCurrencyAmount(amount);
  return `${prefix}${whole}.${fraction}`;
}

export function formatCurrencyHtml(amount: number, options?: { leading?: string }) {
  const { prefix, whole, fraction } = splitCurrencyAmount(amount);
  const leading = options?.leading ?? '';
  return `${leading}${prefix}${whole}<span class="currency-fraction">.${fraction}</span>`;
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Format for currency input fields (Nu. XX,XXX.xx). Empty when zero unless includeZero. */
export function formatCurrencyInput(amount: number, options?: { includeZero?: boolean }) {
  if (!Number.isFinite(amount) || (amount === 0 && !options?.includeZero)) {
    return '';
  }
  return formatCurrency(amount);
}

/** Amount portion only for split currency inputs (XX,XXX.xx). */
export function formatCurrencyAmountOnly(amount: number, options?: { includeZero?: boolean }) {
  if (!Number.isFinite(amount) || (amount === 0 && !options?.includeZero)) {
    return '';
  }
  const { whole, fraction } = splitCurrencyAmount(amount);
  return `${whole}.${fraction}`;
}

export function amountPlaceholderFromFull(placeholder: string) {
  const stripped = placeholder.replace(/^Nu\.\s*/i, '').trim();
  return stripped || AMOUNT_INPUT_PLACEHOLDER;
}
