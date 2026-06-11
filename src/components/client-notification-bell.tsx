import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabeledCurrencyRow } from '@/components/labeled-currency-row';
import { PayAdvanceModal } from '@/components/pay-advance-modal';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { dropdownPanelShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useBookings } from '@/context/bookings-context';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { resolveProjectAdvancePayment } from '@/lib/booking-to-project';
import { useNewNotificationAlert } from '@/hooks/use-new-notification-alert';
import {
  loadReadNotificationKeys,
  markNotificationKeysRead,
} from '@/lib/notification-storage';
import { unlockNotificationAudio } from '@/lib/notification-sound';
import {
  getClientBalanceDueAmount,
  hasPendingDateChange,
  isStudioRegisteredProjectNotification,
  studioRegisteredProjectNotificationKey,
  type RecordingBooking,
} from '@/types/client';
import {
  formatCurrency,
  getProductionStatusLabel,
  getProductionStatusNotificationKey,
  isProjectBalancePaid,
  shouldNotifyClientOfProductionStatus,
  type Project,
} from '@/types/project';

function clientBookingNotificationKey(booking: Pick<RecordingBooking, 'id' | 'status'>) {
  return `booking:${booking.id}:${booking.status}`;
}

function clientBalanceNotificationKey(project: Pick<Project, 'id' | 'balancePaidAt' | 'updatedAt'>) {
  return `balance:${project.id}:${project.balancePaidAt ?? project.updatedAt}`;
}

function clientDateChangeNotificationKey(
  booking: Pick<RecordingBooking, 'id' | 'proposedDate' | 'proposedDateStatus'>,
) {
  return `date_change:${booking.id}:${booking.proposedDate}:${booking.proposedDateStatus}`;
}

