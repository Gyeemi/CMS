import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeleteProjectModal } from '@/components/delete-project-modal';
import { CurrencyField } from '@/components/currency-field';
import { FormField } from '@/components/form-field';
import {
  applyManageClientToProjectForm,
  ManageClientPicker,
} from '@/components/manage-client-picker';
import { PrimaryButton } from '@/components/primary-button';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useProjects } from '@/context/projects-context';
import { useTheme } from '@/hooks/use-theme';
import { printInvoice } from '@/lib/invoice-export';
import { isRegisteredManageClientId } from '@/lib/supabase/link-project-client';
import {
  MANUAL_CLIENT_PICKER_ID,
  type ManageClientRow,
} from '@/lib/supabase/manage-clients';
import { formatBhutanPhone, isValidBhutanPhone, resolveArtistPhone } from '@/lib/phone-format';
import {
    AUDIO_COPYRIGHTS,
    calculateBalance,
    calculateGst,
    calculateTotal,
    createEmptyProjectForm,
    formatCurrency,
    isComboProjectType,
    getAllowedProductionStatusLabelOptions,
    getProductionStatusFromLabel,
    getProductionStatusLabel,
    getProductionStatusTransitionError,
    PROJECT_CATEGORIES,
    PROJECT_TYPES,
    type AudioCopyright,
    type ProductionStatus,
    type Project,
    type ProjectFormData,
} from '@/types/project';

export type ProjectFormSubmitMeta = {
  linkedClientProfileId?: string;
};

type ProjectFormProps = {
  initialData?: ProjectFormData;
  projectMeta?: Pick<Project, 'id' | 'createdAt' | 'updatedAt'>;
  linkedClientPhone?: string;
  initialLinkedClientProfileId?: string | null;
  onSubmit: (data: ProjectFormData, meta?: ProjectFormSubmitMeta) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  submitLabel?: string;
};

