import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClientBookingList } from '@/components/client-booking-list';
import { isOccupiedSessionDate, SessionDateField } from '@/components/session-date-field';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useBookings } from '@/context/bookings-context';
import { useMyPipelineBookings } from '@/hooks/use-my-bookings';
import { useTheme } from '@/hooks/use-theme';
import { isDateOnOrAfterToday, startOfToday } from '@/lib/date-format';
import { fetchOtherClientSessionIsoDates } from '@/lib/supabase/booking-occupied-dates';
import { createEmptyBookingForm, type BookingFormData } from '@/types/client';
import { PROJECT_CATEGORIES, PROJECT_TYPES } from '@/types/project';

export default function ClientBookingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addBooking } = useBookings();
  const myBookings = useMyPipelineBookings();
  const [bookingForOthers, setBookingForOthers] = useState(false);
  const [form, setForm] = useState<BookingFormData>(createEmptyBookingForm());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    if (!bookingForOthers && user?.displayName) {
      setForm((prev) => ({ ...prev, artistName: user.displayName }));
    }
  }, [user?.displayName, bookingForOthers]);

  const update = <K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBookingForOthers = (enabled: boolean) => {
    setBookingForOthers(enabled);
    if (!enabled && user?.displayName) {
      setForm((prev) => ({ ...prev, artistName: user.displayName }));
    }
  };

  const handleBook = async () => {
    setSuccess('');
    if (!user?.clientId || !user.displayName) return;

    const artistName = bookingForOthers ? form.artistName : user.displayName;
    if (!artistName.trim()) {
      Alert.alert('Missing info', 'Please enter an artist or band name.');
      return;
    }
    if (!form.projectName.trim()) {
      Alert.alert('Missing info', 'Please enter a project name.');
      return;
    }
    if (!form.preferredDate.trim()) {
      Alert.alert('Missing info', 'Please enter your preferred session date.');
      return;
    }
    if (!isDateOnOrAfterToday(form.preferredDate)) {
      Alert.alert('Invalid date', 'Please choose today or a future date for your session.');
      return;
    }

    try {
      const occupiedDates = await fetchOtherClientSessionIsoDates();
      if (isOccupiedSessionDate(form.preferredDate, occupiedDates)) {
        Alert.alert(
          'Date unavailable',
          'Another client already has a session on this date. Please choose a different date.',
        );
        return;
      }
    } catch {
      // Availability check is best-effort if RPC is not deployed yet.
    }

    setSubmitting(true);
    try {
      await addBooking(
        { id: user.clientId, fullName: user.displayName, email: user.username },
        { ...form, artistName },
      );
      setBookingForOthers(false);
      setForm({ ...createEmptyBookingForm(), artistName: user.displayName });
      setShowBookingForm(false);
      setSuccess('Your recording session request has been submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.three,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="subtitle" style={styles.title}>
        My Booking
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Request a new session or manage your existing bookings.
      </ThemedText>

      {success && !showBookingForm ? (
        <ThemedText type="small" style={{ color: theme.success }}>
          {success}
        </ThemedText>
      ) : null}

      {!showBookingForm ? (
        <PrimaryButton
          label="Book A Recording"
          onPress={() => {
            setSuccess('');
            setShowBookingForm(true);
          }}
        />
      ) : null}

      {showBookingForm ? (
        <ThemedView style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Session Details
          </ThemedText>

          <FormField
            label="Artist / Band Name"
            value={bookingForOthers ? form.artistName : (user?.displayName ?? form.artistName)}
            onChangeText={(v) => {
              if (bookingForOthers) update('artistName', v);
            }}
            placeholder="Who will be recording?"
            editable={bookingForOthers}
          />
          <View style={styles.switchRow}>
            <ThemedText type="smallBold">Booking for someone else</ThemedText>
            <Switch
              value={bookingForOthers}
              onValueChange={handleBookingForOthers}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          <FormField
            label="Project Name"
            value={form.projectName}
            onChangeText={(v) => update('projectName', v)}
            placeholder="e.g. Summer Single, Album Track 3"
          />
          <SelectField
            label="Project Type"
            options={PROJECT_TYPES}
            value={form.projectType}
            onChange={(v) => update('projectType', v)}
          />
          <SelectField
            label="Project Category"
            options={PROJECT_CATEGORIES}
            value={form.projectCategory}
            onChange={(v) => update('projectCategory', v)}
          />
          <SessionDateField
            label="Preferred Date"
            value={form.preferredDate}
            onChange={(v) => update('preferredDate', v)}
            minimumDate={startOfToday()}
          />
          <FormField
            label="Notes (optional)"
            value={form.notes}
            onChangeText={(v) => update('notes', v)}
            placeholder="Session goals, duration, references…"
            multiline
            style={styles.notesInput}
          />

          <View style={styles.formActions}>
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              onPress={() => setShowBookingForm(false)}
              style={styles.formActionButton}
            />
            <PrimaryButton
              label={submitting ? 'Submitting…' : 'Request Booking'}
              onPress={handleBook}
              disabled={submitting}
              style={styles.formActionButton}
            />
          </View>
        </ThemedView>
      ) : null}

      <ThemedView style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          My Bookings
        </ThemedText>
        <ClientBookingList
          bookings={myBookings}
          emptyMessage="No active bookings. Once the studio confirms your advance payment, your project will appear under My Projects."
        />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    marginBottom: Spacing.one,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  formActionButton: {
    flex: 1,
  },
});
