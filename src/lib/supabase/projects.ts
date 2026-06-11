import {
  appendBalancePaymentHistoryToNotes,
  enrichProjectFromBalanceNotes,
  readCumulativeBalancePaid,
  resolveProjectBalancePayments,
} from '@/lib/balance-payment-storage';
import {
  fetchBookingForProject,
  linkBookingToProject,
  updateBooking,
} from '@/lib/supabase/bookings';
import { deleteInvoiceForProjectSupabase } from '@/lib/supabase/invoices';
import { projectFromRow, projectToRow } from '@/lib/supabase/mappers';
import { tryPreserveWalkInClientIfNeeded } from '@/lib/supabase/walk-in-clients-directory';
import { supabase } from '@/lib/supabase';
import {
  getOutstandingBalance,
  getProductionStatusTransitionError,
  normalizeProductionStatus,
  type BalancePaymentMethod,
  type BalancePaymentTransaction,
  type EPaymentPlatform,
  type ProductionStatus,
  type Project,
  type ProjectFormData,
} from '@/types/project';

export async function fetchProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data
    ? resolveProjectBalancePayments(projectFromRow(data), { studioNotes: data.studio_notes })
    : null;
}

export async function loadProjectsFromSupabase(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    resolveProjectBalancePayments(projectFromRow(row), { studioNotes: row.studio_notes }),
  );
}

export async function insertProject(
  form: ProjectFormData,
  bookingId?: string | null,
): Promise<Project> {
  const now = new Date().toISOString();
  const row = {
    ...projectToRow(form, { bookingId }),
    created_at: now,
    updated_at: now,
    production_status_updated_at: now,
  };

  const { data, error } = await supabase.from('projects').insert(row).select('*').single();
  if (error) throw error;

  await tryPreserveWalkInClientIfNeeded({
    artistName: form.artistName,
    artistPhone: form.artistPhone,
    bookingId: bookingId ?? data.booking_id,
  });

  const project = projectFromRow(data);
  if (bookingId) {
    await linkBookingToProject(bookingId, project.id);
  }

  return project;
}

export async function updateProjectRecord(id: string, form: ProjectFormData): Promise<Project> {
  const { data: existing, error: existingError } = await supabase
    .from('projects')
    .select('production_status')
    .eq('id', id)
    .maybeSingle();

  if (existingError) throw existingError;

  const currentStatus = normalizeProductionStatus(existing?.production_status);
  if (form.productionStatus !== currentStatus) {
    const transitionError = getProductionStatusTransitionError(
      currentStatus,
      form.productionStatus,
    );
    if (transitionError) throw new Error(transitionError);
  }

  const now = new Date().toISOString();
  const statusChanged =
    existing?.production_status != null && existing.production_status !== form.productionStatus;

  const row = {
    ...projectToRow(form),
    updated_at: now,
    ...(statusChanged ? { production_status_updated_at: now } : {}),
  };

  const { data, error } = await supabase
    .from('projects')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  await tryPreserveWalkInClientIfNeeded({
    artistName: form.artistName,
    artistPhone: form.artistPhone,
    bookingId: data.booking_id,
  });

  return projectFromRow(data);
}

