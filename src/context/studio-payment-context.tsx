import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  createEmptyStudioPaymentForm,
  type StudioPaymentAccount,
  type StudioPaymentAccountInput,
} from '@/constants/studio-payment';
import {
  addStudioPaymentAccountSupabase,
  loadStudioPaymentAccountsFromSupabase,
  removeStudioPaymentAccountSupabase,
} from '@/lib/supabase/studio-payment';

type StudioPaymentContextValue = {
  accounts: StudioPaymentAccount[];
  isLoading: boolean;
  refreshAccounts: () => Promise<void>;
  addAccount: (account: StudioPaymentAccountInput) => Promise<{ ok: boolean; error?: string }>;
  removeAccount: (id: string) => Promise<void>;
};

const StudioPaymentContext = createContext<StudioPaymentContextValue | null>(null);

function validateAccount(account: StudioPaymentAccountInput): string | null {
  if (!account.accountHolder.trim()) return 'Enter the payee name shown to clients.';
  if (!account.accountName.trim()) return 'Enter the account name.';
  if (!account.bankName.trim()) return 'Enter the bank name.';
  if (!account.branch.trim()) return 'Enter the branch name.';
  if (!account.accountNumber.trim()) return 'Enter the account number.';
  return null;
}

export function StudioPaymentProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<StudioPaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    const data = await loadStudioPaymentAccountsFromSupabase();
    setAccounts(data);
  }, []);

  useEffect(() => {
    void refreshAccounts().finally(() => setIsLoading(false));
  }, [refreshAccounts]);

  const addAccount = useCallback(
    async (next: StudioPaymentAccountInput) => {
      const error = validateAccount(next);
      if (error) return { ok: false, error };

      await addStudioPaymentAccountSupabase({
        accountHolder: next.accountHolder.trim(),
        accountName: next.accountName.trim(),
        bankName: next.bankName.trim(),
        branch: next.branch.trim(),
        accountNumber: next.accountNumber.trim(),
      });
      await refreshAccounts();
      return { ok: true };
    },
    [refreshAccounts],
  );

  const removeAccount = useCallback(
    async (id: string) => {
      await removeStudioPaymentAccountSupabase(id);
      await refreshAccounts();
    },
    [refreshAccounts],
  );

  const value = useMemo(
    () => ({
      accounts,
      isLoading,
      refreshAccounts,
      addAccount,
      removeAccount,
    }),
    [accounts, isLoading, refreshAccounts, addAccount, removeAccount],
  );

  return (
    <StudioPaymentContext.Provider value={value}>{children}</StudioPaymentContext.Provider>
  );
}

export function useStudioPayment() {
  const ctx = useContext(StudioPaymentContext);
  if (!ctx) throw new Error('useStudioPayment must be used within StudioPaymentProvider');
  return ctx;
}

export { createEmptyStudioPaymentForm };
