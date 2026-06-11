import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { dropdownPanelShadow } from '@/constants/shadows';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useTheme } from '@/hooks/use-theme';
import {
  CLIENT_PROJECT_TYPES,
  createClientProjectDetailsForm,
  getClientProjectTypeLabel,
  type ClientProjectDetailsFormData,
  type RecordingBooking,
} from '@/types/client';
import { PROJECT_CATEGORIES } from '@/types/project';

type ClientProjectDetailsModalProps = {
  visible: boolean;
  booking: RecordingBooking | null;
  clientId?: string;
  onClose: () => void;
  onSubmitted?: (booking: RecordingBooking) => void;
};

export function ClientProjectDetailsModal({
  visible,
  booking,
  clientId,
  onClose,
  onSubmitted,
}: ClientProjectDetailsModalProps) {
  const theme = useTheme();
  const { submitProjectDetails } = useBookings();
  const [form, setForm] = useState<ClientProjectDetailsFormData>(createClientProjectDetailsForm());
  const [producerMatchesArtist, setProducerMatchesArtist] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !booking) {
      setSubmitting(false);
      return;
    }

    const nextForm = createClientProjectDetailsForm(booking);
    setForm(nextForm);
    setProducerMatchesArtist(
      nextForm.artistName.trim() !== '' && nextForm.artistName.trim() === nextForm.producerName.trim(),
    );
  }, [visible, booking]);

  if (!booking) return null;

  const update = <K extends keyof ClientProjectDetailsFormData>(
    key: K,
    value: ClientProjectDetailsFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleProducerMatchesArtist = (enabled: boolean) => {
    setProducerMatchesArtist(enabled);
    if (enabled) {
      setForm((prev) => ({ ...prev, producerName: prev.artistName }));
    }
  };

  const handleSubmit = async () => {
    const submission = producerMatchesArtist ? { ...form, producerName: form.artistName } : form;

    setSubmitting(true);
    try {
      const result = await submitProjectDetails(booking.id, submission, clientId ? { clientId } : undefined);
      if (!result.ok) {
        Alert.alert('Unable to save', result.error ?? 'Please check the project details and try again.');
        return;
      }
      onClose();
      if (result.booking) onSubmitted?.(result.booking);
      Alert.alert(
        'Project details saved',
        'Your project details have been submitted. The studio will verify your payment and confirm your booking.',
      );
    } catch {
      Alert.alert('Unable to save', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.panel,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ThemedText type="subtitle" style={styles.title}>
              Project Details
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Payment submitted. Fill in your project details so the studio can prepare your session.
            </ThemedText>

            <FormField
              label="Project Name"
              value={form.projectName}
              onChangeText={(value) => update('projectName', value)}
              placeholder="e.g. Summer Vibes EP"
              editable={!submitting}
            />
            <FormField
              label="Artist Name"
              value={form.artistName}
              onChangeText={(value) => {
                setForm((prev) => ({
                  ...prev,
                  artistName: value,
                  producerName: producerMatchesArtist ? value : prev.producerName,
                }));
              }}
              placeholder="Artist or band name"
              editable={!submitting}
            />
            <View style={styles.switchRow}>
              <ThemedText type="smallBold">Producer same as Artist</ThemedText>
              <Switch
                value={producerMatchesArtist}
                onValueChange={handleProducerMatchesArtist}
                disabled={submitting}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
            <FormField
              label="Producer's Name"
              value={producerMatchesArtist ? form.artistName : form.producerName}
              onChangeText={(value) => {
                if (!producerMatchesArtist) update('producerName', value);
              }}
              placeholder="Assigned producer"
              editable={!submitting && !producerMatchesArtist}
            />

            <SelectField
              label="Project Type"
              options={CLIENT_PROJECT_TYPES.map((item) => item.label)}
              value={getClientProjectTypeLabel(form.projectType)}
              onChange={(label) => {
                const selected = CLIENT_PROJECT_TYPES.find((item) => item.label === label);
                if (selected) update('projectType', selected.value);
              }}
            />

            <SelectField
              label="Project Category"
              options={PROJECT_CATEGORIES}
              value={form.projectCategory}
              onChange={(value) => update('projectCategory', value)}
            />

            <View style={styles.actions}>
              <PrimaryButton
                label={submitting ? 'Saving…' : 'Submit Project Details'}
                onPress={() => void handleSubmit()}
                disabled={submitting}
              />
              <PrimaryButton
                label="Close"
                variant="secondary"
                onPress={onClose}
                disabled={submitting}
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  panel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: Radius.md,
    ...dropdownPanelShadow,
  },
  scroll: {
    maxHeight: '100%',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    gap: Spacing.two,
  },
});
