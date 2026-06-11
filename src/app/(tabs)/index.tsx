import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroovXBrand } from '@/components/groovx-brand';
import {
  MarkBalancePaidModal,
  type BalancePaymentSubmitResult,
} from '@/components/mark-balance-paid-modal';
import { PrimaryButton } from '@/components/primary-button';
import { ProjectCard } from '@/components/project-card';
import { StatValue } from '@/components/stat-value';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { resolveProjectAdvancePayment } from '@/lib/booking-to-project';
import {
  formatCurrency,
  getOutstandingBalance,
  type BalancePaymentMethod,
  type EPaymentPlatform,
  type Project,
} from '@/types/project';

export default function ProjectsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { projects, isLoading, loadError: projectsLoadError, refreshProjects, recordBalancePayment } =
    useProjects();
  const { bookings, loadError: bookingsLoadError, refreshBookings } = useBookings();
  const loadError = projectsLoadError ?? bookingsLoadError;
  const [search, setSearch] = useState('');
  const [paymentProject, setPaymentProject] = useState<Project | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshProjects();
      void refreshBookings();
    }, [refreshBookings, refreshProjects]),
  );

  const projectsWithBookingAdvance = useMemo(
    () =>
      projects.map((project) => {
        const booking = bookings.find((item) => item.projectId === project.id);
        return resolveProjectAdvancePayment(project, booking);
      }),
    [projects, bookings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projectsWithBookingAdvance;
    return projectsWithBookingAdvance.filter(
      (p) =>
        p.projectName.toLowerCase().includes(q) ||
        p.artistName.toLowerCase().includes(q) ||
        p.producer.toLowerCase().includes(q),
    );
  }, [projectsWithBookingAdvance, search]);

  const stats = useMemo(() => {
    const totalRevenue = projectsWithBookingAdvance.reduce(
      (sum, p) => sum + p.projectAmount - p.discount,
      0,
    );
    const pendingBalance = projectsWithBookingAdvance.reduce(
      (sum, p) => sum + getOutstandingBalance(p),
      0,
    );
    return { count: projectsWithBookingAdvance.length, totalRevenue, pendingBalance };
  }, [projectsWithBookingAdvance]);

  const resolveForPayment = useCallback(
    (project: Project) => {
      const booking = bookings.find((item) => item.projectId === project.id);
      return resolveProjectAdvancePayment(project, booking);
    },
    [bookings],
  );

  const recordResolvedBalancePayment = async (
    resolved: Project,
    method: BalancePaymentMethod,
    details?: {
      paymentRef?: string;
      ePaymentPlatform?: EPaymentPlatform;
      amount?: number;
    },
  ): Promise<BalancePaymentSubmitResult> => {
    const balanceDue = getOutstandingBalance(resolved);
    if (balanceDue <= 0) {
      throw new Error('This project has no outstanding balance to record.');
    }

    const amount = details?.amount ?? balanceDue;
    if (amount <= 0 || amount > balanceDue) {
      throw new Error('Enter a valid payment amount.');
    }

    await recordBalancePayment(resolved.id, {
      balancePaidAmount: amount,
      balancePaymentMethod: method,
      balancePaymentPlatform: method === 'e_payment' ? details?.ePaymentPlatform : undefined,
      balancePaymentRef: method === 'e_payment' ? details?.paymentRef?.trim() : undefined,
    });
    await refreshProjects();
    await refreshBookings();

    const remaining = Math.max(0, balanceDue - amount);
    const message =
      remaining > 0
        ? `Partial payment of ${formatCurrency(amount)} recorded. ${formatCurrency(remaining)} remaining.`
        : method === 'cash'
          ? 'Balance marked as paid in cash.'
          : `${details?.ePaymentPlatform ?? 'E-Payment'} payment recorded. Balance paid in full.`;

    setPaymentNotice(message);
    return { message };
  };

  const handleMarkBalancePaid = (project: Project) => {
    setPaymentNotice(null);
    const resolved = resolveForPayment(project);
    const balanceDue = getOutstandingBalance(resolved);

    if (balanceDue <= 0) {
      const message = 'This project has no outstanding balance to record.';
      setPaymentNotice(message);
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('No balance due', message);
      }
      return;
    }

    if (Platform.OS === 'web') {
      setPaymentProject(resolved);
      return;
    }

    Alert.alert(
      'Record balance payment',
      `${resolved.projectName || 'Project'} · ${formatCurrency(balanceDue)} remaining`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Paid in Cash',
          onPress: () => {
            setMarkingPaidId(resolved.id);
            void recordResolvedBalancePayment(resolved, 'cash')
              .catch((error) => {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Could not record the balance payment. Please try again.';
                setPaymentNotice(message);
                Alert.alert('Payment failed', message);
              })
              .finally(() => setMarkingPaidId(null));
          },
        },
        {
          text: 'E-Payment',
          onPress: () => setPaymentProject(resolved),
        },
      ],
    );
  };

  const handleConfirmBalancePaid = async (
    method: BalancePaymentMethod,
    details?: {
      paymentRef?: string;
      ePaymentPlatform?: EPaymentPlatform;
      amount: number;
    },
  ): Promise<BalancePaymentSubmitResult> => {
    if (!paymentProject) {
      throw new Error('No project selected for payment.');
    }

    setMarkingPaidId(paymentProject.id);
    try {
      return await recordResolvedBalancePayment(paymentProject, method, details);
    } finally {
      setMarkingPaidId(null);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <>
      <ThemedView style={styles.container}>
        <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.six,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <GroovXBrand fontSize={32} lineHeight={40} />
              <ThemedText themeColor="textSecondary">Studio Project Manager</ThemedText>
            </View>

            <View style={styles.statsRow}>
              <StatPill label="Projects" value={String(stats.count)} />
              <StatPill label="Revenue" amount={stats.totalRevenue} />
              <StatPill label="Pending" amount={stats.pendingBalance} />
            </View>

            {loadError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {loadError}
              </ThemedText>
            ) : null}

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search projects, artists, producers..."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.search,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundInput,
                  borderColor: theme.border,
                },
              ]}
            />

            <PrimaryButton label="Add New Project" onPress={() => router.push('/new')} />

            {paymentNotice ? (
              <ThemedText type="small" style={{ color: theme.success }}>
                {paymentNotice}
              </ThemedText>
            ) : null}

          </View>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/project/${item.id}`)}
            onMarkPaid={handleMarkBalancePaid}
            markingPaid={markingPaidId === item.id}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ListEmptyComponent={
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">No projects yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Add your first client project to start tracking payments, categories, and copyrights.
            </ThemedText>
          </ThemedView>
        }
        />
      </ThemedView>

      <MarkBalancePaidModal
        visible={paymentProject != null}
        project={paymentProject}
        onClose={() => setPaymentProject(null)}
        onSubmit={handleConfirmBalancePaid}
      />
    </>
  );
}

function StatPill({
  label,
  value,
  amount,
}: {
  label: string;
  value?: string;
  amount?: number;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.statPill, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <StatValue amount={amount} value={value} color={theme.text} fontSize={14} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  statPill: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 120 : 100,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  search: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontFamily: FontFamily,
  },
  empty: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
  },
});
