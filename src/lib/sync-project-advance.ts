import { getProjectAdvanceToSync, resolveProjectAdvancePayment } from '@/lib/project-advance-resolve';
import { loadBookingsFromSupabase } from '@/lib/supabase/bookings';
import { fetchProjectById, updateProjectRecord } from '@/lib/supabase/projects';
import type { RecordingBooking } from '@/types/client';
import type { Project } from '@/types/project';

export async function syncBookingProjectAdvance(
  booking: RecordingBooking,
  projectId: string,
): Promise<void> {
  const project = await fetchProjectById(projectId);
  if (!project) return;

  const advancePayment = getProjectAdvanceToSync(project, booking);
  if (advancePayment == null) return;

  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...formData } = project;
  await updateProjectRecord(projectId, { ...formData, advancePayment });
}

function bookingForProject(projectId: string, bookings: RecordingBooking[]) {
  return bookings.find((booking) => booking.projectId === projectId);
}

export type SyncProjectsOptions = {
  /** When false, only enrich in memory (for clients who cannot update projects). */
  persistUpdates?: boolean;
};

export async function syncProjectAdvancesFromBookings(
  projects: Project[],
  options: SyncProjectsOptions = {},
): Promise<Project[]> {
  const persistUpdates = options.persistUpdates ?? true;
  const bookings = await loadBookingsFromSupabase();

  return Promise.all(
    projects.map(async (project) => {
      const booking = bookingForProject(project.id, bookings);
      if (!booking) return project;

      const enriched = resolveProjectAdvancePayment(project, booking);
      if (!persistUpdates) return enriched;

      const advanceToSync = getProjectAdvanceToSync(enriched, booking);
      if (advanceToSync == null || enriched.advancePayment === advanceToSync) {
        return enriched;
      }

      const { id, createdAt: _createdAt, updatedAt: _updatedAt, ...formData } = enriched;
      const updated = await updateProjectRecord(id, { ...formData, advancePayment: advanceToSync });
      return resolveProjectAdvancePayment(updated, booking);
    }),
  );
}
