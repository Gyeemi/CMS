import { useMemo } from 'react';

import { useAuth } from '@/context/auth-context';
import { useBookings } from '@/context/bookings-context';
import { isClientPipelineBooking } from '@/types/client';

export function useMyBookings() {
  const { user } = useAuth();
  const { bookings } = useBookings();

  return useMemo(
    () =>
      user?.clientId ? bookings.filter((booking) => booking.clientId === user.clientId) : [],
    [user?.clientId, bookings],
  );
}

/** Client My Bookings tab — excludes confirmed/completed (shown under My Projects). */
export function useMyPipelineBookings() {
  const myBookings = useMyBookings();

  return useMemo(
    () => myBookings.filter((booking) => isClientPipelineBooking(booking.status)),
    [myBookings],
  );
}
