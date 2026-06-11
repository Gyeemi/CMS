import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import {
  acceptBookingDateProposal,
  cancelBookingRecord,
  clearBookingDateProposal,
  completeBookingRecord,
  confirmBookingPayment,
  deleteBookingRecord,
  fetchBookingById,
  insertBooking,
  loadBookingsFromSupabase,
  purgeExpiredCancelledBookings,
  payAdvanceBooking,
  proposeBookingDateChange,
  rejectBookingDateProposal,
  setBookingQuote,
  submitBookingProjectDetails,
  subscribeToBookings,
  updateBookingPreferredDate,
  updateBookingStatus,
} from '@/lib/supabase/bookings';
import { displayToIsoDate } from '@/lib/date-format';
import { formatBookingMutationError } from '@/lib/supabase/format-error';
import { uploadPaymentScreenshot } from '@/lib/supabase/payment-screenshots';
import { supabase } from '@/lib/supabase';
import {
  canClientCancelBooking,
  hasPendingDateChange,
  type BookingFormData,
  type ClientProjectDetailsFormData,
  type RecordingBooking,
} from '@/types/client';

type BookingsContextValue = {
  bookings: RecordingBooking[];
  isLoading: boolean;
  refreshBookings: () => Promise<void>;
  addBooking: (
    client: { id: string; fullName: string; email: string },
    data: BookingFormData,
  ) => Promise<RecordingBooking>;
  updateBookingStatus: (id: string, status: RecordingBooking['status']) => Promise<void>;
  setBookingQuote: (
    id: string,
    projectAmount: number,
    requiredAdvance: number,
  ) => Promise<{ ok: boolean; error?: string }>;
  updatePreferredDate: (
    id: string,
    preferredDate: string,
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  acceptProposedDate: (
    id: string,
    options?: { clientId?: string },
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  rejectProposedDate: (
    id: string,
    options?: { clientId?: string },
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  payAdvance: (
    id: string,
    paymentScreenshotUri?: string,
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  confirmPayment: (
    id: string,
    projectId: string,
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  completeBooking: (
    id: string,
    projectId: string,
    advancePaid?: number | null,
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  cancelBooking: (
    id: string,
    reason: string,
    options?: { clientId?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteCancelledBooking: (
    id: string,
    options?: { clientId?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  submitProjectDetails: (
    id: string,
    data: ClientProjectDetailsFormData,
    options?: { clientId?: string },
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  getBookingsForClient: (clientId: string) => RecordingBooking[];
  loadError: string | null;
};

const BookingsContext = createContext<BookingsContextValue | null>(null);

function sortBookings(bookings: RecordingBooking[]) {
  return [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mergeBooking(bookings: RecordingBooking[], updated: RecordingBooking) {
  return sortBookings(bookings.map((booking) => (booking.id === updated.id ? updated : booking)));
}

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<RecordingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setLoadError(null);
      return;
    }

    try {
      try {
        await purgeExpiredCancelledBookings();
      } catch {
        // Migration may not be applied yet; continue loading bookings.
      }
      const data = await loadBookingsFromSupabase();
      setBookings(sortBookings(data));
      setLoadError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load bookings. Check your connection.';
      setLoadError(message);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setIsLoading(true);
    void refreshBookings().finally(() => setIsLoading(false));
  }, [refreshBookings, authLoading]);

  useEffect(() => {
    if (!user) return;

    return subscribeToBookings(() => {
      void refreshBookings();
    });
  }, [refreshBookings, user]);

  const addBooking = useCallback(
    async (client: { id: string; fullName: string; email: string }, data: BookingFormData) => {
      const booking = await insertBooking(client, data);
      await refreshBookings();
      return booking;
    },
    [refreshBookings],
  );

  const handleUpdateBookingStatus = useCallback(
    async (id: string, status: RecordingBooking['status']) => {
      await updateBookingStatus(id, status);
      await refreshBookings();
    },
    [refreshBookings],
  );

  const updatePreferredDate = useCallback(
    async (id: string, preferredDate: string) => {
      const trimmed = preferredDate.trim();
      if (!trimmed) {
        return { ok: false, error: 'Please select a session date.' };
      }
      if (!displayToIsoDate(trimmed)) {
        return { ok: false, error: 'Please enter a valid session date.' };
      }

      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };
      if (booking.status === 'cancelled' || booking.status === 'completed') {
        return { ok: false, error: 'This booking date can no longer be changed.' };
      }

      try {
        const sameAsClientDate =
          displayToIsoDate(trimmed) === displayToIsoDate(booking.preferredDate);

        let updated: RecordingBooking;
        if (booking.status === 'pending') {
          updated = sameAsClientDate
            ? await clearBookingDateProposal(id)
            : await proposeBookingDateChange(id, trimmed);
        } else {
          updated = await updateBookingPreferredDate(id, trimmed);
        }

        setBookings((current) => mergeBooking(current, updated));
        await refreshBookings();
        return { ok: true, booking: updated };
      } catch (error) {
        return { ok: false, error: formatBookingMutationError(error) };
      }
    },
    [bookings, refreshBookings],
  );

  const acceptProposedDate = useCallback(
    async (id: string, options?: { clientId?: string }) => {
      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };

      if (options?.clientId && booking.clientId !== options.clientId) {
        return { ok: false, error: 'You can only respond to your own bookings.' };
      }

      if (!hasPendingDateChange(booking) || !booking.proposedDate?.trim()) {
        return { ok: false, error: 'No pending date change to accept.' };
      }

      try {
        const updated = await acceptBookingDateProposal(id, booking.proposedDate);
        setBookings((current) => mergeBooking(current, updated));
        await refreshBookings();
        return { ok: true, booking: updated };
      } catch (error) {
        return { ok: false, error: formatBookingMutationError(error) };
      }
    },
    [bookings, refreshBookings],
  );

  const rejectProposedDate = useCallback(
    async (id: string, options?: { clientId?: string }) => {
      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };

      if (options?.clientId && booking.clientId !== options.clientId) {
        return { ok: false, error: 'You can only respond to your own bookings.' };
      }

      if (!hasPendingDateChange(booking)) {
        return { ok: false, error: 'No pending date change to decline.' };
      }

      try {
        const updated = await rejectBookingDateProposal(id);
        setBookings((current) => mergeBooking(current, updated));
        await refreshBookings();
        return { ok: true, booking: updated };
      } catch (error) {
        return { ok: false, error: formatBookingMutationError(error) };
      }
    },
    [bookings, refreshBookings],
  );

  const handleSetBookingQuote = useCallback(
    async (id: string, projectAmount: number, requiredAdvance: number) => {
      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };
      if (hasPendingDateChange(booking)) {
        return {
          ok: false,
          error: 'Wait for the client to accept the new session date before sending a quote.',
        };
      }

      if (projectAmount <= 0) {
        return { ok: false, error: 'Enter a valid project amount.' };
      }
      if (requiredAdvance <= 0) {
        return { ok: false, error: 'Enter a valid advance payment amount.' };
      }
      if (requiredAdvance > projectAmount) {
        return { ok: false, error: 'Advance payment cannot exceed the project amount.' };
      }

      await setBookingQuote(id, projectAmount, requiredAdvance);
      await refreshBookings();
      return { ok: true };
    },
    [bookings, refreshBookings],
  );

  const payAdvance = useCallback(
    async (id: string, paymentScreenshotUri?: string) => {
      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };
      if (booking.status !== 'awaiting_advance') {
        return { ok: false, error: 'This booking is not awaiting advance payment.' };
      }
      if (!booking.requiredAdvance || booking.requiredAdvance <= 0) {
        return { ok: false, error: 'Advance amount has not been set yet.' };
      }
      if (!paymentScreenshotUri) {
        return { ok: false, error: 'Upload a payment screenshot before submitting.' };
      }

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { ok: false, error: 'You must be signed in to submit payment.' };

      try {
        const screenshotUrl = await uploadPaymentScreenshot(userId, id, paymentScreenshotUri);
        const updated = await payAdvanceBooking(id, screenshotUrl);
        await refreshBookings();
        return { ok: true, booking: updated };
      } catch {
        return { ok: false, error: 'Unable to upload payment screenshot. Please try again.' };
      }
    },
    [bookings, refreshBookings],
  );

  const confirmPayment = useCallback(
    async (id: string, projectId: string) => {
      const booking = await fetchBookingById(id);
      if (!booking) return { ok: false, error: 'Booking not found.' };
      if (booking.status !== 'awaiting_confirmation') {
        return { ok: false, error: 'This booking is not awaiting payment confirmation.' };
      }
      if (!booking.requiredAdvance || booking.requiredAdvance <= 0) {
        return { ok: false, error: 'Advance amount has not been set yet.' };
      }

      const updated = await confirmBookingPayment(id, projectId, booking.requiredAdvance);
      await refreshBookings();
      return { ok: true, booking: updated };
    },
    [refreshBookings],
  );

  const completeBooking = useCallback(
    async (id: string, projectId: string, advancePaid?: number | null) => {
      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };

      const updated = await completeBookingRecord(
        id,
        projectId,
        advancePaid ?? booking.advancePaid ?? booking.requiredAdvance,
      );
      await refreshBookings();
      return { ok: true, booking: updated };
    },
    [bookings, refreshBookings],
  );

  const submitProjectDetails = useCallback(
    async (id: string, data: ClientProjectDetailsFormData, options?: { clientId?: string }) => {
      if (!data.projectName.trim()) {
        return { ok: false, error: 'Enter a project name.' };
      }
      if (!data.artistName.trim()) {
        return { ok: false, error: 'Enter an artist name.' };
      }
      if (!data.producerName.trim()) {
        return { ok: false, error: 'Enter a producer name.' };
      }

      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };

      if (options?.clientId && booking.clientId !== options.clientId) {
        return { ok: false, error: 'You can only update your own bookings.' };
      }

      if (booking.status !== 'awaiting_confirmation') {
        return { ok: false, error: 'Project details can be submitted after advance payment.' };
      }

      const updated = await submitBookingProjectDetails(id, data);
      await refreshBookings();
      return { ok: true, booking: updated };
    },
    [bookings, refreshBookings],
  );

  const deleteCancelledBooking = useCallback(
    async (id: string, options?: { clientId?: string }) => {
      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };

      const { data: authData } = await supabase.auth.getUser();
      const ownerId = options?.clientId ?? authData.user?.id;
      if (ownerId && booking.clientId !== ownerId) {
        return { ok: false, error: 'You can only delete your own bookings.' };
      }

      if (booking.status !== 'cancelled') {
        return { ok: false, error: 'Only cancelled bookings can be deleted.' };
      }

      try {
        await deleteBookingRecord(id);
        setBookings((current) => current.filter((item) => item.id !== id));
        await refreshBookings();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: formatBookingMutationError(error) };
      }
    },
    [bookings, refreshBookings],
  );

  const cancelBooking = useCallback(
    async (id: string, reason: string, options?: { clientId?: string }) => {
      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        return { ok: false, error: 'Enter a reason for cancellation.' };
      }

      const booking = bookings.find((item) => item.id === id);
      if (!booking) return { ok: false, error: 'Booking not found.' };

      if (options?.clientId && booking.clientId !== options.clientId) {
        return { ok: false, error: 'You can only cancel your own bookings.' };
      }

      if (!canClientCancelBooking(booking.status)) {
        return { ok: false, error: 'This booking can no longer be cancelled.' };
      }

      await cancelBookingRecord(id, trimmedReason);
      await refreshBookings();
      return { ok: true };
    },
    [bookings, refreshBookings],
  );

  const getBookingsForClient = useCallback(
    (clientId: string) => bookings.filter((booking) => booking.clientId === clientId),
    [bookings],
  );

  const value = useMemo(
    () => ({
      bookings,
      isLoading,
      loadError,
      refreshBookings,
      addBooking,
      updateBookingStatus: handleUpdateBookingStatus,
      setBookingQuote: handleSetBookingQuote,
      updatePreferredDate,
      acceptProposedDate,
      rejectProposedDate,
      payAdvance,
      confirmPayment,
      completeBooking,
      cancelBooking,
      deleteCancelledBooking,
      submitProjectDetails,
      getBookingsForClient,
    }),
    [
      bookings,
      isLoading,
      loadError,
      refreshBookings,
      addBooking,
      handleUpdateBookingStatus,
      handleSetBookingQuote,
      updatePreferredDate,
      acceptProposedDate,
      rejectProposedDate,
      payAdvance,
      confirmPayment,
      completeBooking,
      cancelBooking,
      deleteCancelledBooking,
      submitProjectDetails,
      getBookingsForClient,
    ],
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within BookingsProvider');
  return ctx;
}
