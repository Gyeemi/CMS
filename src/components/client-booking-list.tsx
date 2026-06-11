import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { CancelBookingModal } from '@/components/cancel-booking-modal';
import { ClientProjectDetailsModal } from '@/components/client-project-details-modal';
import { PayAdvanceModal } from '@/components/pay-advance-modal';
import { LabeledCurrencyRow } from '@/components/labeled-currency-row';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useBookings } from '@/context/bookings-context';
import { useTheme } from '@/hooks/use-theme';
import { getBookingStatusColor } from '@/lib/client-booking-ui';
import {
  canClientCancelBooking,
  formatCancelledBookingAutoDeleteMessage,
  getBookingRemainingBalance,
  getBookingStatusLabel,
  getClientProjectTypeLabel,
  hasPendingDateChange,
  hasSubmittedProjectDetails,
  type RecordingBooking,
} from '@/types/client';
import { formatCurrency } from '@/types/project';

function showBookingAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

type ClientBookingListProps = {
  bookings: RecordingBooking[];
  emptyMessage?: string;
};

export function ClientBookingList({
  bookings,
  emptyMessage = 'No bookings yet. Tap Book A Recording to submit your first session request.',
}: ClientBookingListProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { acceptProposedDate, rejectProposedDate, deleteCancelledBooking } = useBookings();
  const [payAdvanceBooking, setPayAdvanceBooking] = useState<RecordingBooking | null>(null);
  const [respondingDateId, setRespondingDateId] = useState<string | null>(null);
  const [projectDetailsBooking, setProjectDetailsBooking] = useState<RecordingBooking | null>(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState<RecordingBooking | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  const handleDeleteCancelledBooking = async (booking: RecordingBooking) => {
    const message = `Delete this cancelled booking for ${booking.artistName}?`;
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(message)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Delete booking', message, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]);
          });

    if (!confirmed) return;

    setDeletingBookingId(booking.id);
    try {
      const result = await deleteCancelledBooking(booking.id, {
        clientId: user?.clientId,
      });
      if (!result.ok) {
        showBookingAlert('Unable to delete booking', result.error ?? 'Please try again.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete this booking. Please try again.';
      showBookingAlert('Unable to delete booking', message);
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handlePayAdvance = (booking: RecordingBooking) => {
    if (!booking.requiredAdvance || booking.requiredAdvance <= 0) {
      Alert.alert('Payment unavailable', 'The studio has not set an advance amount yet.');
      return;
    }
    setPayAdvanceBooking(booking);
  };

  if (bookings.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        {emptyMessage}
      </ThemedText>
    );
  }

  return (
    <>
      {bookings.map((booking) => (
        <View
          key={booking.id}
          style={[
            styles.bookingItem,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}>
          <View style={styles.bookingHeader}>
            <ThemedText type="smallBold">{booking.artistName}</ThemedText>
            <ThemedText type="small" style={{ color: getBookingStatusColor(booking.status, theme) }}>
              {getBookingStatusLabel(booking.status)}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {booking.projectType} · {booking.projectCategory}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Preferred: {booking.preferredDate || '—'}
          </ThemedText>
          {hasPendingDateChange(booking) ? (
            <>
              <ThemedText type="small" style={{ color: theme.info }}>
                Studio proposed a new session date: {booking.proposedDate}
              </ThemedText>
              <View style={styles.dateChangeActions}>
                <PrimaryButton
                  label={respondingDateId === booking.id ? 'Accepting…' : 'Accept Date'}
                  onPress={async () => {
                    setRespondingDateId(booking.id);
                    try {
                      const result = await acceptProposedDate(booking.id, {
                        clientId: user?.clientId,
                      });
                      if (!result.ok) {
                        Alert.alert('Unable to accept date', result.error ?? 'Please try again.');
                      }
                    } finally {
                      setRespondingDateId(null);
                    }
                  }}
                  disabled={respondingDateId === booking.id}
                  style={styles.dateChangeActionButton}
                />
                <PrimaryButton
                  label="Decline"
                  variant="danger"
                  onPress={async () => {
                    setRespondingDateId(booking.id);
                    try {
                      const result = await rejectProposedDate(booking.id, {
                        clientId: user?.clientId,
                      });
                      if (!result.ok) {
                        Alert.alert('Unable to decline date', result.error ?? 'Please try again.');
                      }
                    } finally {
                      setRespondingDateId(null);
                    }
                  }}
                  disabled={respondingDateId === booking.id}
                  style={styles.dateChangeActionButton}
                />
              </View>
            </>
          ) : null}
          {booking.projectAmount != null && booking.projectAmount > 0 ? (
            <LabeledCurrencyRow label="Project amount:" amount={booking.projectAmount} />
          ) : null}
          {booking.advancePaid != null && booking.advancePaid > 0 ? (
            <LabeledCurrencyRow
              label="Advance paid:"
              amount={booking.advancePaid}
              color={theme.success}
            />
          ) : null}
          {booking.projectAmount != null && booking.projectAmount > 0 ? (
            <LabeledCurrencyRow
              label="Remaining balance:"
              amount={getBookingRemainingBalance(booking)}
              color={getBookingRemainingBalance(booking) > 0 ? theme.warning : theme.success}
              showPrefix={getBookingRemainingBalance(booking) > 0}
            />
          ) : null}
          {booking.status === 'awaiting_confirmation' ? (
            hasSubmittedProjectDetails(booking) ? (
              <>
                <ThemedText type="small" style={{ color: theme.info }}>
                  Payment submitted. Awaiting studio confirmation.
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Project: {booking.projectName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {getClientProjectTypeLabel(booking.projectType)} · {booking.projectCategory}
                </ThemedText>
                {booking.producerName ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Producer: {booking.producerName}
                  </ThemedText>
                ) : null}
              </>
            ) : (
              <>
                <ThemedText type="small" style={{ color: theme.warning }}>
                  Payment submitted. Please fill in your project details.
                </ThemedText>
                <PrimaryButton
                  label="Fill Project Details"
                  onPress={() => setProjectDetailsBooking(booking)}
                />
              </>
            )
          ) : null}
          {booking.status === 'awaiting_advance' ? (
            <PrimaryButton
              label={`Pay Advance (${formatCurrency(booking.requiredAdvance ?? 0)})`}
              onPress={() => handlePayAdvance(booking)}
            />
          ) : null}
          {booking.status === 'cancelled' ? (
            <>
              {booking.cancellationReason ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  Cancellation reason: {booking.cancellationReason}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {formatCancelledBookingAutoDeleteMessage(booking.cancelledAt)}
              </ThemedText>
              <PrimaryButton
                label={deletingBookingId === booking.id ? 'Deleting…' : 'Delete Booking'}
                variant="danger"
                onPress={() => void handleDeleteCancelledBooking(booking)}
                disabled={deletingBookingId === booking.id}
              />
            </>
          ) : null}
          {canClientCancelBooking(booking.status) ? (
            <PrimaryButton
              label="Cancel Booking"
              variant="danger"
              onPress={() => setCancelBookingTarget(booking)}
            />
          ) : null}
        </View>
      ))}

      {payAdvanceBooking ? (
        <PayAdvanceModal
          visible
          booking={payAdvanceBooking}
          onClose={() => setPayAdvanceBooking(null)}
          onPaymentConfirmed={(booking) => setProjectDetailsBooking(booking)}
        />
      ) : null}

      <ClientProjectDetailsModal
        visible={projectDetailsBooking != null}
        booking={projectDetailsBooking}
        clientId={user?.clientId}
        onClose={() => setProjectDetailsBooking(null)}
      />

      <CancelBookingModal
        visible={cancelBookingTarget != null}
        booking={cancelBookingTarget}
        clientId={user?.clientId}
        onClose={() => setCancelBookingTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bookingItem: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dateChangeActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateChangeActionButton: {
    flex: 1,
  },
});
