import { formatBalancePaidDate } from '@/lib/date-format';
import {
  formatCurrency,
  getOutstandingBalance,
  isProjectBalancePaid,
  type Project,
  type ProjectCategory,
  type ProjectType,
} from '@/types/project';

export type ClientAccount = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  password: string;
  createdAt: string;
};

export type BookingStatus =
  | 'pending'
  | 'awaiting_advance'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type ProposedDateStatus = 'pending' | 'accepted' | 'rejected';

/** Bookings still in the request/payment flow — hidden from My Bookings once confirmed. */
export function isClientPipelineBooking(status: BookingStatus) {
  return status !== 'confirmed' && status !== 'completed';
}

export function getBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'awaiting_advance':
      return 'Awaiting Advance';
    case 'awaiting_confirmation':
      return 'Awaiting Confirmation';
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Pending';
  }
}

export const CLIENT_PROJECT_TYPES = [
  { label: 'Music', value: 'Music Production' },
  { label: 'Music Video', value: 'Music Video' },
  { label: 'Music and Music Video', value: 'Music & Music Video Production' },
] as const satisfies readonly { label: string; value: ProjectType }[];

export type ClientProjectDetailsFormData = {
  projectName: string;
  artistName: string;
  producerName: string;
  projectType: ProjectType;
  projectCategory: ProjectCategory;
};

export type RecordingBooking = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  artistName: string;
  projectType: ProjectType;
  projectCategory: ProjectCategory;
  preferredDate: string;
  proposedDate?: string;
  proposedDateStatus?: ProposedDateStatus;
  notes: string;
  status: BookingStatus;
  projectName?: string;
  producerName?: string;
  projectDetailsSubmittedAt?: string;
  projectAmount?: number;
  requiredAdvance?: number;
  advancePaid?: number;
  projectId?: string;
  paymentScreenshotUri?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  studioRegisteredAt?: string;
  createdAt: string;
};

export function isStudioRegisteredProjectNotification(
  booking: Pick<RecordingBooking, 'studioRegisteredAt' | 'status' | 'projectId'>,
) {
  return (
    Boolean(booking.studioRegisteredAt) &&
    (booking.status === 'confirmed' || booking.status === 'completed') &&
    Boolean(booking.projectId)
  );
}

export function studioRegisteredProjectNotificationKey(
  booking: Pick<RecordingBooking, 'id' | 'studioRegisteredAt'>,
) {
  return `project_registered:${booking.id}:${booking.studioRegisteredAt}`;
}

export function hasSubmittedProjectDetails(booking: RecordingBooking): boolean {
  return Boolean(booking.projectDetailsSubmittedAt);
}

export function hasPendingDateChange(
  booking: Pick<RecordingBooking, 'proposedDate' | 'proposedDateStatus'>,
) {
  return booking.proposedDateStatus === 'pending' && Boolean(booking.proposedDate?.trim());
}

export function wasDateChangeRejected(
  booking: Pick<RecordingBooking, 'proposedDate' | 'proposedDateStatus'>,
) {
  return booking.proposedDateStatus === 'rejected' && Boolean(booking.proposedDate?.trim());
}

export function canAdminSendQuote(booking: RecordingBooking) {
  return booking.status === 'pending' && !hasPendingDateChange(booking);
}

export function getBookingAdvancePaid(
  booking: Pick<RecordingBooking, 'advancePaid' | 'requiredAdvance'>,
) {
  return booking.advancePaid != null && booking.advancePaid > 0 ? booking.advancePaid : 0;
}

/** Project still owes balance — counts as active on the client dashboard. */
export function isClientProjectPaymentPending(
  project: Pick<
    Project,
    'projectAmount' | 'advancePayment' | 'discount' | 'balancePaidAmount'
  >,
) {
  return getOutstandingBalance(project) > 0;
}

/** Advance counts toward client portal totals only while payment is still pending. */
export function shouldCountBookingAdvanceForClientPortal(
  booking: Pick<RecordingBooking, 'status' | 'projectId'>,
  pendingPaymentProjectIds: ReadonlySet<string>,
) {
  if (booking.projectId && pendingPaymentProjectIds.has(booking.projectId)) {
    return true;
  }
  return isClientPipelineBooking(booking.status);
}