export function ProjectForm({
  initialData,
  projectMeta,
  linkedClientPhone,
  initialLinkedClientProfileId,
  onSubmit,
  onDelete,
  submitLabel = 'Save Project',
}: ProjectFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { updateProductionStatus } = useProjects();
  const [form, setForm] = useState<ProjectFormData>(() => {
    const base = initialData ?? createEmptyProjectForm();
    const normalized = {
      ...base,
      gstEnabled: base.gstEnabled === true,
      artistPhone: resolveArtistPhone(base.artistPhone, linkedClientPhone),
    };
    if (
      isComboProjectType(normalized.projectType) &&
      normalized.audioAmount == null &&
      normalized.videoAmount == null
    ) {
      return { ...normalized, audioAmount: normalized.projectAmount, videoAmount: 0 };
    }
    return normalized;
  });
  const [producerMatchesArtist, setProducerMatchesArtist] = useState(() => {
    if (!initialData) return false;
    return (
      initialData.artistName.trim() !== '' && initialData.artistName.trim() === initialData.producer.trim()
    );
  });
  const [selectedClient, setSelectedClient] = useState<ManageClientRow | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
    if (initialLinkedClientProfileId && isRegisteredManageClientId(initialLinkedClientProfileId)) {
      return initialLinkedClientProfileId;
    }
    return MANUAL_CLIENT_PICKER_ID;
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    if (!linkedClientPhone?.trim()) return;

    setForm((prev) => {
      if (prev.artistPhone.trim()) return prev;
      return { ...prev, artistPhone: resolveArtistPhone('', linkedClientPhone) };
    });
  }, [linkedClientPhone]);

  const balance = useMemo(() => calculateBalance(form), [form]);
  const gst = useMemo(() => calculateGst(form), [form]);
  const total = useMemo(() => calculateTotal(form), [form]);
  const printProject = useMemo((): Project | null => {
    if (!form.projectName.trim()) return null;
    const data = producerMatchesArtist ? { ...form, producer: form.artistName } : form;
    if (projectMeta) return { ...data, ...projectMeta };
    const now = new Date().toISOString();
    return {
      ...data,
      id: 'draft',
      createdAt: now,
      updatedAt: now,
    };
  }, [form, projectMeta, producerMatchesArtist]);
  const canPrint = Boolean(printProject);

  const update = <K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClientPick = (client: ManageClientRow | null) => {
    setSelectedClient(client);
    setSelectedClientId(client?.id ?? MANUAL_CLIENT_PICKER_ID);
    if (!client) return;

    const applied = applyManageClientToProjectForm(client);
    setForm((prev) => ({
      ...prev,
      artistName: applied.artistName,
      artistPhone: applied.artistPhone,
      producer: producerMatchesArtist ? applied.artistName : applied.producer,
    }));
    setProducerMatchesArtist(true);
  };

  const handleProducerMatchesArtist = (enabled: boolean) => {
    setProducerMatchesArtist(enabled);
    if (enabled) {
      setForm((prev) => ({ ...prev, producer: prev.artistName }));
    }
  };

  const handleProjectTypeChange = (projectType: ProjectFormData['projectType']) => {
    setForm((prev) => {
      if (isComboProjectType(projectType)) {
        const audioAmount = prev.audioAmount ?? prev.projectAmount;
        const videoAmount = prev.videoAmount ?? 0;
        return {
          ...prev,
          projectType,
          audioAmount,
          videoAmount,
          projectAmount: audioAmount + videoAmount,
        };
      }

      const projectAmount =
        isComboProjectType(prev.projectType)
          ? (prev.audioAmount ?? 0) + (prev.videoAmount ?? 0)
          : prev.projectAmount;

      return { ...prev, projectType, projectAmount };
    });
  };

  const updateComboAmount = (key: 'audioAmount' | 'videoAmount', value: number) => {
    setForm((prev) => {
      const audioAmount = key === 'audioAmount' ? value : (prev.audioAmount ?? 0);
      const videoAmount = key === 'videoAmount' ? value : (prev.videoAmount ?? 0);
      return { ...prev, [key]: value, projectAmount: audioAmount + videoAmount };
    });
  };

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!form.projectName.trim()) {
      const message = 'Please enter a project name.';
      setSubmitError(message);
      showMessage('Missing info', message);
      return;
    }
    if (form.artistPhone.trim() && !isValidBhutanPhone(form.artistPhone)) {
      const message = 'Enter a valid phone number (+975 XXX XX XXX).';
      setSubmitError(message);
      showMessage('Invalid phone', message);
      return;
    }
    const submission = producerMatchesArtist ? { ...form, producer: form.artistName } : form;
    const linkedClientProfileId = isRegisteredManageClientId(selectedClient?.id)
      ? selectedClient.id
      : isRegisteredManageClientId(selectedClientId)
        ? selectedClientId
        : undefined;

    setSaving(true);
    try {
      await onSubmit(submission, linkedClientProfileId ? { linkedClientProfileId } : undefined);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save the project. Check your connection and try again.';
      setSubmitError(message);
      showMessage('Unable to save', message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!printProject) {
      showMessage('Missing info', 'Please enter a project name before printing.');
      return;
    }
    try {
      await printInvoice(printProject);
    } catch {
      showMessage('Print failed', 'Could not open the invoice for printing.');
    }
  };

  const handleProductionStatusApply = async (status: ProductionStatus) => {
    if (status === form.productionStatus) return;

    const transitionError = getProductionStatusTransitionError(form.productionStatus, status);
    if (transitionError) {
      setSubmitError(transitionError);
      showMessage('Invalid status', transitionError);
      return;
    }

    if (projectMeta?.id) {
      setStatusSaving(true);
      setSubmitError('');
      try {
        await updateProductionStatus(projectMeta.id, status);
        update('productionStatus', status);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not update production status.';
        setSubmitError(message);
        showMessage('Unable to update status', message);
      } finally {
        setStatusSaving(false);
      }
      return;
    }

    update('productionStatus', status);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    setSaving(true);
    try {
      await onDelete();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete the project. Please try again.';
      setSubmitError(message);
      showMessage('Unable to delete', message);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
      ]}
      keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.form}>
        <ThemedText type="subtitle" style={styles.heading}>
          Project Details
        </ThemedText>

        <FormField
          label="Project Name"
          value={form.projectName}
          onChangeText={(v) => update('projectName', v)}
          placeholder="e.g. Summer Vibes EP"
        />
        <ManageClientPicker
          label="Pick Client (optional)"
          value={selectedClientId}
          onChange={handleClientPick}
          matchName={form.artistName}
          matchPhone={form.artistPhone}
        />
        <FormField
          label="Artist Name"
          value={form.artistName}
          onChangeText={(v) => {
            setForm((prev) => ({
              ...prev,
              artistName: v,
              producer: producerMatchesArtist ? v : prev.producer,
            }));
          }}
          placeholder="Artist or band name"
        />
        <FormField
          label="Phone Number"
          value={form.artistPhone}
          onChangeText={(v) => update('artistPhone', formatBhutanPhone(v))}
          placeholder="+975 XXX XX XXX"
          keyboardType="phone-pad"
        />
        <View style={styles.switchRow}>
          <ThemedText type="smallBold">Producer same as Artist</ThemedText>
          <Switch
            value={producerMatchesArtist}
            onValueChange={handleProducerMatchesArtist}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <FormField
          label="Producer"
          value={producerMatchesArtist ? form.artistName : form.producer}
          onChangeText={(v) => {
            if (!producerMatchesArtist) update('producer', v);
          }}
          placeholder="Assigned producer"
          editable={!producerMatchesArtist}
        />

        <SelectField
          label="Project Type"
          options={PROJECT_TYPES}
          value={form.projectType}
          onChange={handleProjectTypeChange}
        />
        <SelectField
          label="Project Category"
          options={PROJECT_CATEGORIES}
          value={form.projectCategory}
          onChange={(v) => update('projectCategory', v)}
        />

        <ThemedText type="smallBold" style={styles.sectionLabel}>
          Financials
        </ThemedText>

        {isComboProjectType(form.projectType) ? (
          <View style={styles.row}>
            <View style={styles.half}>
              <CurrencyField
                label="Music Production Amount (Nu.)"
                value={form.audioAmount ?? 0}
                onChangeValue={(v) => updateComboAmount('audioAmount', v)}
                placeholder="Nu. 8,000.00"
              />
            </View>
            <View style={styles.half}>
              <CurrencyField
                label="Music Video Amount (Nu.)"
                value={form.videoAmount ?? 0}
                onChangeValue={(v) => updateComboAmount('videoAmount', v)}
                placeholder="Nu. 4,000.00"
              />
            </View>
          </View>
        ) : (
          <CurrencyField
            label="Project Amount (Nu.)"
            value={form.projectAmount}
            onChangeValue={(v) => update('projectAmount', v)}
            placeholder="Nu. 12,000.00"
          />
        )}

        <CurrencyField
          label="Advance Payment (Nu.)"
          value={form.advancePayment}
          onChangeValue={(v) => update('advancePayment', v)}
          placeholder="Nu. 6,000.00"
        />

        <CurrencyField
          label="Discount (Nu.)"
          value={form.discount}
          onChangeValue={(v) => update('discount', v)}
          placeholder="Nu. 0.00"
        />

        <View style={styles.switchRow}>
          <ThemedText type="smallBold">Apply GST (5%)</ThemedText>
          <Switch
            value={form.gstEnabled === true}
            onValueChange={(enabled) => update('gstEnabled', enabled)}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.summary, { backgroundColor: theme.accentMuted, borderColor: theme.border }]}>
          <SummaryRow label="Balance Amount" value={formatCurrency(balance)} />
          {form.gstEnabled ? <SummaryRow label="GST (5%)" value={formatCurrency(gst)} /> : null}
          <SummaryRow
            label={form.gstEnabled ? 'Total (incl. GST)' : 'Total'}
            value={formatCurrency(total)}
            bold
          />
        </View>

        <AudioCopyrightField
          value={form.audioCopyright}
          onApply={(copyright) => update('audioCopyright', copyright)}
        />

        <ProductionStatusField
          value={form.productionStatus}
          saving={statusSaving}
          onApply={(status) => void handleProductionStatusApply(status)}
        />

        {submitError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {submitError}
          </ThemedText>
        ) : null}

        <PrimaryButton
          label={saving ? 'Saving…' : submitLabel}
          onPress={() => void handleSubmit()}
          disabled={saving}
        />
        {canPrint ? (
          <PrimaryButton label="Print Invoice" onPress={handlePrint} variant="secondary" disabled={saving} />
        ) : null}
        {onDelete ? (
          <PrimaryButton
            label="Delete Project"
            onPress={() => setDeleteModalVisible(true)}
            variant="danger"
            disabled={saving}
          />
        ) : null}
      </ThemedView>

      {onDelete ? (
        <DeleteProjectModal
          visible={deleteModalVisible}
          projectName={form.projectName}
          onClose={() => setDeleteModalVisible(false)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </ScrollView>
  );
}

function SelectWithSetField<T extends string>({
  label,
  options,
  value,
  onApply,
  setLabel = 'Set',
  setDisabled = false,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onApply: (value: T) => void;
  setLabel?: string;
  setDisabled?: boolean;
}) {
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const canSet = selected !== value;

  return (
    <View style={styles.statusSetRow}>
      <View style={styles.statusSetSelect}>
        <SelectField label={label} options={options} value={selected} onChange={setSelected} />
      </View>
      <PrimaryButton
        label={setLabel}
        onPress={() => onApply(selected)}
        disabled={!canSet || setDisabled}
        style={styles.statusSetButton}
      />
    </View>
  );
}

function AudioCopyrightField({
  value,
  onApply,
}: {
  value: AudioCopyright;
  onApply: (copyright: AudioCopyright) => void;
}) {
  return (
    <SelectWithSetField
      label="Audio Copyrights"
      options={AUDIO_COPYRIGHTS}
      value={value}
      onApply={onApply}
    />
  );
}

function ProductionStatusField({
  value,
  saving,
  onApply,
}: {
  value: ProductionStatus;
  saving?: boolean;
  onApply: (status: ProductionStatus) => void;
}) {
  const appliedLabel = getProductionStatusLabel(value);
  const options = useMemo(() => getAllowedProductionStatusLabelOptions(value), [value]);

  return (
    <SelectWithSetField
      label="Production Status"
      options={options}
      value={appliedLabel}
      setLabel={saving ? 'Saving…' : 'Set'}
      setDisabled={saving}
      onApply={(label) => {
        const status = getProductionStatusFromLabel(label);
        if (status) onApply(status);
      }}
    />
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <ThemedText type={bold ? 'smallBold' : 'small'} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type={bold ? 'smallBold' : 'small'}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  heading: {
    fontSize: 24,
    lineHeight: 32,
  },
  sectionLabel: {
    marginTop: Spacing.one,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  half: {
    flex: 1,
  },
  summary: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSetRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  statusSetSelect: {
    flex: 1,
    minWidth: 0,
  },
  statusSetButton: {
    minWidth: 88,
    marginBottom: Spacing.half,
  },
});
