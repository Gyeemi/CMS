import { supabase } from '@/lib/supabase';

type PreserveWalkInClientInput = {
  artistName: string;
  artistPhone?: string | null;
  bookingId?: string | null;
  clientEmail?: string | null;
};

async function isLinkedToRegisteredClient(bookingId?: string | null): Promise<boolean> {
  if (!bookingId) return false;

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError) throw bookingError;
  if (!booking?.client_id) return false;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', booking.client_id)
    .maybeSingle();

  if (profileError) throw profileError;
  return profile?.role === 'client';
}

/** Keeps walk-in customers in Manage → Clients after their project is deleted. */
export async function preserveWalkInClientIfNeeded({
  artistName,
  artistPhone,
  bookingId,
  clientEmail,
}: PreserveWalkInClientInput): Promise<void> {
  const fullName = artistName.trim();
  if (!fullName) return;

  if (await isLinkedToRegisteredClient(bookingId)) return;

  const { error } = await supabase.rpc('upsert_walk_in_client', {
    p_full_name: fullName,
    p_phone: artistPhone?.trim() ?? '',
    p_email: clientEmail?.trim() ?? '',
  });

  if (error) {
    throw error;
  }
}

export async function tryPreserveWalkInClientIfNeeded(input: PreserveWalkInClientInput): Promise<void> {
  try {
    await preserveWalkInClientIfNeeded(input);
  } catch {
    // Directory table/RPC not applied yet.
  }
}

export type WalkInClientRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at: string;
};

export async function fetchWalkInClientsDirectory(): Promise<WalkInClientRow[]> {
  const { data, error } = await supabase
    .from('walk_in_clients')
    .select('id, full_name, phone, email, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WalkInClientRow[];
}

export async function fetchWalkInClientExclusions(): Promise<Set<string>> {
  const { data, error } = await supabase.from('walk_in_client_exclusions').select('match_key');

  if (error) throw error;
  return new Set((data ?? []).map((row) => String(row.match_key)));
}

export function parseWalkInDirectoryId(clientId: string): string | null {
  if (!clientId.startsWith('walkin:')) return null;
  return clientId.slice('walkin:'.length);
}

type DeleteWalkInManageClientInput = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
};

/** Removes a walk-in from Manage → Clients (directory row + exclusion for project fallback). */
export async function deleteWalkInManageClient(client: DeleteWalkInManageClientInput): Promise<void> {
  const directoryId = parseWalkInDirectoryId(client.id);

  const { error } = await supabase.rpc('delete_walk_in_manage_client', {
    p_directory_id: directoryId,
    p_full_name: client.fullName,
    p_phone: client.phone ?? '',
    p_email: client.email ?? '',
  });

  if (error) throw error;
}
