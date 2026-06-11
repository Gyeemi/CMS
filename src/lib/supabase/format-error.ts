export function formatBookingMutationError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Please try again.';

  if (
    message.includes('proposed_date') ||
    message.includes('proposed_date_status') ||
    message.includes('schema cache') ||
    message.includes('column')
  ) {
    return 'Database is missing the booking date approval columns. Run supabase/migrations/20250606200000_booking_date_proposal.sql in the Supabase SQL Editor, then reload the app.';
  }

  return message;
}
