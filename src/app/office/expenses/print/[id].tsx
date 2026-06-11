import { Stack, useLocalSearchParams } from 'expo-router';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useOfficeExpensePrintStyles } from '@/hooks/use-office-expense-print-styles';
import { useTheme } from '@/hooks/use-theme';
import { buildOfficeExpenseReportWebContent } from '@/lib/office-expense-export-html';
import {
  clearOfficeExpensePrintDraft,
  closeOfficeExpensePrintPage,
  readOfficeExpensePrintDraft,
  useAutoPrintOfficeExpensesOnWeb,
} from '@/lib/office-expense-print';
import { goBackOrReplace } from '@/lib/navigation';
import type { OfficeExpensePrintReport } from '@/types/office-expense-report';

export default function PrintOfficeExpensesScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const reportId = Array.isArray(id) ? id[0] : id;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<OfficeExpensePrintReport | null>(null);
  const [missing, setMissing] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!reportId) {
      setMissing(true);
      return;
    }

    if (loadedRef.current) return;
    loadedRef.current = true;

    const draft = readOfficeExpensePrintDraft(reportId);
    if (draft) {
      setReport(draft);
      return;
    }

    setMissing(true);
  }, [reportId]);

  useEffect(() => {
    return () => {
      clearOfficeExpensePrintDraft();
    };
  }, []);

  useOfficeExpensePrintStyles();
  useAutoPrintOfficeExpensesOnWeb(Boolean(report));

  const webContent = useMemo(
    () => (report ? buildOfficeExpenseReportWebContent(report) : ''),
    [report],
  );

  if (!report) {
    return (
      <ThemedView style={styles.centered}>
        {missing ? (
          <>
            <ThemedText>Expense report not found.</ThemedText>
            <Pressable
              onPress={() => goBackOrReplace('/(tabs)/manage')}
              style={[styles.actionButton, { backgroundColor: theme.accent, marginTop: Spacing.three }]}>
              <ThemedText type="smallBold" style={styles.actionText}>
                Back to Manage Office
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.accent} />
            <ThemedText themeColor="textSecondary" style={{ marginTop: Spacing.three }}>
              Loading expense report…
            </ThemedText>
          </>
        )}
      </ThemedView>
    );
  }

  const handlePrint = () => {
    if (Platform.OS === 'web') window.print();
  };

  const handleClose = () => {
    closeOfficeExpensePrintPage(() => {
      goBackOrReplace('/(tabs)/manage');
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={[styles.page, { backgroundColor: theme.background }]}>
        <View nativeID="office-expense-actions" style={[styles.toolbar, { borderBottomColor: theme.border }]}>
          <ThemedText type="smallBold">Office Expense Report</ThemedText>
          <View style={styles.toolbarActions}>
            <Pressable onPress={handlePrint} style={[styles.actionButton, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={styles.actionText}>
                Print
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleClose}
              style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Close</ThemedText>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + Spacing.four, paddingTop: Spacing.three },
          ]}>
          {Platform.OS === 'web'
            ? createElement('div', {
                id: 'office-expense-print-area',
                dangerouslySetInnerHTML: { __html: webContent },
              })
            : (
              <ThemedText themeColor="textSecondary">
                Open this report on web to print, or use Print Report from Manage Office on mobile.
              </ThemedText>
            )}
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionText: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
