import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClientProfileModal } from '@/components/client-profile-modal';
import { DateField } from '@/components/date-field';
import { CurrencyField } from '@/components/currency-field';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import {
  createProjectFromBooking,
  isAdminActiveBookingRequest,
  startProjectFromBooking,
  syncRegisteredBookingsToCompleted,
} from '@/lib/booking-to-project';
import { startOfToday } from '@/lib/date-format';
import { syncBookingProjectAdvance } from '@/lib/sync-project-advance';
import {
  canAdminSendQuote,
  getBookingRemainingBalance,
  getBookingStatusLabel,
  getClientProjectTypeLabel,
  hasPendingDateChange,
  hasSubmittedProjectDetails,
  wasDateChangeRejected,
  type RecordingBooking,
} from '@/types/client';
import { formatCurrency } from '@/types/project';

export default function ClientBookingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { projects, addProject, refreshProjects } = useProjects();
  const {
    bookings,
    updateBookingStatus,
    setBookingQuote,
    updatePreferredDate,
    confirmPayment,
    refreshBookings,
  } = useBookings();
  const [profileClientId, setProfileClientId] = useState<string | null>(null);
  const [profileFallback, setProfileFallback] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const handleViewProfile = (booking: RecordingBooking) => {
    setProfileClientId(booking.clientId);
    setProfileFallback({ name: booking.clientName, email: booking.clientEmail });
  };

  const handleConfirmPayment = async (booking: RecordingBooking) => {
    let projectId = booking.projectId;
    if (!projectId) {
      projectId = (await addProject(createProjectFromBooking(booking), booking.id)).id;
    } else {
      await syncBookingProjectAdvance(booking, projectId);
    }

    const result = await confirmPayment(booking.id, projectId);
    await refreshProjects();
    return result;
  };

  useFocusEffect(
    useCallback(() => {
      void refreshProjects();
      void refreshBookings();
    }, [refreshBookings, refreshProjects]),
  );

  const registeredSyncKeyRef = useRef('');
  useEffect(() => {
    if (projects.length === 0) return;

    const syncKey = bookings
      .map((booking) => `${booking.id}:${booking.status}:${booking.projectId ?? ''}`)
      .join('|');
    if (registeredSyncKeyRef.current === syncKey) return;
    registeredSyncKeyRef.current = syncKey;

    let active = true;
    void syncRegisteredBookingsToCompleted(bookings, projects).then(async () => {
      if (!active) return;
      await refreshBookings();
    });

    return () => {
      active = false;
    };
  }, [bookings, projects, refreshBookings]);

  const activeBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const project = booking.projectId
          ? projects.find((item) => item.id === booking.projectId)
          : undefined;
        return isAdminActiveBookingRequest(booking, project);
      }),
    [bookings, projects],
  );

  const handleStartProject = async (booking: RecordingBooking) => {
    try {
      const project = await startProjectFromBooking(booking, addProject);
      await Promise.all([refreshProjects(), refreshBookings()]);
      router.push(`/project/${project.id}`);
    } catch {
      Alert.alert('Unable to start project', 'Please try again.');
    }
  };

  const handleCreateInvoice = (booking: RecordingBooking) => {
    if (!booking.projectId) {
      Alert.alert('Invoice unavailable', 'No project is linked to this booking yet.');
      return;
    }
    router.push(`/invoice/${booking.projectId}`);
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
      ]}>
      <ThemedText type="subtitle" style={styles.title}>
        Client Booking
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Review client session requests, send quotes, and confirm advance payments.
      </ThemedText>

      <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Client Booking Requests
        </ThemedText>
        {activeBookings.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No active client booking requests. Completed bookings appear in Projects.
          </ThemedText>
        ) : (
          activeBookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              onQuote={setBookingQuote}
              onUpdatePreferredDate={updatePreferredDate}
              onConfirmPayment={handleConfirmPayment}
              onViewProfile={handleViewProfile}
              onCreateInvoice={handleCreateInvoice}
              onComplete={() => handleStartProject(booking)}
              onCancel={() => updateBookingStatus(booking.id, 'cancelled')}
            />
          ))
        )}
      </ThemedView>

      <ClientProfileModal
        visible={profileClientId != null}
        clientId={profileClientId}
        fallbackName={profileFallback?.name}
        fallbackEmail={profileFallback?.email}
        onClose={() => {
          setProfileClientId(null);
          setProfileFallback(null);
        }}
      />
    </ScrollView>
  );
}

