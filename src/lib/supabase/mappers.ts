import type { StudioPaymentAccount } from '@/constants/studio-payment';
import type { BookingRow, InvoiceRow, ProfileRow, ProjectRow, StudioPaymentAccountRow } from '@/types/database';
import type { ClientAccount, RecordingBooking } from '@/types/client';
import type { Invoice } from '@/types/invoice';
import {
  normalizeProductionStatus,
  normalizeProjectType,
  type AudioCopyright,
  type BalancePaymentMethod,
  type EPaymentPlatform,
  type Project,
  type ProjectCategory,
} from '@/types/project';

export function profileToClientAccount(row: ProfileRow): ClientAccount {
  return {
    id: row.id,
    username: row.full_name,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url ?? undefined,
    password: '',
    createdAt: row.created_at,
  };
}

type BookingRowWithProfile = BookingRow & {
  profiles?: { phone: string } | { phone: string }[] | null;
};

function readJoinedProfilePhone(row: BookingRowWithProfile) {
  const profiles = row.profiles;
  if (!profiles) return undefined;
  if (Array.isArray(profiles)) return profiles[0]?.phone;
  return profiles.phone;
}

export function bookingFromRow(row: BookingRowWithProfile): RecordingBooking {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: readJoinedProfilePhone(row),
    artistName: row.artist_name,
    projectType: normalizeProjectType(row.project_type),
    projectCategory: row.project_category as ProjectCategory,
    preferredDate: row.preferred_date,
    proposedDate: row.proposed_date ?? undefined,
    proposedDateStatus: row.proposed_date_status ?? undefined,
    notes: row.notes,
    status: row.status,
    projectName: row.project_name ?? undefined,
    producerName: row.producer_name ?? undefined,
    projectDetailsSubmittedAt: row.project_details_submitted_at ?? undefined,
    projectAmount: row.project_amount ?? undefined,
    requiredAdvance: row.required_advance ?? undefined,
    advancePaid: row.advance_paid ?? undefined,
    projectId: row.project_id ?? undefined,
    paymentScreenshotUri: row.payment_screenshot_url ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    studioRegisteredAt: row.studio_registered_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    projectName: row.project_name,
    artistName: row.artist_name,
    artistPhone: row.artist_phone ?? '',
    producer: row.producer,
    projectType: normalizeProjectType(row.project_type),
    projectCategory: row.project_category as ProjectCategory,
    projectAmount: Number(row.project_amount),
    audioAmount: row.audio_amount != null ? Number(row.audio_amount) : undefined,
    videoAmount: row.video_amount != null ? Number(row.video_amount) : undefined,
    advancePayment: Number(row.advance_payment),
    discount: Number(row.discount),
    gstEnabled: row.gst_enabled,
    audioCopyright: row.audio_copyright as AudioCopyright,
    balancePaymentMethod: row.balance_payment_method
      ? (row.balance_payment_method as BalancePaymentMethod)
      : undefined,
    balancePaymentPlatform: row.balance_payment_platform
      ? (row.balance_payment_platform as EPaymentPlatform)
      : undefined,
    balancePaymentRef: row.balance_payment_ref ?? undefined,
    balancePaidAmount:
      row.balance_paid_amount != null ? Number(row.balance_paid_amount) : undefined,
    balancePaidAt: row.balance_paid_at ?? undefined,
    productionStatus: normalizeProductionStatus(row.production_status),
    productionStatusUpdatedAt: row.production_status_updated_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ProjectRowWrite = Omit<
  ProjectRow,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'booking_id'
  | 'balance_payment_method'
  | 'balance_payment_platform'
  | 'balance_payment_ref'
  | 'balance_paid_amount'
  | 'balance_paid_at'
> & {
  booking_id?: string | null;
};

export function projectToRow(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
  options?: { bookingId?: string | null },
): ProjectRowWrite {
  const row: ProjectRowWrite = {
    project_name: data.projectName,
    artist_name: data.artistName,
    artist_phone: data.artistPhone.trim(),
    producer: data.producer,
    project_type: data.projectType,
    project_category: data.projectCategory,
    project_amount: data.projectAmount,
    audio_amount: data.audioAmount ?? null,
    video_amount: data.videoAmount ?? null,
    advance_payment: data.advancePayment,
    discount: data.discount,
    gst_enabled: data.gstEnabled === true,
    audio_copyright: data.audioCopyright,
    production_status: data.productionStatus,
  };

  if (options && 'bookingId' in options) {
    row.booking_id = options.bookingId ?? null;
  }

  return row;
}

export function invoiceFromRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    projectId: row.project_id,
    invoiceNumber: row.invoice_number,
    createdAt: row.created_at,
  };
}

export function studioPaymentFromRow(row: StudioPaymentAccountRow): StudioPaymentAccount {
  return {
    id: row.id,
    accountHolder: row.account_holder,
    accountName: row.account_name,
    bankName: row.bank_name,
    branch: row.branch,
    accountNumber: row.account_number,
    createdAt: row.created_at,
  };
}
