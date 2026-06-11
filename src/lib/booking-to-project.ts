import { resolveProjectBalancePayments } from '@/lib/balance-payment-storage';
import { resolveArtistPhone } from '@/lib/phone-format';
import { completeBookingRecord } from '@/lib/supabase/bookings';
import { fetchProjectById, updateProjectRecord } from '@/lib/supabase/projects';
import { syncBookingProjectAdvance } from '@/lib/sync-project-advance';
import { getBookingAdvancePaid, type RecordingBooking } from '@/types/client';
import { isComboProjectType, type Project, type ProjectFormData } from '@/types/project';

export { getProjectAdvanceToSync, resolveProjectAdvancePayment } from '@/lib/project-advance-resolve';

export function createProjectFromBooking(booking: RecordingBooking): ProjectFormData {
  const projectAmount = booking.projectAmount ?? 0;
  const advancePayment = getBookingAdvancePaid(booking);

  const projectName =
    booking.projectName?.trim() || `${booking.artistName} - ${booking.projectType}`;
  const producer = booking.producerName?.trim() || booking.artistName;
  const artistPhone = resolveArtistPhone('', booking.clientPhone);

  if (isComboProjectType(booking.projectType)) {
    return {
      projectName,
      artistName: booking.artistName,
      artistPhone,
      producer,
      projectType: booking.projectType,
      projectCategory: booking.projectCategory,
      projectAmount,
      audioAmount: projectAmount,
      videoAmount: 0,
      advancePayment,
      discount: 0,
      gstEnabled: false,
      audioCopyright: 'Unauthorized',
      productionStatus: 'project_registered',
    };
  }

  return {
    projectName,
    artistName: booking.artistName,
    artistPhone,
    producer,
    projectType: booking.projectType,
    projectCategory: booking.projectCategory,
    projectAmount,
    advancePayment,
    discount: 0,
    gstEnabled: false,
    audioCopyright: 'Unauthorized',
    productionStatus: 'project_registered',
  };
}

export async function startProjectFromBooking(
  booking: RecordingBooking,
  addProject: (data: ProjectFormData, bookingId?: string | null) => Promise<Project>,
): Promise<Project> {
  let project: Project;

  if (booking.projectId) {
    const existing = await fetchProjectById(booking.projectId);
    if (!existing) {
      project = await addProject(createProjectFromBooking(booking), booking.id);
    } else {
      project = existing;
      await syncBookingProjectAdvance(booking, project.id);
    }
  } else {
    project = await addProject(createProjectFromBooking(booking), booking.id);
  }

  if (booking.status === 'confirmed') {
    await completeBookingRecord(
      booking.id,
      project.id,
      getBookingAdvancePaid(booking) || undefined,
    );
  }

  if (project.productionStatus !== 'under_production') {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...formData } = project;
    project = await updateProjectRecord(project.id, {
      ...formData,
      productionStatus: 'under_production',
    });
  }

  return project;
}

export function enrichProjectWithBookingBalance(
  project: Project,
  booking?: Pick<RecordingBooking, 'notes'> | null,
): Project {
  return resolveProjectBalancePayments(project, { bookingNotes: booking?.notes });
}

/** Hide from admin Client Booking Requests once a studio project is registered for the booking. */
export function isAdminActiveBookingRequest(
  booking: RecordingBooking,
  project: Project | undefined,
) {
  if (booking.status === 'completed' || booking.status === 'cancelled') return false;
  if (booking.status === 'awaiting_confirmation' || booking.status === 'awaiting_advance') {
    return true;
  }
  if (booking.projectId && project) return false;
  return true;
}

/** Mark open bookings completed when they are already linked to a registered project. */
export async function syncRegisteredBookingsToCompleted(
  bookings: RecordingBooking[],
  projects: Project[],
) {
  const tasks = bookings
    .filter(
      (booking) =>
        booking.status === 'confirmed' &&
        Boolean(booking.projectId),
    )
    .map(async (booking) => {
      const project = projects.find((item) => item.id === booking.projectId);
      if (!project) return;

      await completeBookingRecord(
        booking.id,
        project.id,
        booking.advancePaid ?? booking.requiredAdvance ?? undefined,
      );
    });

  await Promise.all(tasks);
}