function BookingRow({
  booking,
  onQuote,
  onUpdatePreferredDate,
  onConfirmPayment,
  onViewProfile,
  onCreateInvoice,
  onComplete,
  onCancel,
}: {
  booking: RecordingBooking;
  onQuote: (
    id: string,
    projectAmount: number,
    requiredAdvance: number,
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdatePreferredDate: (
    id: string,
    preferredDate: string,
  ) => Promise<{ ok: boolean; error?: string; booking?: RecordingBooking }>;
  onConfirmPayment: (booking: RecordingBooking) => Promise<{ ok: boolean; error?: string }>;
  onViewProfile: (booking: RecordingBooking) => void;
  onCreateInvoice: (booking: RecordingBooking) => void;
  onComplete: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const statusColor = getBookingStatusColor(booking.status, theme);
  const canEditPreferredDate =
    booking.status !== 'cancelled' && booking.status !== 'completed';
  const [projectAmount, setProjectAmount] = useState(booking.projectAmount ?? 0);
  const [requiredAdvance, setRequiredAdvance] = useState(booking.requiredAdvance ?? 0);
  const [preferredDate, setPreferredDate] = useState(booking.preferredDate);
  const [editingDate, setEditingDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  const awaitingClientDateApproval = hasPendingDateChange(booking);
  const dateChangeRejected = wasDateChangeRejected(booking);
  const sendQuoteDisabled =
    submitting || savingDate || (booking.status === 'pending' && !canAdminSendQuote(booking));

  useEffect(() => {
    setPreferredDate(booking.proposedDate?.trim() || booking.preferredDate);
    setEditingDate(false);
  }, [booking.id, booking.preferredDate, booking.proposedDate, booking.proposedDateStatus]);

  const handleSendQuote = async () => {
    setSubmitting(true);
    try {
      const result = await onQuote(booking.id, projectAmount, requiredAdvance);
      if (!result.ok) {
        Alert.alert('Unable to send quote', result.error ?? 'Please check the amounts and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePreferredDate = async () => {
    setSavingDate(true);
    try {
      const result = await onUpdatePreferredDate(booking.id, preferredDate);
      if (!result.ok) {
        Alert.alert('Unable to update date', result.error ?? 'Please try again.');
        return;
      }
      setEditingDate(false);
      if (
        booking.status === 'pending' &&
        result.booking &&
        hasPendingDateChange(result.booking)
      ) {
        Alert.alert(
          'Date sent to client',
          'The client has been notified and must accept the new session date before you can send a quote.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Unable to update date',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSavingDate(false);
    }
  };

  const handleCancelDateEdit = () => {
    setPreferredDate(booking.proposedDate?.trim() || booking.preferredDate);
    setEditingDate(false);
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    try {
      const result = await onConfirmPayment(booking);
      if (!result.ok) {
        Alert.alert('Unable to confirm payment', result.error ?? 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = getBookingStatusLabel(booking.status);

  return (
    <View style={[styles.bookingCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <View style={styles.row}>
        <ThemedText type="smallBold">{booking.artistName}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <ThemedText type="small" style={{ color: '#FFFFFF', textTransform: 'capitalize' }}>
            {statusLabel}
          </ThemedText>
        </View>
      </View>
      <View style={styles.clientRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {booking.clientName} · {booking.clientEmail}
        </ThemedText>
        <Pressable onPress={() => onViewProfile(booking)} accessibilityRole="button">
          <ThemedText type="linkPrimary" style={styles.profileLink}>
            View Profile
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {booking.projectType} · {booking.projectCategory}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Client preferred: {booking.preferredDate || '—'}
      </ThemedText>
      {awaitingClientDateApproval && booking.proposedDate ? (
        <ThemedText type="small" style={{ color: theme.info }}>
          Proposed session date: {booking.proposedDate} · Awaiting client approval
        </ThemedText>
      ) : null}
      {dateChangeRejected && booking.proposedDate ? (
        <ThemedText type="small" style={{ color: theme.warning }}>
          Client declined proposed date: {booking.proposedDate}
        </ThemedText>
      ) : null}
      {editingDate && canEditPreferredDate ? (
        <View style={styles.dateSection}>
          <DateField
            label="New Session Date"
            value={preferredDate}
            onChange={setPreferredDate}
            minimumDate={startOfToday()}
          />
          <View style={styles.bookingActions}>
            <PrimaryButton
              label={savingDate ? 'Saving…' : 'Save Date'}
              onPress={handleSavePreferredDate}
              disabled={savingDate || submitting}
              style={styles.bookingActionButton}
            />
            <PrimaryButton
              label="Cancel"
              onPress={handleCancelDateEdit}
              variant="secondary"
              disabled={savingDate}
              style={styles.bookingActionButton}
            />
          </View>
        </View>
      ) : null}

      {booking.status === 'cancelled' && booking.cancellationReason ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          Cancellation reason: {booking.cancellationReason}
        </ThemedText>
      ) : null}

      {booking.projectAmount != null && booking.projectAmount > 0 ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Project amount: {formatCurrency(booking.projectAmount)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Required advance: {formatCurrency(booking.requiredAdvance ?? 0)}
          </ThemedText>
          {booking.advancePaid != null && booking.advancePaid > 0 ? (
            <ThemedText type="small" style={{ color: theme.success }}>
              Advance paid: {formatCurrency(booking.advancePaid)}
            </ThemedText>
          ) : null}
          <ThemedText
            type="small"
            style={{
              color:
                getBookingRemainingBalance(booking) > 0 ? theme.warning : theme.success,
            }}>
            Remaining balance: {formatCurrency(getBookingRemainingBalance(booking))}
          </ThemedText>
          {booking.paymentScreenshotUri ? (
            <View style={styles.screenshotSection}>
              <ThemedText type="smallBold">Payment Screenshot</ThemedText>
              <Image
                source={{ uri: booking.paymentScreenshotUri }}
                style={styles.paymentScreenshot}
                contentFit="contain"
              />
            </View>
          ) : null}
        </>
      ) : null}

      {booking.status === 'pending' ? (
        <View style={styles.quoteForm}>
          <CurrencyField
            label="Project Amount (Nu.)"
            value={projectAmount}
            onChangeValue={setProjectAmount}
            placeholder="Nu. 12,000.00"
          />
          <CurrencyField
            label="Required Advance Payment (Nu.)"
            value={requiredAdvance}
            onChangeValue={setRequiredAdvance}
            placeholder="Nu. 6,000.00"
            hint="Client must pay this advance to start the project."
          />
          {awaitingClientDateApproval ? (
            <ThemedText type="small" themeColor="textSecondary">
              Send Quote stays disabled until the client accepts the new session date.
            </ThemedText>
          ) : null}
          <View style={styles.bookingActions}>
            <PrimaryButton
              label={submitting ? 'Sending…' : 'Send Quote to Client'}
              onPress={handleSendQuote}
              disabled={sendQuoteDisabled}
              style={styles.bookingActionButton}
            />
            <PrimaryButton
              label={editingDate ? 'Hide Date' : 'Change Date'}
              onPress={() => setEditingDate((open) => !open)}
              variant="secondary"
              disabled={submitting || savingDate}
              style={styles.bookingActionButton}
            />
            <PrimaryButton
              label="Cancel"
              onPress={onCancel}
              variant="danger"
              disabled={submitting || savingDate}
              style={styles.bookingActionButton}
            />
          </View>
        </View>
      ) : booking.status === 'awaiting_advance' ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Waiting for client to pay the advance before the project can start.
          </ThemedText>
          {canEditPreferredDate ? (
            <View style={styles.bookingActions}>
              <PrimaryButton
                label={editingDate ? 'Hide Date' : 'Change Date'}
                onPress={() => setEditingDate((open) => !open)}
                variant="secondary"
                style={styles.bookingActionButton}
              />
            </View>
          ) : null}
        </>
      ) : booking.status === 'awaiting_confirmation' ? (
        <>
          {hasSubmittedProjectDetails(booking) ? (
            <>
              <ThemedText type="smallBold">Client Project Details</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Project: {booking.projectName}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Artist: {booking.artistName}
              </ThemedText>
              {booking.producerName ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Producer: {booking.producerName}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {getClientProjectTypeLabel(booking.projectType)} · {booking.projectCategory}
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" style={{ color: theme.warning }}>
              Waiting for client to submit project details.
            </ThemedText>
          )}
          <View style={styles.bookingActions}>
            <PrimaryButton
              label={submitting ? 'Confirming…' : 'Confirm Payment'}
              onPress={handleConfirmPayment}
              disabled={submitting || savingDate}
              style={styles.bookingActionButton}
            />
            <PrimaryButton
              label={editingDate ? 'Hide Date' : 'Change Date'}
              onPress={() => setEditingDate((open) => !open)}
              variant="secondary"
              disabled={submitting || savingDate}
              style={styles.bookingActionButton}
            />
            <PrimaryButton
              label="Reject"
              onPress={onCancel}
              variant="danger"
              disabled={submitting || savingDate}
              style={styles.bookingActionButton}
            />
          </View>
        </>
      ) : booking.status === 'confirmed' ? (
        <View style={styles.bookingActions}>
          <PrimaryButton
            label="Create Invoice"
            onPress={() => onCreateInvoice(booking)}
            disabled={!booking.projectId || savingDate}
            style={styles.bookingActionButton}
          />
          <PrimaryButton
            label={editingDate ? 'Hide Date' : 'Change Date'}
            onPress={() => setEditingDate((open) => !open)}
            variant="secondary"
            disabled={submitting || savingDate}
            style={styles.bookingActionButton}
          />
          {booking.projectId ? (
            <PrimaryButton
              label="Open Project"
              onPress={() => router.push(`/project/${booking.projectId}`)}
              disabled={savingDate}
              style={styles.bookingActionButton}
            />
          ) : (
            <PrimaryButton
              label={submitting ? 'Starting…' : 'Start Project'}
              onPress={async () => {
                setSubmitting(true);
                try {
                  await onComplete();
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting || savingDate}
              style={styles.bookingActionButton}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

function getBookingStatusColor(
  status: string,
  theme: { warning: string; info: string; success: string; danger: string; textSecondary: string },
) {
  switch (status) {
    case 'pending':
      return theme.warning;
    case 'awaiting_advance':
      return theme.info;
    case 'awaiting_confirmation':
      return theme.warning;
    case 'confirmed':
      return theme.success;
    case 'completed':
      return theme.success;
    case 'cancelled':
      return theme.danger;
    default:
      return theme.textSecondary;
  }
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
  section: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  profileLink: {
    fontSize: 13,
  },
  bookingCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  statusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  bookingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  bookingActionButton: {
    flex: 1,
    minWidth: 140,
  },
  dateSection: {
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  quoteForm: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  screenshotSection: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  paymentScreenshot: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    backgroundColor: '#00000020',
  },
});
