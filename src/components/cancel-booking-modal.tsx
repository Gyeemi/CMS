import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { dropdownPanelShadow } from '@/constants/shadows';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useTheme } from '@/hooks/use-theme';
import type { RecordingBooking } from '@/types/client';

type CancelBookingModalProps = {
  visible: boolean;
  booking: RecordingBooking | null;
  clientId?: string;
  onClose: () => void;
  onCancelled?: () => void;
};

export function CancelBookingModal({
  visible,
  booking,
  clientId,
  onClose,
  onCancelled,
}: CancelBookingModalProps) {
  const theme = useTheme();
  const { cancelBooking } = useBookings();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReason('');
      setSubmitting(false);
    }
  }, [visible, booking?.id]);

  if (!booking) return null;

  const handleCancelBooking = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please enter a reason for cancelling this booking.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await cancelBooking(booking.id, reason, clientId ? { clientId } : undefined);
      if (!result.ok) {
        Alert.alert('Unable to cancel', result.error ?? 'Please try again.');
        return;
      }
      onClose();
      onCancelled?.();
      Alert.alert('Booking cancelled', 'Your booking request has been cancelled.');
    } catch {
      Alert.alert('Unable to cancel', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.panel,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ThemedText type="subtitle" style={styles.title}>
              Cancel Booking
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              You are about to cancel your {booking.projectType} booking for {booking.artistName}.
              This action cannot be undone.
            </ThemedText>

            <FormField
              label="Reason for cancellation"
              value={reason}
              onChangeText={setReason}
              placeholder="Tell us why you are cancelling…"
              multiline
              style={styles.reasonInput}
            />

            <View style={styles.actions}>
              <PrimaryButton
                label={submitting ? 'Cancelling…' : 'Confirm Cancellation'}
                variant="danger"
                onPress={() => void handleCancelBooking()}
                disabled={submitting}
              />
              <PrimaryButton
                label="Keep Booking"
                variant="secondary"
                onPress={onClose}
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  panel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderRadius: Radius.md,
    ...dropdownPanelShadow,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  reasonInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actions: {
    gap: Spacing.two,
  },
});
