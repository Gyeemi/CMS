import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InvoiceView } from '@/components/invoice-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { useInvoicePrintStyles } from '@/hooks/use-invoice-print-styles';
import { closeInvoicePrintPage, consumeInvoicePrintDraft, useAutoPrintOnWeb } from '@/lib/invoice-print';
import { goBackOrReplace } from '@/lib/navigation';
import type { Project } from '@/types/project';

function resolveRouteId(
  id: string | string[] | undefined,
  projectId: string | string[] | undefined,
) {
  const queryId = Array.isArray(projectId) ? projectId[0] : projectId;
  if (queryId?.trim() && queryId !== '[id]') {
    return queryId.trim();
  }

  const pathId = Array.isArray(id) ? id[0] : id;
  if (pathId?.trim() && pathId !== '[id]') {
    return pathId.trim();
  }

  return queryId?.trim() || pathId?.trim() || '';
}

export default function PrintInvoiceScreen() {
  const { id, projectId: projectIdQuery } = useLocalSearchParams<{
    id: string | string[];
    projectId?: string | string[];
  }>();
  const projectId = resolveRouteId(id, projectIdQuery);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { getProject, isLoading } = useProjects();
  const [project, setProject] = useState<Project | undefined>();

  useEffect(() => {
    if (!projectId) return;

    const draft = consumeInvoicePrintDraft<Project>(projectId);
    if (draft) {
      setProject(draft);
      return;
    }

    const stored = getProject(projectId);
    if (stored) setProject(stored);
  }, [projectId, getProject, isLoading]);

  useInvoicePrintStyles();
  useAutoPrintOnWeb(Boolean(project));

  if (isLoading && !project) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  if (!project) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Invoice not found.</ThemedText>
      </ThemedView>
    );
  }

  const handlePrint = () => {
    if (Platform.OS === 'web') window.print();
  };

  const handleClose = () => {
    closeInvoicePrintPage(() => {
      goBackOrReplace('/(tabs)');
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={[styles.page, { backgroundColor: theme.background }]}>
        <View nativeID="invoice-actions" style={[styles.toolbar, { borderBottomColor: theme.border }]}>
          <ThemedText type="smallBold">GroovX Invoice</ThemedText>
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
          <InvoiceView project={project} />
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
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
