import { displayToIsoDate } from '@/lib/date-format';
import { supabase } from '@/lib/supabase';
import type { RecordingBooking } from '@/types/client';

function addIsoDate(iso: string | undefined, target: Set<string>) {
  if (!iso) return;
  target.add(iso);
}

/** Build occupied ISO dates from visible bookings (admin/staff). */
export function collectOccupiedIsoDatesFromBookings(
  bookings: RecordingBooking[],
  options?: { excludeClientId?: string; excludeBookingId?: string },
) {
  const occupied = new Set<string>();

  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;
    if (options?.excludeBookingId && booking.id === options.excludeBookingId) continue;
    if (options?.excludeClientId && booking.clientId === options.excludeClientId) continue;

    addIsoDate(displayToIsoDate(booking.preferredDate), occupied);

    if (booking.proposedDate?.trim() && booking.proposedDateStatus === 'pending') {
      addIsoDate(displayToIsoDate(booking.proposedDate), occupied);
    }
  }

  return occupied;
}

/** Dates reserved by other clients (via security-definer RPC). */
export async function fetchOtherClientSessionIsoDates(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_other_client_session_dates');
  if (error) {
    throw error;
  }

  const occupied = new Set<string>();
  for (const row of data ?? []) {
    const sessionDate =
      typeof row === 'string'
        ? row
        : typeof row?.session_date === 'string'
          ? row.session_date
          : '';
    addIsoDate(displayToIsoDate(sessionDate), occupied);
  }

  return occupied;
}
