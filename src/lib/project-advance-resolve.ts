import { resolveProjectBalancePayments } from '@/lib/balance-payment-storage';
import { getBookingAdvancePaid, type RecordingBooking } from '@/types/client';
import {
  getDisplayAdvancePayment,
  getFullProjectPayment,
  type Project,
} from '@/types/project';

export function resolveProjectAdvancePayment(
  project: Project,
  booking?: Pick<RecordingBooking, 'advancePaid' | 'requiredAdvance' | 'notes'> | null,
): Project {
  let resolved = resolveProjectBalancePayments(
    { ...project, advancePayment: getDisplayAdvancePayment(project) },
    { bookingNotes: booking?.notes },
  );

  if (resolved.advancePayment <= 0 && booking) {
    const advancePayment = getBookingAdvancePaid(booking);
    if (advancePayment > 0) {
      resolved = { ...resolved, advancePayment };
    }
  }

  const full = getFullProjectPayment(resolved);
  if (booking && resolved.advancePayment >= full) {
    const bookingAdvance = getBookingAdvancePaid(booking);
    if (bookingAdvance > 0 && bookingAdvance < resolved.advancePayment) {
      resolved = { ...resolved, advancePayment: bookingAdvance };
    }
  }

  return resolved;
}

export function getProjectAdvanceToSync(project: Project, booking: RecordingBooking) {
  const advancePayment = getBookingAdvancePaid(booking);
  if (advancePayment <= 0 || project.advancePayment >= advancePayment) return null;
  return advancePayment;
}
