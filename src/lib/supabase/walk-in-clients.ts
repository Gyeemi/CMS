import { supabase } from '@/lib/supabase';

/** Links walk-in studio projects (matching name + phone) to the signed-up client account. */
export async function linkWalkInProjectsToClient(clientId: string): Promise<number> {
  const { data, error } = await supabase.rpc('link_walk_in_projects_to_client', {
    p_client_id: clientId,
  });

  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
