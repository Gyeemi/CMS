import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalancePaymentHistory } from '@/components/balance-payment-history';
import { LabeledCurrencyRow } from '@/components/labeled-currency-row';
import { PartialBalancePaymentStatus } from '@/components/partial-balance-payment-status';
import { ProductionStatusTag } from '@/components/production-status-tag';
import { StatValue } from '@/components/stat-value';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { resolveProjectAdvancePayment } from '@/lib/booking-to-project';
import { getBookingAdvancePaid, getClientBalanceDueAmount } from '@/types/client';
import {
  getFullProjectPayment,
  getProjectLineItems,
  hasBalancePaymentHistory,
  hasPartialBalancePayment,
  isProjectBalancePaid,
} from '@/types/project';

export default function ClientProjectsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const summaryWide = width >= 900;
  const { projects, isLoading, refreshProjects } = useProjects();
  const { bookings, refreshBookings } = useBookings();

  useFocusEffect(
    useCallback(() => {
      void refreshProjects();
      void refreshBookings();
    }, [refreshProjects, refreshBookings]),
  );

  const displayProjects = useMemo(
    () =>
      projects.map((project) => {
        const booking = bookings.find((item) => item.projectId === project.id);
        const resolved = resolveProjectAdvancePayment(project, booking);
        return {
          project: resolved,
          booking,
          advancePaid: booking ? getBookingAdvancePaid(booking) : resolved.advancePayment,
          balanceDue: getClientBalanceDueAmount(resolved, booking),
          balancePaid: isProjectBalancePaid(resolved),
          deadline: booking?.preferredDate?.trim() || null,
        };
      }),
    [projects, bookings],
  );

  const totalValue = displayProjects.reduce(
    (sum, row) => sum + getFullProjectPayment(row.project),
    0,
  );
  const totalDiscount = displayProjects.reduce((sum, row) => sum + row.project.discount, 0);
  const totalAdvance = displayProjects.reduce((sum, row) => sum + row.advancePaid, 0);
  const totalBalance = displayProjects.reduce((sum, row) => sum + row.balanceDue, 0);

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
        My Total Projects
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Confirmed studio projects linked to your bookings.
      </ThemedText>

      <View style={[styles.summaryRow, summaryWide ? styles.summaryRowWide : null]}>
        <SummaryCard
          label="Projects"
          value={String(displayProjects.length)}
          theme={theme}
          wide={summaryWide}
        />
        <SummaryCard
          label={totalDiscount > 0 ? 'Net Value' : 'Total Value'}
          amount={totalValue}
          theme={theme}
          wide={summaryWide}
        />
        {totalDiscount > 0 ? (
          <SummaryCard
            label="Total Discount"
            amount={totalDiscount}
            theme={theme}
            wide={summaryWide}
          />
        ) : null}
        <SummaryCard
          label="Advance Paid"
          amount={totalAdvance}
          theme={theme}
          wide={summaryWide}
        />
        <SummaryCard
          label="Balance Due"
          amount={totalBalance}
          theme={theme}
          wide={summaryWide}
        />
      </View>

      {isLoading ? (
        <ThemedText type="small" themeColor="textSecondary">
          Loading projects…
        </ThemedText>
      ) : displayProjects.length === 0 ? (
        <ThemedView style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            No confirmed projects yet. Once the studio confirms your booking, your projects will
            appear here.
          </ThemedText>
        </ThemedView>
      ) : (
        displayProjects.map(({ project, advancePaid, balanceDue, balancePaid, deadline }) => {
          const hasHistory = hasBalancePaymentHistory(project);
          const isPartial = hasPartialBalancePayment(project);

          return (
          <ThemedView key={project.id} style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.projectHeader}>
              <ThemedText type="smallBold" style={styles.projectTitle}>
                {project.projectName}
              </ThemedText>
              <ProductionStatusTag status={project.productionStatus} />
            </View>
            <ThemedText type="small" style={{ color: theme.success }}>
              {project.projectType}
            </ThemedText>
            {deadline ? (
              <ThemedText type="small" themeColor="textSecondary">
                Project deadline: {deadline}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              Artist: {project.artistName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Producer: {project.producer || '—'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Category: {project.projectCategory}
            </ThemedText>
            {getProjectLineItems(project).map((item) => (
              <LabeledCurrencyRow
                key={item.description}
                label={`${item.description}:`}
                amount={item.amount}
              />
            ))}
            <LabeledCurrencyRow
              label="Project amount:"
              amount={project.projectAmount}
              color={theme.accent}
              boldLabel
            />
            {project.discount > 0 ? (
              <LabeledCurrencyRow
                label="Discount:"
                leading="−"
                amount={project.discount}
                color={theme.warning}
              />
            ) : null}
            {project.discount > 0 ? (
              <LabeledCurrencyRow
                label="Net amount:"
                amount={getFullProjectPayment(project)}
                color={theme.accent}
                boldLabel
              />
            ) : null}
            {!balancePaid && advancePaid > 0 ? (
              <LabeledCurrencyRow
                label="Advance paid:"
                amount={advancePaid}
                color={theme.success}
              />
            ) : null}
            {isPartial && !hasHistory ? (
              <PartialBalancePaymentStatus project={project} />
            ) : null}
            {hasHistory ? <BalancePaymentHistory project={project} /> : null}
            <LabeledCurrencyRow
              label="Remaining balance:"
              amount={balanceDue}
              color={balancePaid ? theme.warning : theme.danger}
              boldLabel
              showPrefix={!balancePaid}
            />
          </ThemedView>
          );
        })
      )}
    </ScrollView>
  );
}

function SummaryCard({
  label,
  value,
  amount,
  theme,
  wide,
}: {
  label: string;
  value?: string;
  amount?: number;
  theme: ReturnType<typeof useTheme>;
  wide: boolean;
}) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.summaryCard,
        wide ? styles.summaryCardWide : styles.summaryCardNarrow,
        { borderColor: theme.border },
      ]}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <StatValue amount={amount} value={value} fontSize={16} />
    </ThemedView>
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: Spacing.two,
  },
  summaryRowWide: {
    flexWrap: 'nowrap',
  },
  summaryCard: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
    justifyContent: 'center',
  },
  summaryCardWide: {
    flex: 1,
    minWidth: 0,
  },
  summaryCardNarrow: {
    width: '48%',
    flexGrow: 0,
    flexShrink: 0,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  projectTitle: {
    flex: 1,
  },
});
