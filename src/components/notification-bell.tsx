import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { dropdownPanelShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useBookings } from '@/context/bookings-context';
import { useTheme } from '@/hooks/use-theme';
import { useNewNotificationAlert } from '@/hooks/use-new-notification-alert';
import {
  loadReadNotificationKeys,
  markNotificationKeysRead,
} from '@/lib/notification-storage';
import { unlockNotificationAudio } from '@/lib/notification-sound';
import { isStudioRole } from '@/lib/roles';
import { formatCurrency } from '@/types/project';
import type { RecordingBooking } from '@/types/client';

function bookingNotificationKey(booking: Pick<RecordingBooking, 'id' | 'status'>) {
  return `${booking.id}:${booking.status}`;
}

export function NotificationBell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isSigningOut } = useAuth();
  const { bookings, refreshBookings } = useBookings();
  const [open, setOpen] = useState(false);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const [readKeysLoaded, setReadKeysLoaded] = useState(false);

  const notifiableBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === 'pending' || booking.status === 'awaiting_confirmation',
      ),
    [bookings],
  );

  const unreadBookings = useMemo(
    () => notifiableBookings.filter((booking) => !readKeys.has(bookingNotificationKey(booking))),
    [notifiableBookings, readKeys],
  );

  const unreadSignature = useMemo(
    () => unreadBookings.map((booking) => bookingNotificationKey(booking)).join('|'),
    [unreadBookings],
  );

  useEffect(() => {
    if (!isStudioRole(user?.role) || isSigningOut) {
      setReadKeysLoaded(false);
      return;
    }

    setReadKeysLoaded(false);
    void loadReadNotificationKeys('admin').then((keys) => {
      setReadKeys(keys);
      setReadKeysLoaded(true);
    });
  }, [user?.role, isSigningOut]);

  useFocusEffect(
    useCallback(() => {
      if (isStudioRole(user?.role) && !isSigningOut) {
        void refreshBookings();
      }
    }, [refreshBookings, user?.role, isSigningOut]),
  );

  useEffect(() => {
    if (!isStudioRole(user?.role) || isSigningOut) return;

    void refreshBookings();
    const interval = setInterval(() => {
      void refreshBookings();
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshBookings, user?.role, isSigningOut]);

  useNewNotificationAlert({
    enabled: isStudioRole(user?.role) && !isSigningOut,
    ready: readKeysLoaded,
    unreadKeySignature: unreadSignature,
    onNewAlert: () => {
      setOpen(true);
    },
  });

  const markCurrentAsRead = useCallback(async () => {
    if (!isStudioRole(user?.role)) return;

    const keys = notifiableBookings.map((booking) => bookingNotificationKey(booking));
    if (keys.length === 0) return;

    const next = await markNotificationKeysRead('admin', keys);
    setReadKeys(next);
  }, [notifiableBookings, user?.role]);

  if (!isStudioRole(user?.role) || isSigningOut) {
    return null;
  }

  const unreadCount = unreadBookings.length;

  const closePanel = () => {
    setOpen(false);
    void markCurrentAsRead();
  };

  const openPanel = () => {
    unlockNotificationAudio();
    void refreshBookings();
    setOpen(true);
  };

  const goToBookings = () => {
    setOpen(false);
    router.push('/(tabs)/bookings');
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
          accessibilityLabel={`Notifications, ${unreadCount} unread booking updates`}>
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
              Booking Updates{unreadCount > 0 ? ` (${unreadCount} new)` : ''}
            </ThemedText>
            {notifiableBookings.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No booking updates right now.
              </ThemedText>
            ) : (
              <ScrollView style={styles.list} nestedScrollEnabled>
                {notifiableBookings.map((booking) => (
                  <NotificationItem
                    key={booking.id}
                    booking={booking}
                    unread={!readKeys.has(bookingNotificationKey(booking))}
                    onPress={goToBookings}
                    borderColor={theme.border}
                    pressedColor={theme.backgroundSelected}
                    accentColor={theme.accent}
                  />
                ))}
              </ScrollView>
            )}
            <Pressable onPress={goToBookings}>
              <ThemedText type="linkPrimary" style={styles.viewAll}>
                View client bookings
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function NotificationItem({
  booking,
  unread,
  onPress,
  borderColor,
  pressedColor,
  accentColor,
}: {
  booking: RecordingBooking;
  unread: boolean;
  onPress: () => void;
  borderColor: string;
  pressedColor: string;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          borderBottomColor: borderColor,
          backgroundColor: pressed ? pressedColor : 'transparent',
        },
      ]}>
      <View style={styles.itemTitleRow}>
        <ThemedText type="smallBold">{booking.artistName}</ThemedText>
        {unread ? <View style={[styles.unreadDot, { backgroundColor: accentColor }]} /> : null}
      </View>
      {booking.status === 'awaiting_confirmation' ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {booking.clientName} submitted advance payment
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Amount: {formatCurrency(booking.requiredAdvance ?? 0)} · Verify and confirm
          </ThemedText>
        </>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {booking.clientName} requested a {booking.projectType} session
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Preferred: {booking.preferredDate || '—'}
          </ThemedText>
        </>
      )}
    </Pressable>
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
    maxHeight: 380,
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
    maxHeight: 260,
  },
  item: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  viewAll: {
    alignSelf: 'flex-start',
  },
});