export function getClientTotalAdvancePaid(
  bookings: RecordingBooking[],
  pendingPaymentProjectIds: ReadonlySet<string>,
) {
  return bookings.reduce((sum, booking) => {
    if (!shouldCountBookingAdvanceForClientPortal(booking, pendingPaymentProjectIds)) {
      return sum;
    }
    const paid = booking.advancePaid ?? 0;
    return paid > 0 ? sum + paid : sum;
  }, 0);
}

export function getBookingRemainingBalance(
  booking: Pick<RecordingBooking, 'projectAmount' | 'advancePaid'>,
) {
  if (booking.projectAmount == null || booking.projectAmount <= 0) return 0;
  const paidAdvance = booking.advancePaid != null && booking.advancePaid > 0 ? booking.advancePaid : 0;
  return Math.max(0, booking.projectAmount - paidAdvance);
}

/** Client portal: remaining balance after discount, advance, and any balance paid. */
export function getClientProjectRemainingBalance(
  project: Pick<
    Project,
    | 'projectAmount'
    | 'discount'
    | 'advancePayment'
    | 'balancePaidAmount'
    | 'balancePaymentMethod'
    | 'balancePaidAt'
  >,
  _booking?: Pick<RecordingBooking, 'projectAmount' | 'advancePaid' | 'requiredAdvance'> | null,
) {
  void _booking;
  return getOutstandingBalance(project);
}

export function formatClientRemainingBalanceLine(
  project: Project,
  booking?: Pick<RecordingBooking, 'projectAmount' | 'advancePaid' | 'requiredAdvance'> | null,
) {
  const remaining = getClientProjectRemainingBalance(project, booking);
  return `Remaining balance: ${formatCurrency(remaining)}`;
}

export function getClientBalanceDueAmount(
  project: Project,
  booking?: Pick<RecordingBooking, 'projectAmount' | 'advancePaid' | 'requiredAdvance'> | null,
) {
  return getClientProjectRemainingBalance(project, booking);
}

export function createClientProjectDetailsForm(
  booking?: Pick<
    RecordingBooking,
    'projectName' | 'artistName' | 'producerName' | 'projectType' | 'projectCategory'
  >,
): ClientProjectDetailsFormData {
  return {
    projectName: booking?.projectName ?? '',
    artistName: booking?.artistName ?? '',
    producerName: booking?.producerName ?? '',
    projectType: booking?.projectType ?? 'Music Production',
    projectCategory: booking?.projectCategory ?? 'Original',
  };
}

export function getClientProjectTypeLabel(projectType: ProjectType): string {
  const match = CLIENT_PROJECT_TYPES.find((item) => item.value === projectType);
  return match?.label ?? projectType;
}

export function canClientCancelBooking(status: BookingStatus): boolean {
  return status === 'pending' || status === 'awaiting_advance' || status === 'awaiting_confirmation';
}

export const CANCELLED_BOOKING_RETENTION_DAYS = 7;

export function getCancelledBookingAutoDeleteDate(cancelledAt?: string) {
  const base = cancelledAt ? new Date(cancelledAt) : new Date();
  const deleteOn = new Date(base);
  deleteOn.setDate(deleteOn.getDate() + CANCELLED_BOOKING_RETENTION_DAYS);
  return deleteOn;
}

export function formatCancelledBookingAutoDeleteMessage(cancelledAt?: string) {
  const deleteOn = getCancelledBookingAutoDeleteDate(cancelledAt);
  const label = formatBalancePaidDate(deleteOn.toISOString());
  return `This cancelled booking will be removed automatically on ${label} unless you delete it sooner.`;
}

export type ClientSignupData = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export type BookingFormData = {
  artistName: string;
  projectName: string;
  projectType: ProjectType;
  projectCategory: ProjectCategory;
  preferredDate: string;
  notes: string;
};

export function createEmptyBookingForm(): BookingFormData {
  return {
    artistName: '',
    projectName: '',
    projectType: 'Music Production',
    projectCategory: 'Original',
    preferredDate: '',
    notes: '',
  };
}
