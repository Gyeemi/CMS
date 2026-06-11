import { supabase } from '@/lib/supabase';

export async function deleteClientAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_client_account');
  if (error) throw error;
}
