import { resolveProjectBalancePayments } from '@/lib/balance-payment-storage';
import { clientNamesMatch } from '@/lib/client-name-match';
import { normalizeBhutanPhoneDigits } from '@/lib/phone-format';
import { bookingFromRow, projectFromRow } from '@/lib/supabase/mappers';
import { supabase } from '@/lib/supabase';
import type { ManageClientRow } from '@/lib/supabase/manage-clients';
import { isClientPipelineBooking } from '@/types/client';
import { getOutstandingBalance } from '@/types/project';

export const WALK_IN_DELETE_PAYMENT_BLOCKED_MESSAGE =
  "The payment hasn't gone through completely yet. The Account can not be deleted.";

export function walkInClientMatchesIdentity(
  clientName: string,
  clientPhone: string,
  candidateName: string,
  candidatePhone: string,
) {
  if (!clientNamesMatch(clientName, candidateName)) return false;

  const clientDigits = normalizeBhutanPhoneDigits(clientPhone);
  const candidateDigits = normalizeBhutanPhoneDigits(candidatePhone);
  if (clientDigits.length === 8 || candidateDigits.length === 8) {
    return clientDigits.length === 8 && clientDigits === candidateDigits;
  }

  return true;
}

/** Walk-in can be removed only when every linked project balance is settled and no in-flight booking payments remain. */
export async function isWalkInManageClientPaymentCleared(
  client: ManageClientRow,
): Promise<boolean> {
  const { data: projectRows, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (projectsError) throw projectsError;

  for (const row of projectRows ?? []) {
    if (
      !walkInClientMatchesIdentity(
        client.fullName,
        client.phone,
        row.artist_name ?? '',
        row.artist_phone ?? '',
      )
    ) {
      continue;
    }

    const project = resolveProjectBalancePayments(projectFromRow(row), {
      studioNotes: row.studio_notes,
    });
    if (getOutstandingBalance(project) > 0) {
      return false;
    }
  }

  const { data: bookingRows, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, profiles!bookings_client_id_fkey(phone)')
    .order('created_at', { ascending: false });

  if (bookingsError) throw bookingsError;

  for (const row of bookingRows ?? []) {
    const booking = bookingFromRow(row);
    if (booking.status === 'cancelled') continue;

    const bookingPhone = booking.clientPhone ?? '';
    if (
      !walkInClientMatchesIdentity(
        client.fullName,
        client.phone,
        booking.artistName,
        bookingPhone,
      )
    ) {
      continue;
    }

    if (isClientPipelineBooking(booking.status)) {
      return false;
    }

    const requiredAdvance = booking.requiredAdvance ?? 0;
    const advancePaid = booking.advancePaid ?? 0;
    if (requiredAdvance > 0 && advancePaid < requiredAdvance) {
      return false;
    }
  }

  return true;
}
