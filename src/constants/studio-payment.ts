export type StudioPaymentAccountInput = {
  /** Shown on client "Pay to …" buttons (e.g. Nehal Raj Baraily). */
  accountHolder: string;
  accountName: string;
  bankName: string;
  branch: string;
  accountNumber: string;
};

export type StudioPaymentAccount = StudioPaymentAccountInput & {
  id: string;
  createdAt: string;
};

export function createEmptyStudioPaymentForm(): StudioPaymentAccountInput {
  return {
    accountHolder: '',
    accountName: '',
    bankName: '',
    branch: '',
    accountNumber: '',
  };
}

function normalizePayeeName(name: string): string {
  if (/^gyen\s+bdr\.?\s+baraily$/i.test(name.trim())) return 'Gyen B. Baraily';
  return name.trim();
}

export function getPayeeDisplayName(account: StudioPaymentAccountInput): string {
  const holder = account.accountHolder?.trim();
  if (holder) return normalizePayeeName(holder);
  return normalizePayeeName(account.accountName);
}

const PAYEE_DISPLAY_ORDER = ['Gyen B. Baraily', 'Nehal Raj Baraily'];

export function sortPayeeAccountsForDisplay(accounts: StudioPaymentAccount[]): StudioPaymentAccount[] {
  return [...accounts].sort((a, b) => {
    const aIndex = PAYEE_DISPLAY_ORDER.indexOf(getPayeeDisplayName(a));
    const bIndex = PAYEE_DISPLAY_ORDER.indexOf(getPayeeDisplayName(b));
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}
