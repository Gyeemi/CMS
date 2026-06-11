import { createElement, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SelectFieldProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  hideLabel?: boolean;
};

export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
}: SelectFieldProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {hideLabel ? null : <ThemedText type="smallBold">{label}</ThemedText>}
        <View style={styles.webSelectWrap}>
          {createElement(
            'select',
            {
              value,
              onChange: (event: { target: { value: string } }) => onChange(event.target.value as T),
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
              createElement('option', { key: option, value: option }, option),
            ),
          )}
          <ThemedText style={[styles.chevron, { color: theme.textSecondary }]}>▾</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hideLabel ? null : <ThemedText type="smallBold">{label}</ThemedText>}
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { borderColor: theme.border, backgroundColor: theme.backgroundInput },
        ]}>
        <ThemedText style={{ flex: 1 }}>{value}</ThemedText>
        <ThemedText themeColor="textSecondary">▾</ThemedText>
      </Pressable>

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
                const selected = option === value;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    style={[
                      styles.sheetOption,
                      {
                        backgroundColor: selected ? theme.accent : 'transparent',
                        borderBottomColor: theme.border,
                      },
                    ]}>
                    <ThemedText type="small" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                      {option}
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
    maxHeight: '55%',
    paddingBottom: Spacing.four,
  },
  sheetTitle: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sheetList: {
    maxHeight: 320,
  },
  sheetOption: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