export function ClientNotificationBell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isSigningOut } = useAuth();
  const { bookings, refreshBookings, acceptProposedDate, rejectProposedDate } = useBookings();
  const { projects, refreshProjects } = useProjects();
  const [open, setOpen] = useState(false);
  const [payAdvanceBooking, setPayAdvanceBooking] = useState<RecordingBooking | null>(null);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const [readKeysLoaded, setReadKeysLoaded] = useState(false);

  const notifiableBookings = useMemo(() => {
    if (!user?.clientId) return [];
    return bookings.filter(
      (booking) =>
        booking.clientId === user.clientId &&
        (booking.status === 'pending' || booking.status === 'awaiting_advance') &&
        !hasPendingDateChange(booking),
    );
  }, [bookings, user?.clientId]);

  const pendingDateChangeBookings = useMemo(() => {
    if (!user?.clientId) return [];
    return bookings.filter(
      (booking) => booking.clientId === user.clientId && hasPendingDateChange(booking),
    );
  }, [bookings, user?.clientId]);

  const studioRegisteredBookings = useMemo(() => {
    if (!user?.clientId) return [];
    return bookings.filter(
      (booking) =>
        booking.clientId === user.clientId && isStudioRegisteredProjectNotification(booking),
    );
  }, [bookings, user?.clientId]);

  const clientProductionProjects = useMemo(() => {
    if (!user?.clientId) return [];

    return projects.filter(
      (project) =>
        shouldNotifyClientOfProductionStatus(project.productionStatus) &&
        bookings.some(
          (booking) =>
            booking.clientId === user.clientId &&
            booking.projectId === project.id &&
            (booking.status === 'confirmed' || booking.status === 'completed'),
        ),
    );
  }, [projects, bookings, user?.clientId]);

  const paidBalanceProjects = useMemo(() => {
    if (!user?.clientId) return [];

    return projects
      .map((project) => {
        const booking = bookings.find((item) => item.projectId === project.id);
        const resolved = resolveProjectAdvancePayment(project, booking);
        if (!isProjectBalancePaid(resolved)) return null;
        return { project: resolved, booking };
      })
      .filter((item): item is { project: Project; booking: RecordingBooking | undefined } =>
        Boolean(item),
      );
  }, [projects, bookings, user?.clientId]);

  const unreadBookings = useMemo(
    () =>
      notifiableBookings.filter(
        (booking) => !readKeys.has(clientBookingNotificationKey(booking)),
      ),
    [notifiableBookings, readKeys],
  );

  const unreadPaidBalanceProjects = useMemo(
    () =>
      paidBalanceProjects.filter(
        ({ project }) => !readKeys.has(clientBalanceNotificationKey(project)),
      ),
    [paidBalanceProjects, readKeys],
  );

  const unreadDateChangeBookings = useMemo(
    () =>
      pendingDateChangeBookings.filter(
        (booking) => !readKeys.has(clientDateChangeNotificationKey(booking)),
      ),
    [pendingDateChangeBookings, readKeys],
  );

  const unreadStudioRegisteredBookings = useMemo(
    () =>
      studioRegisteredBookings.filter(
        (booking) => !readKeys.has(studioRegisteredProjectNotificationKey(booking)),
      ),
    [studioRegisteredBookings, readKeys],
  );

  const unreadProductionProjects = useMemo(
    () =>
      clientProductionProjects.filter(
        (project) => !readKeys.has(getProductionStatusNotificationKey(project)),
      ),
    [clientProductionProjects, readKeys],
  );

  const unreadSignature = useMemo(
    () =>
      [
        ...unreadBookings.map((booking) => clientBookingNotificationKey(booking)),
        ...unreadPaidBalanceProjects.map(({ project }) => clientBalanceNotificationKey(project)),
        ...unreadDateChangeBookings.map((booking) => clientDateChangeNotificationKey(booking)),
        ...unreadStudioRegisteredBookings.map((booking) =>
          studioRegisteredProjectNotificationKey(booking),
        ),
        ...unreadProductionProjects.map((project) => getProductionStatusNotificationKey(project)),
      ].join('|'),
    [
      unreadBookings,
      unreadPaidBalanceProjects,
      unreadDateChangeBookings,
      unreadStudioRegisteredBookings,
      unreadProductionProjects,
    ],
  );

  const unreadCount =
    unreadBookings.length +
    unreadPaidBalanceProjects.length +
    unreadDateChangeBookings.length +
    unreadStudioRegisteredBookings.length +
    unreadProductionProjects.length;

  useEffect(() => {
    if (user?.role !== 'client' || isSigningOut) {
      setReadKeysLoaded(false);
      return;
    }

    setReadKeysLoaded(false);
    void loadReadNotificationKeys('client').then((keys) => {
      setReadKeys(keys);
      setReadKeysLoaded(true);
    });
  }, [user?.role, isSigningOut]);

  const refreshClientData = useCallback(() => {
    void refreshBookings();
    void refreshProjects();
  }, [refreshBookings, refreshProjects]);

  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'client' && !isSigningOut) {
        refreshClientData();
      }
    }, [refreshClientData, user?.role, isSigningOut]),
  );

  useEffect(() => {
    if (user?.role !== 'client' || isSigningOut) return;

    refreshClientData();
    const interval = setInterval(refreshClientData, 2000);

    return () => clearInterval(interval);
  }, [refreshClientData, user?.role, isSigningOut]);

  useNewNotificationAlert({
    enabled: user?.role === 'client' && !isSigningOut,
    ready: readKeysLoaded,
    unreadKeySignature: unreadSignature,
    onNewAlert: () => {
      setOpen(true);
    },
  });

  const markCurrentAsRead = useCallback(async () => {
    if (user?.role !== 'client') return;

    const keys = [
      ...notifiableBookings.map((booking) => clientBookingNotificationKey(booking)),
      ...paidBalanceProjects.map(({ project }) => clientBalanceNotificationKey(project)),
      ...pendingDateChangeBookings.map((booking) => clientDateChangeNotificationKey(booking)),
      ...studioRegisteredBookings.map((booking) => studioRegisteredProjectNotificationKey(booking)),
      ...clientProductionProjects.map((project) => getProductionStatusNotificationKey(project)),
    ];
    if (keys.length === 0) return;

    const next = await markNotificationKeysRead('client', keys);
    setReadKeys(next);
  }, [
    clientProductionProjects,
    notifiableBookings,
    paidBalanceProjects,
    pendingDateChangeBookings,
    studioRegisteredBookings,
    user?.role,
  ]);

  if (user?.role !== 'client' || isSigningOut) {
    return null;
  }

  const closePanel = () => {
    setOpen(false);
    void markCurrentAsRead();
  };

  const openPanel = () => {
    unlockNotificationAudio();
    refreshClientData();
    setOpen(true);
  };

  const handlePayAdvance = (booking: RecordingBooking) => {
    setOpen(false);
    setPayAdvanceBooking(booking);
  };

  return (
    <>
      <View style={styles.bellWrap}>
        <Pressable
          onPress={openPanel}
          onPressIn={unlockNotificationAudio}
          style={({ pressed }) => [
            styles.bellButton,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadCount} unread updates`}>
          <SymbolView
            name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            size={20}
            tintColor={theme.text}
          />
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.background }]}>
              <ThemedText type="small" style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closePanel}>
        <Pressable style={styles.overlay} onPress={closePanel}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.panel,
              {
                top: insets.top + Spacing.two + 48,
                right: Spacing.four,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.panelTitle}>
              Updates
            </ThemedText>
            {notifiableBookings.length +
              paidBalanceProjects.length +
              pendingDateChangeBookings.length +
              unreadStudioRegisteredBookings.length +
              clientProductionProjects.length ===
            0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No updates right now.
              </ThemedText>
            ) : (
              <ScrollView style={styles.list} nestedScrollEnabled>
                {pendingDateChangeBookings.map((booking) => (
                  <DateChangeNotificationItem
                    key={booking.id}
                    booking={booking}
                    borderColor={theme.border}
                    clientId={user.clientId}
                    onAccept={acceptProposedDate}
                    onReject={rejectProposedDate}
                  />
                ))}
                {unreadStudioRegisteredBookings.map((booking) => (
                  <StudioRegisteredProjectNotificationItem
                    key={studioRegisteredProjectNotificationKey(booking)}
                    booking={booking}
                    borderColor={theme.border}
                  />
                ))}
                {unreadProductionProjects.map((project) => (
                  <ProductionStatusNotificationItem
                    key={getProductionStatusNotificationKey(project)}
                    project={project}
                    borderColor={theme.border}
                  />
                ))}
                {paidBalanceProjects.map(({ project, booking }) => (
                  <BalancePaidNotificationItem
                    key={project.id}
                    project={project}
                    booking={booking}
                    borderColor={theme.border}
                  />
                ))}
                {notifiableBookings.map((booking) => (
                  <ClientNotificationItem
                    key={booking.id}
                    booking={booking}
                    borderColor={theme.border}
                    onPayAdvance={handlePayAdvance}
                  />
                ))}
              </ScrollView>
            )}
            <Pressable onPress={closePanel}>
              <ThemedText type="linkPrimary" style={styles.viewAll}>
                View my bookings below
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {payAdvanceBooking ? (
        <PayAdvanceModal
          visible
          booking={payAdvanceBooking}
          onClose={() => setPayAdvanceBooking(null)}
        />
      ) : null}
    </>
  );
}

function DateChangeNotificationItem({
  booking,
  borderColor,
  clientId,
  onAccept,
  onReject,
}: {
  booking: RecordingBooking;
  borderColor: string;
  clientId?: string;
  onAccept: (
    id: string,
    options?: { clientId?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  onReject: (
    id: string,
    options?: { clientId?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const theme = useTheme();
  const [responding, setResponding] = useState(false);

  const handleAccept = async () => {
    setResponding(true);
    try {
      const result = await onAccept(booking.id, { clientId });
      if (!result.ok) {
        Alert.alert('Unable to accept date', result.error ?? 'Please try again.');
      }
    } finally {
      setResponding(false);
    }
  };

  const handleReject = async () => {
    setResponding(true);
    try {
      const result = await onReject(booking.id, { clientId });
      if (!result.ok) {
        Alert.alert('Unable to decline date', result.error ?? 'Please try again.');
      }
    } finally {
      setResponding(false);
    }
  };

  return (
    <View style={[styles.item, { borderBottomColor: borderColor }]}>
      <ThemedText type="smallBold">{booking.artistName}</ThemedText>
      <ThemedText type="small" style={{ color: theme.info }}>
        The studio proposed a new session date.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Your date: {booking.preferredDate || '—'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Proposed: {booking.proposedDate || '—'}
      </ThemedText>
      <View style={styles.dateChangeActions}>
        <PrimaryButton
          label={responding ? 'Accepting…' : 'Accept Date'}
          onPress={handleAccept}
          disabled={responding}
          style={styles.dateChangeActionButton}
        />
        <PrimaryButton
          label="Decline"
          onPress={handleReject}
          variant="danger"
          disabled={responding}
          style={styles.dateChangeActionButton}
        />
      </View>
    </View>
  );
}

function StudioRegisteredProjectNotificationItem({
  booking,
  borderColor,
}: {
  booking: RecordingBooking;
  borderColor: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.item, { borderBottomColor: borderColor }]}>
      <ThemedText type="smallBold">{booking.projectName || booking.artistName}</ThemedText>
      <ThemedText type="small" style={{ color: theme.info }}>
        GroovX registered a new project under your account.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {booking.projectType} · {booking.projectCategory}
      </ThemedText>
      {booking.projectAmount != null && booking.projectAmount > 0 ? (
        <LabeledCurrencyRow label="Project amount:" amount={booking.projectAmount} />
      ) : null}
    </View>
  );
}

function ProductionStatusNotificationItem({
  project,
  borderColor,
}: {
  project: Project;
  borderColor: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.item, { borderBottomColor: borderColor }]}>
      <ThemedText type="smallBold">{project.projectName}</ThemedText>
      <ThemedText type="small" style={{ color: theme.info }}>
        Production status updated: {getProductionStatusLabel(project.productionStatus)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Artist: {project.artistName}
      </ThemedText>
    </View>
  );
}

function BalancePaidNotificationItem({
  project,
  booking,
  borderColor,
}: {
  project: Project;
  booking?: RecordingBooking;
  borderColor: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.item, { borderBottomColor: borderColor }]}>
      <ThemedText type="smallBold">{project.projectName}</ThemedText>
      <ThemedText type="small" style={{ color: theme.warning }}>
        Studio confirmed your balance payment.
      </ThemedText>
      <LabeledCurrencyRow
        label="Remaining balance:"
        amount={getClientBalanceDueAmount(project, booking)}
        color={theme.warning}
        showPrefix={!isProjectBalancePaid(project)}
      />
    </View>
  );
}

function ClientNotificationItem({
  booking,
  borderColor,
  onPayAdvance,
}: {
  booking: RecordingBooking;
  borderColor: string;
  onPayAdvance: (booking: RecordingBooking) => void;
}) {
  const theme = useTheme();
  const isAwaitingAdvance = booking.status === 'awaiting_advance';

  return (
    <View style={[styles.item, { borderBottomColor: borderColor }]}>
      <ThemedText type="smallBold">{booking.artistName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {booking.projectType} · {booking.projectCategory}
      </ThemedText>
      {isAwaitingAdvance ? (
        <>
          <ThemedText type="small" style={{ color: theme.info }}>
            Studio sent a quote. Pay the advance to start your project.
          </ThemedText>
          {booking.requiredAdvance != null && booking.requiredAdvance > 0 ? (
            <LabeledCurrencyRow label="Required advance:" amount={booking.requiredAdvance} />
          ) : null}
          <PrimaryButton
            label={`Pay Advance (${formatCurrency(booking.requiredAdvance ?? 0)})`}
            onPress={() => onPayAdvance(booking)}
          />
        </>
      ) : (
        <>
          <ThemedText type="small" style={{ color: theme.warning }}>
            Your booking request was submitted successfully.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            The studio is reviewing your request and will send a quote soon.
          </ThemedText>
        </>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Preferred: {booking.preferredDate || '—'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bellWrap: {
    overflow: 'visible',
  },
  bellButton: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    zIndex: 10,
    elevation: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  panel: {
    position: 'absolute',
    width: 320,
    maxHeight: 420,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    ...dropdownPanelShadow,
  },
  panelTitle: {
    marginBottom: Spacing.half,
  },
  empty: {
    paddingVertical: Spacing.two,
  },
  list: {
    maxHeight: 300,
  },
  item: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  viewAll: {
    alignSelf: 'flex-start',
  },
  dateChangeActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
  dateChangeActionButton: {
    flex: 1,
  },
});
