import { completeBookingWhenProjectRegistered } from '@/lib/supabase/bookings';
import { supabase } from '@/lib/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRegisteredManageClientId(clientId: string | null | undefined): clientId is string {
  if (!clientId) return false;
  return UUID_RE.test(clientId);
}

export async function linkProjectToRegisteredClient(
  projectId: string,
  clientProfileId: string,
): Promise<void> {
  const { error } = await supabase.rpc('link_project_to_registered_client', {
    p_project_id: projectId,
    p_client_id: clientProfileId,
  });
  if (error) throw error;
}

export async function tryLinkProjectToRegisteredClient(
  projectId: string,
  clientProfileId: string | null | undefined,
): Promise<void> {
  if (!isRegisteredManageClientId(clientProfileId)) return;
  try {
    await linkProjectToRegisteredClient(projectId, clientProfileId);
    await completeBookingWhenProjectRegistered(projectId);
  } catch {
    // RPC not applied yet.
  }
}
