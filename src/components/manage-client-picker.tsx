import { createElement, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clientNamesMatch } from '@/lib/client-name-match';
import { formatBhutanPhone, normalizeBhutanPhoneDigits } from '@/lib/phone-format';
import {
  fetchManageClients,
  formatManageClientPickerLabel,
  MANUAL_CLIENT_PICKER_ID,
  type ManageClientRow,
} from '@/lib/supabase/manage-clients';

type ManageClientPickerProps = {
  label?: string;
  value: string | null;
  onChange: (client: ManageClientRow | null) => void;
  matchName?: string;
  matchPhone?: string;
};

export function ManageClientPicker({
  label = 'Pick Client',
  value,
  onChange,
  matchName,
  matchPhone,
}: ManageClientPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ManageClientRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchManageClients()
      .then((rows) => {
        if (!active) return;
        setClients(rows);
        setError('');
      })
      .catch(() => {
        if (!active) return;
        setError('Unable to load clients.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(
    () => [
      { id: MANUAL_CLIENT_PICKER_ID, label: 'Enter details manually', row: null as ManageClientRow | null },
      ...clients.map((row) => ({
        id: row.id,
        label: formatManageClientPickerLabel(row),
        row,
      })),
    ],
    [clients],
  );

  const selected = options.find((option) => option.id === value) ?? options[0];
  const displayLabel = loading ? 'Loading clients…' : selected.label;

  useEffect(() => {
    if (loading || clients.length === 0) return;
    if (value && value !== MANUAL_CLIENT_PICKER_ID) return;
    const name = matchName?.trim() ?? '';
    if (!name) return;

    const phoneDigits = normalizeBhutanPhoneDigits(matchPhone ?? '');
    const match = clients.find((client) => {
      const clientPhone = normalizeBhutanPhoneDigits(client.phone);
      const phoneMatch =
        phoneDigits.length === 8 && clientPhone.length === 8 && phoneDigits === clientPhone;
      return phoneMatch && clientNamesMatch(name, client.fullName);
    });
    if (match) {
      onChange(match);
    }
  }, [clients, loading, matchName, matchPhone, onChange, value]);

  const handleSelect = (optionId: string) => {
    const option = options.find((item) => item.id === optionId);
    onChange(option?.row ?? null);
    setOpen(false);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <View style={styles.webSelectWrap}>
          {createElement(
            'select',
            {
              value: value ?? MANUAL_CLIENT_PICKER_ID,
              disabled: loading,
              onChange: (event: { target: { value: string } }) => handleSelect(event.target.value),
              style: {
                width: '100%',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: theme.border,
                borderRadius: Radius.md,
                paddingLeft: Spacing.three,
                paddingRight: Spacing.five,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 16,
                color: theme.text,
                backgroundColor: theme.backgroundInput,
                boxSizing: 'border-box',
                fontFamily: FontFamily,
                cursor: 'pointer',
                outline: 'none',
              },
            },
            options.map((option) =>
              createElement('option', { key: option.id, value: option.id }, option.label),
            ),
          )}
          <ThemedText style={[styles.chevron, { color: theme.textSecondary }]}>▾</ThemedText>
        </View>
        {error ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        onPress={() => !loading && setOpen(true)}
        style={[
          styles.trigger,
          { borderColor: theme.border, backgroundColor: theme.backgroundInput },
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <ThemedText style={{ flex: 1 }} numberOfLines={2}>
            {displayLabel}
          </ThemedText>
        )}
        <ThemedText themeColor="textSecondary">▾</ThemedText>
      </Pressable>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={(event) => event.stopPropagation()}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {label}
            </ThemedText>
            <ScrollView style={styles.sheetList}>
              {options.map((option) => {
                const selectedOption = option.id === (value ?? MANUAL_CLIENT_PICKER_ID);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelect(option.id)}
                    style={[
                      styles.sheetOption,
                      {
                        backgroundColor: selectedOption ? theme.accent : 'transparent',
                        borderBottomColor: theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selectedOption ? '#FFFFFF' : theme.text }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function applyManageClientToProjectForm(client: ManageClientRow) {
  const phone = client.phone?.trim() ? formatBhutanPhone(client.phone) : '+975 ';
  return {
    artistName: client.fullName.trim(),
    artistPhone: phone,
    producer: client.fullName.trim(),
  };
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  webSelectWrap: {
    position: 'relative',
    width: '100%',
  },
  chevron: {
    position: 'absolute',
    right: Spacing.three,
    top: '50%',
    marginTop: -10,
    fontSize: 16,
    pointerEvents: 'none',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
    gap: Spacing.two,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: 1,
    maxHeight: '70%',
    paddingBottom: Spacing.four,
  },
  sheetTitle: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sheetList: {
    maxHeight: 420,
  },
  sheetOption: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
