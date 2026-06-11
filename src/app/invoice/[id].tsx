import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InvoiceView } from '@/components/invoice-view';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { printInvoice, saveInvoicePdf } from '@/lib/invoice-export';
import { shareInvoiceViaWhatsApp } from '@/lib/invoice-whatsapp';
import { saveInvoiceForProject } from '@/lib/invoice-storage';
import { resolveProjectAdvancePayment } from '@/lib/booking-to-project';
import { fetchBookingForProject } from '@/lib/supabase/bookings';
import { fetchProjectById } from '@/lib/supabase/projects';

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { getProject, updateProject, isLoading } = useProjects();
  const projectId = Array.isArray(id) ? id[0] : id;
  const cachedProject = projectId ? getProject(projectId) : undefined;
  const [project, setProject] = useState(cachedProject);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [invoiceSaved, setInvoiceSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [loadingProject, setLoadingProject] = useState(!cachedProject && Boolean(projectId));
  const [linkedBooking, setLinkedBooking] = useState<
    Awaited<ReturnType<typeof fetchBookingForProject>>
  >(null);

  useEffect(() => {
    if (cachedProject) {
      setProject(cachedProject);
      setLoadingProject(false);
    }
  }, [cachedProject]);

  useEffect(() => {
    if (!projectId) return;
    void fetchBookingForProject(projectId).then(setLinkedBooking);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setLoadingProject(true);
    void fetchProjectById(projectId)
      .then((loaded) => {
        if (!cancelled) setProject(loaded ?? cachedProject);
      })
      .catch(() => {
        if (!cancelled && cachedProject) setProject(cachedProject);
      })
      .finally(() => {
        if (!cancelled) setLoadingProject(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, cachedProject]);

  useEffect(() => {
    if (!project) return;
    setGstEnabled(project.gstEnabled === true);
  }, [project?.id, project?.gstEnabled]);

  const invoiceProject = useMemo(() => {
    if (!project) return undefined;
    const resolved = resolveProjectAdvancePayment(project, linkedBooking);
    return { ...resolved, gstEnabled };
  }, [project, linkedBooking, gstEnabled]);

  useEffect(() => {
    if (!invoiceProject) return;
    saveInvoiceForProject(invoiceProject).then(() => setInvoiceSaved(true));
  }, [invoiceProject]);

  if (isLoading || loadingProject) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  if (!project || !invoiceProject) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Project not found.</ThemedText>
      </ThemedView>
    );
  }

  const handleGstToggle = async (enabled: boolean) => {
    setGstEnabled(enabled);
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...formData } = project;
    await updateProject(project.id, { ...formData, gstEnabled: enabled });
  };

  const handlePrint = async () => {
    try {
      await printInvoice(invoiceProject);
    } catch {
      Alert.alert('Print failed', 'Could not open the invoice for printing.');
    }
  };

  const handleWhatsApp = async () => {
    setSharingWhatsApp(true);
    try {
      await shareInvoiceViaWhatsApp(invoiceProject);
    } catch {
      Alert.alert('WhatsApp failed', 'Could not send the invoice via WhatsApp. Please try again.');
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveInvoicePdf(invoiceProject);
      await saveInvoiceForProject(invoiceProject);
      setInvoiceSaved(true);
      Alert.alert(
        'Invoice saved',
        Platform.OS === 'web'
          ? 'The invoice PDF has been downloaded to your device.'
          : 'The invoice has been downloaded as a PDF file.',
      );
    } catch {
      Alert.alert('Save failed', 'Could not save the invoice PDF. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Invoice' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <ThemedText type="subtitle" style={styles.title}>
          Invoice Ready
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {invoiceSaved
            ? 'Project and invoice saved to local storage.'
            : 'Saving invoice to local storage…'}
        </ThemedText>

        <InvoiceView
          project={invoiceProject}
          onGstEnabledChange={(enabled) => void handleGstToggle(enabled)}
        />

        <View style={styles.actions} nativeID="invoice-actions">
          <PrimaryButton label="Print Invoice" onPress={handlePrint} />
          <PrimaryButton
            label={sharingWhatsApp ? 'Opening WhatsApp…' : 'Send via WhatsApp'}
            onPress={handleWhatsApp}
            disabled={sharingWhatsApp}
          />
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save as PDF'}
            onPress={handleSave}
            variant="secondary"
            disabled={saving}
          />
          <PrimaryButton label="Back to Projects" onPress={() => router.replace('/(tabs)')} variant="secondary" />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  subtitle: {
    marginBottom: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
