import { bookingFromRow } from '@/lib/supabase/mappers';
import { supabase } from '@/lib/supabase';
import type { BookingRow } from '@/types/database';
import type { BookingFormData, ClientProjectDetailsFormData, RecordingBooking } from '@/types/client';

function sortBookings(bookings: RecordingBooking[]) {
  return [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchBookingById(id: string): Promise<RecordingBooking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles!bookings_client_id_fkey(phone)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? bookingFromRow(data) : null;
}

export async function fetchBookingForProject(projectId: string): Promise<RecordingBooking | null> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('booking_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;

  if (project?.booking_id) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, profiles!bookings_client_id_fkey(phone)')
      .eq('id', project.booking_id)
      .maybeSingle();
    if (error) throw error;
    return data ? bookingFromRow(data) : null;
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles!bookings_client_id_fkey(phone)')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  return data ? bookingFromRow(data) : null;
}

export async function loadBookingsFromSupabase(): Promise<RecordingBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles!bookings_client_id_fkey(phone)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return sortBookings((data ?? []).map(bookingFromRow));
}

export async function insertBooking(
  client: { id: string; fullName: string; email: string },
  form: BookingFormData,
): Promise<RecordingBooking> {
  const row = {
    client_id: client.id,
    client_name: client.fullName,
    client_email: client.email,
    artist_name: form.artistName.trim(),
    project_type: form.projectType,
    project_category: form.projectCategory,
    preferred_date: form.preferredDate.trim(),
    notes: form.notes.trim(),
    status: 'pending' as const,
    project_name: form.projectName.trim() || null,
    producer_name: null,
    project_details_submitted_at: null,
    project_amount: null,
    required_advance: null,
    advance_paid: 0,
    project_id: null,
    payment_screenshot_url: null,
    cancellation_reason: null,
    cancelled_at: null,
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert(row)
    .select('*, profiles!bookings_client_id_fkey(phone)')
    .single();
  if (error) throw error;
  return bookingFromRow(data);
}

export async function updateBooking(
  id: string,
  patch: Partial<Omit<BookingRow, 'id' | 'created_at'>>,
): Promise<RecordingBooking> {
  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', id)
    .select('*, profiles!bookings_client_id_fkey(phone)')
    .single();

  if (error) throw error;
  return bookingFromRow(data);
}

export async function updateBookingStatus(id: string, status: RecordingBooking['status']) {
  return updateBooking(id, { status });
}

export async function updateBookingPreferredDate(id: string, preferredDate: string) {
  return updateBooking(id, {
    preferred_date: preferredDate.trim(),
    proposed_date: null,
    proposed_date_status: null,
  });
}

export async function proposeBookingDateChange(id: string, proposedDate: string) {
  return updateBooking(id, {
    proposed_date: proposedDate.trim(),
    proposed_date_status: 'pending',
  });
}

export async function clearBookingDateProposal(id: string) {
  return updateBooking(id, {
    proposed_date: null,
    proposed_date_status: null,
  });
}

export async function acceptBookingDateProposal(id: string, proposedDate: string) {
  return updateBooking(id, {
    preferred_date: proposedDate.trim(),
    proposed_date: null,
    proposed_date_status: null,
  });
}

export async function rejectBookingDateProposal(id: string) {
  return updateBooking(id, {
    proposed_date_status: 'rejected',
  });
}

export async function setBookingQuote(id: string, projectAmount: number, requiredAdvance: number) {
  return updateBooking(id, {
    project_amount: projectAmount,
    required_advance: requiredAdvance,
    status: 'awaiting_advance',
  });
}

export async function payAdvanceBooking(id: string, paymentScreenshotUrl: string) {
  return updateBooking(id, {
    status: 'awaiting_confirmation',
    payment_screenshot_url: paymentScreenshotUrl,
  });
}

export async function confirmBookingPayment(id: string, projectId: string, advancePaid: number) {
  return completeBookingRecord(id, projectId, advancePaid);
}

export async function linkBookingToProject(id: string, projectId: string) {
  return updateBooking(id, { project_id: projectId });
}

export async function completeBookingWhenProjectRegistered(
  projectId: string,
  booking?: RecordingBooking | null,
) {
  const resolved = booking ?? (await fetchBookingForProject(projectId));
  if (!resolved) return null;
  if (resolved.status === 'completed' || resolved.status === 'cancelled') {
    return resolved;
  }
  if (resolved.status === 'awaiting_confirmation' || resolved.status === 'awaiting_advance') {
    return resolved;
  }
  if (!resolved.projectId) {
    return updateBooking(resolved.id, { project_id: projectId }).then((linked) =>
      completeBookingRecord(
        linked.id,
        projectId,
        linked.advancePaid ?? linked.requiredAdvance ?? undefined,
      ),
    );
  }

  return completeBookingRecord(
    resolved.id,
    projectId,
    resolved.advancePaid ?? resolved.requiredAdvance ?? undefined,
  );
}

export async function completeBookingRecord(
  id: string,
  projectId: string,
  advancePaid?: number | null,
) {
  return updateBooking(id, {
    status: 'completed',
    project_id: projectId,
    ...(advancePaid != null && advancePaid > 0 ? { advance_paid: advancePaid } : {}),
  });
}

export async function submitBookingProjectDetails(
  id: string,
  form: ClientProjectDetailsFormData,
) {
  return updateBooking(id, {
    project_name: form.projectName.trim(),
    artist_name: form.artistName.trim(),
    producer_name: form.producerName.trim(),
    project_type: form.projectType,
    project_category: form.projectCategory,
    project_details_submitted_at: new Date().toISOString(),
  });
}

export async function cancelBookingRecord(id: string, reason: string) {
  return updateBooking(id, {
    status: 'cancelled',
    cancellation_reason: reason.trim(),
    cancelled_at: new Date().toISOString(),
  });
}

export async function deleteBookingRecord(id: string): Promise<void> {
  const { data, error } = await supabase.from('bookings').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) {
    throw new Error(
      'This cancelled booking could not be deleted. Your account may not have delete permission yet — ask the studio to apply the latest Supabase booking migration (20250606240000_cancelled_booking_cleanup.sql).',
    );
  }
}

export async function purgeExpiredCancelledBookings(): Promise<void> {
  const { error } = await supabase.rpc('purge_expired_cancelled_bookings');
  if (error) throw error;
}

export function subscribeToBookings(onChange: () => void) {
  const channel = supabase
    .channel('bookings-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
