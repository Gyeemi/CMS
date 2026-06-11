import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createElement, useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  displayToIsoDate,
  formatDisplayDate,
  isoToDisplayDate,
  parseDisplayDate,
  startOfToday,
  toIsoDate,
} from '@/lib/date-format';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

function clampDate(date: Date, minDate: Date, maxDate?: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dayStart < minDate) return minDate;
  if (maxDate && dayStart > maxDate) return maxDate;
  return dayStart;
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const minDate = minimumDate ?? startOfToday();
  const selectedDate = clampDate(parseDisplayDate(value) ?? minDate, minDate, maximumDate);

  const applyDate = useCallback(
    (date?: Date) => {
      if (!date || Number.isNaN(date.getTime())) return;
      const next = clampDate(date, minDate, maximumDate);
      onChange(formatDisplayDate(next));
    },
    [minDate, maximumDate, onChange],
  );

  const openAndroidPicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: 'date',
      minimumDate: minDate,
      maximumDate,
      onValueChange: (_event, date) => {
        applyDate(date);
      },
    });
  }, [applyDate, maximumDate, minDate, selectedDate]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {createElement('input', {
          type: 'date',
          value: displayToIsoDate(value),
          min: toIsoDate(minDate),
          max: maximumDate ? toIsoDate(maximumDate) : undefined,
          onChange: (event: { target: { value: string } }) => {
            const next = event.target.value;
            onChange(next ? isoToDisplayDate(next) : '');
          },
          style: {
            width: '100%',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: theme.border,
            borderRadius: Radius.md,
            paddingLeft: Spacing.three,
            paddingRight: Spacing.three,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 16,
            color: theme.text,
            backgroundColor: theme.backgroundInput,
            boxSizing: 'border-box',
            fontFamily: FontFamily,
          },
        })}
      </View>
    );
  }

  const openPicker = () => {
    if (Platform.OS === 'android') {
      openAndroidPicker();
      return;
    }
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        onPress={openPicker}
        style={[
          styles.input,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundInput,
          },
        ]}>
        <ThemedText style={{ color: value ? theme.text : theme.textSecondary }}>
          {value || 'Select date'}
        </ThemedText>
      </Pressable>

      {Platform.OS === 'ios' && showPicker ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="inline"
            minimumDate={minDate}
            maximumDate={maximumDate}
            onValueChange={(_event, date) => {
              applyDate(date);
            }}
          />
          <Pressable onPress={() => setShowPicker(false)} style={styles.doneButton}>
            <ThemedText type="linkPrimary">Done</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
  },
  pickerWrap: {
    gap: Spacing.two,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.one,
  },
});
