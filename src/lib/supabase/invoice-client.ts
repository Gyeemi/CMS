import { supabase } from '@/lib/supabase';

export type InvoiceClientContact = {
  name: string;
  phone: string;
  email: string;
};

export async function fetchInvoiceClientContact(projectId: string): Promise<InvoiceClientContact | null> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('booking_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;

  let clientId: string | null = null;
  let clientName = '';
  let clientEmail = '';

  if (project?.booking_id) {
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, client_name, client_email')
      .eq('id', project.booking_id)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (booking) {
      clientId = booking.client_id;
      clientName = booking.client_name;
      clientEmail = booking.client_email;
    }
  }

  if (!clientId) {
    const { data: linkedBooking, error: linkedBookingError } = await supabase
      .from('bookings')
      .select('client_id, client_name, client_email')
      .eq('project_id', projectId)
      .maybeSingle();

    if (linkedBookingError) throw linkedBookingError;
    if (linkedBooking) {
      clientId = linkedBooking.client_id;
      clientName = linkedBooking.client_name;
      clientEmail = linkedBooking.client_email;
    }
  }

  if (!clientId) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('phone, full_name, email')
    .eq('id', clientId)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    name: clientName || profile?.full_name || 'Client',
    phone: profile?.phone?.trim() ?? '',
    email: clientEmail || profile?.email || '',
  };
}
