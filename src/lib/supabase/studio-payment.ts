import { studioPaymentFromRow } from '@/lib/supabase/mappers';
import { supabase } from '@/lib/supabase';
import type { StudioPaymentAccountInput } from '@/constants/studio-payment';
import type { StudioPaymentAccount } from '@/constants/studio-payment';

export async function loadStudioPaymentAccountsFromSupabase(): Promise<StudioPaymentAccount[]> {
  const { data, error } = await supabase
    .from('studio_payment_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(studioPaymentFromRow);
}

export async function addStudioPaymentAccountSupabase(
  input: StudioPaymentAccountInput,
): Promise<StudioPaymentAccount> {
  const row = {
    account_holder: input.accountHolder.trim(),
    account_name: input.accountName.trim(),
    bank_name: input.bankName.trim(),
    branch: input.branch.trim(),
    account_number: input.accountNumber.trim(),
  };

  const { data, error } = await supabase
    .from('studio_payment_accounts')
    .insert(row)
    .select('*')
    .single();

  if (error) throw error;
  return studioPaymentFromRow(data);
}

export async function removeStudioPaymentAccountSupabase(id: string) {
  const { error } = await supabase.from('studio_payment_accounts').delete().eq('id', id);
  if (error) throw error;
}
