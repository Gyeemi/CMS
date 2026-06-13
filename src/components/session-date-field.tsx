import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { OccupiedDateCalendar } from '@/components/occupied-date-calendar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchOtherClientSessionIsoDates } from '@/lib/supabase/booking-occupied-dates';

type SessionDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
};

export function SessionDateField({ label, value, onChange, minimumDate }: SessionDateFieldProps) {
  const theme = useTheme();
  const [occupiedIsoDates, setOccupiedIsoDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchOtherClientSessionIsoDates()
      .then((dates) => {
        if (!cancelled) {
          setOccupiedIsoDates(dates);
          setLoadError('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOccupiedIsoDates(new Set());
          setLoadError('Could not load studio availability. You can still pick a date.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (next: string) => {
    onChange(next);
    setPickerOpen(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>

      <Pressable
        onPress={() => {
          if (!loading) setPickerOpen(true);
        }}
        disabled={loading}
        style={[
          styles.input,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundInput,
            opacity: loading ? 0.7 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Select preferred session date">
        {loading ? (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              Loading dates…
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={{ color: value ? theme.text : theme.textSecondary }}>
            {value || 'Select date'}
          </ThemedText>
        )}
      </Pressable>

      {loadError ? (
        <ThemedText type="small" style={{ color: theme.warning }}>
          {loadError}
        </ThemedText>
      ) : null}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[
              styles.popover,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
            onPress={(event) => event.stopPropagation()}>
            <OccupiedDateCalendar
              value={value}
              onChange={handleSelect}
              minimumDate={minimumDate}
              occupiedIsoDates={occupiedIsoDates}
              compact
            />
            {Platform.OS === 'web' ? null : (
              <Pressable onPress={() => setPickerOpen(false)} style={styles.doneButton}>
                <ThemedText type="linkPrimary">Done</ThemedText>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export { isOccupiedSessionDate } from '@/components/occupied-date-calendar';

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
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: Spacing.four,
  },
  popover: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.two,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
});
