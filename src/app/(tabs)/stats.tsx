import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyText } from '@/components/currency-text';
import { StatValue } from '@/components/stat-value';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { resolveProjectAdvancePayment } from '@/lib/booking-to-project';
import { UserGreetingHeader } from '@/components/user-greeting-header';
import {
  getConfirmedBalanceReceivedAmount,
  getDisplayAdvancePayment,
  getFullProjectPayment,
  getOutstandingBalance,
  PROJECT_CATEGORIES,
  PROJECT_TYPES,
} from '@/types/project';

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { projects, refreshProjects } = useProjects();
  const { bookings, refreshBookings } = useBookings();
  useFocusEffect(
    useCallback(() => {
      void refreshProjects();
      void refreshBookings();
    }, [refreshProjects, refreshBookings]),
  );

  const resolvedProjects = useMemo(
    () =>
      projects.map((project) => {
        const booking = bookings.find((item) => item.projectId === project.id);
        return resolveProjectAdvancePayment(project, booking);
      }),
    [projects, bookings],
  );

  const stats = useMemo(() => {
    const totalAmount = resolvedProjects.reduce((s, p) => s + p.projectAmount, 0);
    const totalDiscount = resolvedProjects.reduce((s, p) => s + p.discount, 0);
    const totalNetAmount = resolvedProjects.reduce((s, p) => s + getFullProjectPayment(p), 0);
    const totalAdvance = resolvedProjects.reduce((s, p) => s + getDisplayAdvancePayment(p), 0);
    const totalBalance = resolvedProjects.reduce((s, p) => s + getOutstandingBalance(p), 0);
    const totalBalanceReceived = resolvedProjects.reduce(
      (s, p) => s + getConfirmedBalanceReceivedAmount(p),
      0,
    );

    const byCategory = PROJECT_CATEGORIES.map((cat) => ({
      label: cat,
      count: resolvedProjects.filter((p) => p.projectCategory === cat).length,
    })).filter((x) => x.count > 0);

    const byType = PROJECT_TYPES.map((type) => ({
      label: type,
      count: resolvedProjects.filter((p) => p.projectType === type).length,
    }));

    const unauthorized = resolvedProjects.filter((p) => p.audioCopyright === 'Unauthorized').length;

    const totalAmountReceived = totalAdvance + totalBalanceReceived;

    return {
      totalAmount,
      totalNetAmount,
      totalDiscount,
      totalAdvance,
      totalBalance,
      totalBalanceReceived,
      totalAmountReceived,
      byCategory,
      byType,
      unauthorized,
    };
  }, [resolvedProjects]);

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
        Dashboard · Business overview for GroovX
      </ThemedText>

      <View style={styles.grid}>
        <StatItem
          label="Net Project Value after Discount"
          amount={stats.totalNetAmount}
          referenceLabel="Total Project Value"
          referenceAmount={stats.totalAmount}
          tone="blue"
        />
        {stats.totalDiscount > 0 ? (
          <StatItem label="Total Discounts" amount={stats.totalDiscount} tone="green" />
        ) : null}
        <StatItem
          label="Total Amount Received"
          subtitle="Advance Collected + Balance Received"
          amount={stats.totalAmountReceived}
          tone="green"
        />
        <StatItem label="Advance Collected" amount={stats.totalAdvance} tone="yellow" />
        <StatItem label="Pending Balance" amount={stats.totalBalance} tone="red" />
        <StatItem label="Balance Received" amount={stats.totalBalanceReceived} tone="purple" />
        <StatItem label="Projects" value={String(resolvedProjects.length)} tone="cyan" />
      </View>

      <Section title="By Project Type">
        {stats.byType.map((item) => (
          <Row key={item.label} label={item.label} value={String(item.count)} />
        ))}
      </Section>

      {stats.byCategory.length > 0 ? (
        <Section title="By Category">
          {stats.byCategory.map((item) => (
            <Row key={item.label} label={item.label} value={String(item.count)} />
          ))}
        </Section>
      ) : null}

      <Section title="Copyright Status">
        <Row label="Unauthorized projects" value={String(stats.unauthorized)} />
        <Row
          label="Authorized projects"
          value={String(resolvedProjects.length - stats.unauthorized)}
        />
      </Section>
    </ScrollView>
  );
}

type StatCardTone = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';

const STAT_VALUE_COLORS: Record<StatCardTone, string> = {
  blue: '#60A5FA',
  green: '#34D399',
  yellow: '#FBBF24',
  red: '#F87171',
  purple: '#A78BFA',
  cyan: '#22D3EE',
};

function StatItem({
  label,
  subtitle,
  value,
  amount,
  referenceLabel,
  referenceAmount,
  tone,
}: {
  label: string;
  subtitle?: string;
  value?: string;
  amount?: number;
  referenceLabel?: string;
  referenceAmount?: number;
  tone: StatCardTone;
}) {
  const theme = useTheme();
  const valueColor = STAT_VALUE_COLORS[tone];
  const hasReference = referenceLabel != null && referenceAmount != null;

  return (
    <View style={styles.statItem}>
      {hasReference ? (
        <View style={styles.statSplit}>
          <View style={styles.statMetricPrimary}>
            <ThemedText type="small" themeColor="textSecondary">
              {label}
            </ThemedText>
            <StatValue amount={amount} color={valueColor} fontSize={18} />
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statMetricReference}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.referenceLabel}>
              {referenceLabel}
            </ThemedText>
            <CurrencyText
              amount={referenceAmount}
              color={valueColor}
              fontSize={13}
              decimalFontSize={9}
              bold
              align="right"
            />
          </View>
        </View>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.statSubtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
          <StatValue amount={amount} value={value} color={valueColor} fontSize={18} />
        </>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statItem: {
    width: '31%',
    flexGrow: 1,
    flexBasis: '31%',
    minWidth: 200,
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  statSubtitle: {
    fontSize: 10,
    lineHeight: 12,
  },
  statSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statMetricPrimary: {
    flexShrink: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    minHeight: 36,
  },
  statMetricReference: {
    flexShrink: 0,
    gap: 2,
    alignItems: 'flex-end',
    paddingLeft: Spacing.half,
  },
  referenceLabel: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'right',
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
