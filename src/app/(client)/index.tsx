import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatValue } from '@/components/stat-value';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useProjects } from '@/context/projects-context';
import { useMyBookings, useMyPipelineBookings } from '@/hooks/use-my-bookings';
import { useTheme } from '@/hooks/use-theme';
import { resolveProjectAdvancePayment } from '@/lib/booking-to-project';
import { UserGreetingHeader } from '@/components/user-greeting-header';
import {
  getBookingStatusLabel,
  getClientBalanceDueAmount,
  getClientTotalAdvancePaid,
  isClientProjectPaymentPending,
} from '@/types/client';
export default function ClientDashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const statColumns = width >= 1100 ? 6 : width >= 720 ? 3 : 2;
  const useAndroidTwoRowStats = Platform.OS === 'android';
  const useHorizontalStats = statColumns === 2 && !useAndroidTwoRowStats;
  const myBookings = useMyBookings();
  const pipelineBookings = useMyPipelineBookings();
  const { projects, refreshProjects } = useProjects();
  const { bookings, refreshBookings } = useBookings();

  useFocusEffect(
    useCallback(() => {
      void refreshProjects();
      void refreshBookings();
    }, [refreshBookings, refreshProjects]),
  );

  const stats = useMemo(() => {
    const projectRows = projects.map((project) => {
      const booking = bookings.find((item) => item.projectId === project.id);
      const resolved = resolveProjectAdvancePayment(project, booking);
      const balanceDue = getClientBalanceDueAmount(resolved, booking);
      return { project: resolved, booking, balanceDue };
    });
    const pendingPaymentProjectIds = new Set(
      projectRows
        .filter((row) => isClientProjectPaymentPending(row.project))
        .map((row) => row.project.id),
    );
    const activeBookings = pipelineBookings.filter((booking) => booking.status !== 'cancelled');
    const pendingBookings = pipelineBookings.filter(
      (booking) =>
        booking.status === 'pending' ||
        booking.status === 'awaiting_advance' ||
        booking.status === 'awaiting_confirmation',
    );
    const advancePaid = getClientTotalAdvancePaid(myBookings, pendingPaymentProjectIds);
    const balanceDue = projectRows.reduce((sum, row) => sum + row.balanceDue, 0);
    const recentBookings = [...pipelineBookings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);

    return {
      activeProjects: pendingPaymentProjectIds.size,
      activeBookings: activeBookings.length,
      pendingBookings: pendingBookings.length,
      totalProjects: projects.length,
      advancePaid,
      balanceDue,
      recentBookings,
    };
  }, [myBookings, pipelineBookings, projects, bookings]);

  const statItems = [
    {
      label: 'Active Project',
      value: String(stats.activeProjects),
      tone: 'blue' as const,
      icon: { ios: 'music.note.house.fill', android: 'library_music', web: 'library_music' },
    },
    {
      label: 'Active Bookings',
      value: String(stats.activeBookings),
      tone: 'green' as const,
      icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    },
    {
      label: 'Pending Actions',
      value: String(stats.pendingBookings),
      tone: 'yellow' as const,
      icon: {
        ios: 'clock.badge.exclamationmark',
        android: 'pending_actions',
        web: 'pending_actions',
      },
    },
    {
      label: 'My Total Projects',
      value: String(stats.totalProjects),
      tone: 'purple' as const,
      icon: { ios: 'folder.fill', android: 'folder', web: 'folder' },
    },
    {
      label: 'Advance Paid',
      amount: stats.advancePaid,
      tone: 'cyan' as const,
      icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
    },
    {
      label: 'Balance Due',
      amount: stats.balanceDue,
      tone: 'red' as const,
      icon: { ios: 'creditcard.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' },
    },
  ];

  const statCards = statItems.map((item) => (
    <StatCard key={item.label} {...item} columns={statColumns} />
  ));

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
      <UserGreetingHeader />
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        My Dashboard · Your GroovX studio overview
      </ThemedText>

      {useAndroidTwoRowStats ? (
        <View style={styles.androidStatGrid}>
          <View style={styles.statRow}>
            {statItems.slice(0, 3).map((item) => (
              <StatCard key={item.label} {...item} columns={3} androidGrid />
            ))}
          </View>
          <View style={styles.statRow}>
            {statItems.slice(3, 6).map((item) => (
              <StatCard key={item.label} {...item} columns={3} androidGrid />
            ))}
          </View>
        </View>
      ) : useHorizontalStats ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}>
          {statCards}
        </ScrollView>
      ) : (
        <View style={[styles.grid, statColumns === 6 ? styles.gridWide : null]}>{statCards}</View>
      )}

      <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Recent Bookings
        </ThemedText>
        {stats.recentBookings.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No active bookings. Confirmed projects appear under My Projects.
          </ThemedText>
        ) : (
          stats.recentBookings.map((booking) => (
            <View key={booking.id} style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">
                {booking.artistName}
              </ThemedText>
              <ThemedText type="smallBold">{getBookingStatusLabel(booking.status)}</ThemedText>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

type StatCardTone = 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'red';

const STAT_TONES: Record<StatCardTone, string> = {
  blue: '#60A5FA',
  green: '#34D399',
  yellow: '#FBBF24',
  purple: '#A78BFA',
  cyan: '#22D3EE',
  red: '#F87171',
};

type StatCardIcon = {
  ios: string;
  android: string;
  web: string;
};

function StatCard({
  label,
  value,
  amount,
  tone,
  icon,
  columns,
  androidGrid = false,
}: {
  label: string;
  value?: string;
  amount?: number;
  tone: StatCardTone;
  icon: StatCardIcon;
  columns: number;
  androidGrid?: boolean;
}) {
  const accent = STAT_TONES[tone];
  const isMobile = columns === 2 || androidGrid;
  const widthStyle: ViewStyle = androidGrid
    ? styles.statItemAndroid
    : columns === 6 || columns === 5
      ? styles.statItemWide
      : columns === 3
        ? styles.statItemThird
        : columns === 2
          ? styles.statItemHalf
          : styles.statItemMobile;

  return (
    <View style={[styles.statItem, androidGrid && styles.statItemAndroidInner, widthStyle]}>
      <View style={styles.iconSlot}>
        <SymbolView name={icon} size={24} tintColor={accent} />
      </View>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        numberOfLines={2}
        style={styles.statLabel}>
        {label}
      </ThemedText>
      <StatValue
        amount={amount}
        value={value}
        color={accent}
        fontSize={isMobile ? 16 : 18}
        style={[styles.statValue, isMobile && styles.statValueMobile]}
      />
    </View>
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
  statsScroll: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingRight: Spacing.one,
  },
  androidStatGrid: {
    gap: Spacing.three,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  gridWide: {
    flexWrap: 'nowrap',
    gap: Spacing.three,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    minHeight: 112,
  },
  statItemAndroid: {
    flex: 1,
    minWidth: 0,
  },
  statItemAndroidInner: {
    justifyContent: 'space-between',
  },
  iconSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    textAlign: 'center',
    width: '100%',
    minHeight: 36,
    lineHeight: 18,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    width: '100%',
  },
  statValueMobile: {
    fontSize: 16,
    lineHeight: 20,
  },
  statItemWide: {
    flex: 1,
    minWidth: 0,
  },
  statItemThird: {
    flex: 1,
    minWidth: 0,
  },
  statItemHalf: {
    flex: 1,
    minWidth: 0,
  },
  statItemMobile: {
    width: 120,
    flexGrow: 0,
    flexShrink: 0,
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
});