export async function updateProjectProductionStatus(
  id: string,
  nextStatus: ProductionStatus,
): Promise<Project> {
  const { data: existing, error: existingError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) throw new Error('Project not found.');

  const currentStatus = normalizeProductionStatus(existing.production_status);
  const transitionError = getProductionStatusTransitionError(currentStatus, nextStatus);
  if (transitionError) throw new Error(transitionError);

  if (currentStatus === nextStatus) {
    return enrichProjectFromBalanceNotes(projectFromRow(existing), existing.studio_notes);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('projects')
    .update({
      production_status: nextStatus,
      production_status_updated_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return projectFromRow(data);
}

export async function deleteProjectRecord(id: string) {
  const { data: projectRow, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (projectRow) {
    const settledProject = resolveProjectBalancePayments(projectFromRow(projectRow), {
      studioNotes: projectRow.studio_notes,
    });
    if (getOutstandingBalance(settledProject) > 0) {
      throw new Error(
        'Cannot delete a project with an outstanding balance. Record payment or mark the balance as paid first.',
      );
    }
    let clientEmail = '';
    if (projectRow.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('client_email')
        .eq('id', projectRow.booking_id)
        .maybeSingle();
      clientEmail = booking?.client_email?.trim() ?? '';
    }

    await tryPreserveWalkInClientIfNeeded({
      artistName: projectRow.artist_name,
      artistPhone: projectRow.artist_phone,
      bookingId: projectRow.booking_id,
      clientEmail,
    });
  }

  const linkedBookingIds = new Set<string>();
  if (projectRow?.booking_id) linkedBookingIds.add(projectRow.booking_id);

  const { data: linkedBookings, error: linkedError } = await supabase
    .from('bookings')
    .select('id')
    .eq('project_id', id);
  if (linkedError) throw linkedError;
  for (const row of linkedBookings ?? []) {
    linkedBookingIds.add(row.id);
  }

  if (linkedBookingIds.size > 0) {
    const { error: archiveError } = await supabase
      .from('bookings')
      .update({
        project_id: null,
        status: 'completed',
      })
      .in('id', [...linkedBookingIds]);
    if (archiveError) throw archiveError;
  }

  await deleteInvoiceForProjectSupabase(id);

  const { data, error } = await supabase.from('projects').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) {
    throw new Error('Project could not be deleted. Please refresh and try again.');
  }
}

export type RecordBalancePaymentInput = {
  balancePaidAmount: number;
  balancePaymentMethod: BalancePaymentMethod;
  balancePaymentPlatform?: EPaymentPlatform;
  balancePaymentRef?: string;
};

export type RecordBalancePaymentResult = {
  project: Project;
  paymentDetailsSaved: boolean;
};

function mergePaymentRefs(existing: string | null | undefined, next?: string) {
  const trimmed = next?.trim();
  if (!trimmed) return existing?.trim() || null;
  if (!existing?.trim()) return trimmed;
  if (existing.includes(trimmed)) return existing;
  return `${existing}; ${trimmed}`;
}

async function syncBalancePaymentCopies(
  projectId: string,
  transaction: BalancePaymentTransaction,
  cumulativeAmount: number,
  booking: Awaited<ReturnType<typeof fetchBookingForProject>>,
  existingStudioNotes?: string | null,
) {
  if (booking) {
    const notes = appendBalancePaymentHistoryToNotes(
      booking.notes,
      transaction,
      cumulativeAmount,
    );
    if (notes !== booking.notes) {
      await updateBooking(booking.id, { notes });
    }
  }

  if (existingStudioNotes !== undefined) {
    const studioNotes = appendBalancePaymentHistoryToNotes(
      existingStudioNotes ?? '',
      transaction,
      cumulativeAmount,
    );
    const { error } = await supabase
      .from('projects')
      .update({ studio_notes: studioNotes })
      .eq('id', projectId);
    if (error && !isMissingStudioNotesColumnError(error)) {
      throw error;
    }
  }
}

function isMissingPaymentColumnError(error: { message?: string; code?: string }) {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST204' ||
    message.includes('balance_payment_method') ||
    message.includes('balance_payment_platform') ||
    message.includes('balance_payment_ref') ||
    message.includes('balance_paid_at') ||
    message.includes('balance_paid_amount') ||
    message.includes('schema cache')
  );
}

function isMissingStudioNotesColumnError(error: { message?: string; code?: string }) {
  const message = error.message?.toLowerCase() ?? '';
  return error.code === 'PGRST204' || message.includes('studio_notes') || message.includes('schema cache');
}

async function storeBalancePaymentInProjectNotes(
  id: string,
  transaction: BalancePaymentTransaction,
  cumulativeAmount: number,
): Promise<Project | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('studio_notes')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    if (isMissingStudioNotesColumnError(fetchError)) return null;
    throw fetchError;
  }

  const studioNotes = appendBalancePaymentHistoryToNotes(
    existing?.studio_notes ?? '',
    transaction,
    cumulativeAmount,
  );

  const { data, error } = await supabase
    .from('projects')
    .update({
      studio_notes: studioNotes,
      updated_at: transaction.paidAt,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (isMissingStudioNotesColumnError(error)) return null;
    throw error;
  }

  return enrichProjectFromBalanceNotes(projectFromRow(data), studioNotes);
}

export async function recordProjectBalancePayment(
  id: string,
  payment: RecordBalancePaymentInput,
): Promise<RecordBalancePaymentResult> {
  const paidAt = new Date().toISOString();
  const incrementalAmount = payment.balancePaidAmount;
  const transaction: BalancePaymentTransaction = {
    amount: incrementalAmount,
    method: payment.balancePaymentMethod,
    platform: payment.balancePaymentPlatform,
    ref: payment.balancePaymentRef,
    paidAt,
  };
  const booking = await fetchBookingForProject(id);
  const { data: current, error: currentError } = await supabase
    .from('projects')
    .select('balance_paid_amount, balance_payment_ref, studio_notes')
    .eq('id', id)
    .maybeSingle();

  if (currentError && !isMissingPaymentColumnError(currentError)) {
    throw currentError;
  }

  const previousPaid = readCumulativeBalancePaid({
    balancePaidAmount:
      current?.balance_paid_amount != null ? Number(current.balance_paid_amount) : null,
    studioNotes: current?.studio_notes,
    bookingNotes: booking?.notes,
  });
  const cumulativeAmount = previousPaid + incrementalAmount;
  const mergedRef = mergePaymentRefs(current?.balance_payment_ref, payment.balancePaymentRef);
  const cumulativePayment: RecordBalancePaymentInput = {
    ...payment,
    balancePaidAmount: cumulativeAmount,
    balancePaymentRef: mergedRef ?? payment.balancePaymentRef,
  };

  const { data, error } = await supabase
    .from('projects')
    .update({
      balance_payment_method: cumulativePayment.balancePaymentMethod,
      balance_payment_platform: cumulativePayment.balancePaymentPlatform ?? null,
      balance_payment_ref: cumulativePayment.balancePaymentRef?.trim() || null,
      balance_paid_amount: cumulativeAmount,
      balance_paid_at: paidAt,
      updated_at: paidAt,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (!error) {
    await syncBalancePaymentCopies(
      id,
      transaction,
      cumulativeAmount,
      booking,
      current?.studio_notes,
    );
    const refreshedBooking = booking ? await fetchBookingForProject(id) : null;
    return {
      project: resolveProjectBalancePayments(projectFromRow(data), {
        studioNotes: data.studio_notes,
        bookingNotes: refreshedBooking?.notes,
      }),
      paymentDetailsSaved: true,
    };
  }

  if (!isMissingPaymentColumnError(error)) {
    throw error;
  }

  const projectFromNotes = await storeBalancePaymentInProjectNotes(
    id,
    transaction,
    cumulativeAmount,
  );
  if (projectFromNotes) {
    if (booking) {
      await syncBalancePaymentCopies(id, transaction, cumulativeAmount, booking, undefined);
    }
    const refreshedBooking = booking ? await fetchBookingForProject(id) : null;
    return {
      project: resolveProjectBalancePayments(projectFromNotes, {
        bookingNotes: refreshedBooking?.notes,
      }),
      paymentDetailsSaved: true,
    };
  }

  if (!booking) {
    throw new Error(
      'Unable to save payment for this walk-in project. Run the Supabase migrations in supabase/migrations (balance payment columns and studio_notes), then try again.',
    );
  }

  const notes = appendBalancePaymentHistoryToNotes(
    booking.notes,
    transaction,
    cumulativeAmount,
  );

  const updatedBooking = await updateBooking(booking.id, { notes });
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('projects')
    .update({ updated_at: paidAt })
    .eq('id', id)
    .select('*')
    .single();

  if (fallbackError) throw fallbackError;
  return {
    project: resolveProjectBalancePayments(projectFromRow(fallbackData), {
      studioNotes: fallbackData.studio_notes,
      bookingNotes: updatedBooking.notes,
    }),
    paymentDetailsSaved: true,
  };
}
