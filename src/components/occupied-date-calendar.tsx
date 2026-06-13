import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  addMonths,
  displayToIsoDate,
  formatDisplayDate,
  getCalendarMonthDays,
  isSameCalendarDay,
  MONTH_NAMES,
  parseDisplayDate,
  startOfToday,
  toIsoDate,
} from '@/lib/date-format';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const OCCUPIED_RIBBON_COLOR = '#FBBF24';
const SUNDAY_COLOR = '#EF4444';
const SATURDAY_COLOR = '#2563EB';

type OccupiedDateCalendarProps = {
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  occupiedIsoDates: Set<string>;
  compact?: boolean;
  showLegend?: boolean;
};

function getWeekdayLabelColor(index: number) {
  if (index === 0) return SUNDAY_COLOR;
  if (index === 6) return SATURDAY_COLOR;
  return undefined;
}

function getDayNumberColor(date: Date, inMonth: boolean, isDisabled: boolean, themeText: string) {
  if (!inMonth || isDisabled) return undefined;
  const day = date.getDay();
  if (day === 0) return SUNDAY_COLOR;
  if (day === 6) return SATURDAY_COLOR;
  return themeText;
}

export function OccupiedDateCalendar({
  value,
  onChange,
  minimumDate,
  occupiedIsoDates,
  compact = false,
  showLegend = true,
}: OccupiedDateCalendarProps) {
  const theme = useTheme();
  const minDate = minimumDate ?? startOfToday();
  const selectedDate = parseDisplayDate(value);
  const initialMonth = selectedDate ?? minDate;
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  const monthDays = useMemo(() => getCalendarMonthDays(visibleMonth), [visibleMonth]);
  const monthLabel = `${MONTH_NAMES[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;

  const handleSelect = (date: Date) => {
    if (date < minDate) return;
    const iso = toIsoDate(date);
    if (occupiedIsoDates.has(iso)) return;
    onChange(formatDisplayDate(date));
  };

  return (
    <View
      style={[
        compact ? styles.calendarCompact : styles.calendar,
        { borderColor: theme.border, backgroundColor: theme.backgroundInput },
      ]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setVisibleMonth((current) => addMonths(current, -1))}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <ThemedText type="smallBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{monthLabel}</ThemedText>
        <Pressable
          onPress={() => setVisibleMonth((current) => addMonths(current, 1))}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <ThemedText type="smallBold">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => {
          const weekdayColor = getWeekdayLabelColor(index);
          return (
            <View key={label} style={styles.dayCell}>
              <ThemedText
                type="small"
                style={{
                  fontSize: compact ? 11 : 12,
                  color: weekdayColor ?? theme.textSecondary,
                  fontWeight: weekdayColor ? '700' : '400',
                }}>
                {label}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <View style={styles.grid}>
        {monthDays.map(({ date, inMonth }) => {
          const iso = toIsoDate(date);
          const isOccupied = occupiedIsoDates.has(iso);
          const isBeforeMin = date < minDate;
          const isSelected = selectedDate ? isSameCalendarDay(date, selectedDate) : false;
          const isToday = isSameCalendarDay(date, startOfToday());
          const isDisabled = !inMonth || isBeforeMin || isOccupied;
          const dayColor = getDayNumberColor(date, inMonth, isDisabled, theme.text);

          return (
            <Pressable
              key={iso + String(inMonth)}
              onPress={() => handleSelect(date)}
              disabled={isDisabled}
              style={styles.dayCell}
              accessibilityRole="button"
              accessibilityLabel={`${formatDisplayDate(date)}${isOccupied ? ', booked by another client' : ''}`}>
              <View
                style={[
                  compact ? styles.dayButtonCompact : styles.dayButton,
                  {
                    borderColor: isSelected ? theme.accent : 'transparent',
                    backgroundColor: isToday
                      ? theme.accentMuted
                      : isSelected
                        ? theme.accent
                        : 'transparent',
                    opacity: inMonth ? 1 : 0.35,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    fontSize: compact ? 12 : 13,
                    color: isSelected ? '#FFFFFF' : dayColor ?? theme.textSecondary,
                    fontWeight: isToday || isSelected ? '700' : '400',
                  }}>
                  {date.getDate()}
                </ThemedText>
                {isOccupied && inMonth ? <View style={styles.ribbonBottom} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          <View style={styles.legendRibbon} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.legendText}>
            Yellow ribbon = booked by another client
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function isOccupiedSessionDate(value: string, occupiedIsoDates: Set<string>) {
  const iso = displayToIsoDate(value);
  return Boolean(iso && occupiedIsoDates.has(iso));
}

const styles = StyleSheet.create({
  calendar: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  calendarCompact: {
    borderWidth: 0,
    padding: Spacing.one,
    gap: Spacing.one,
    maxWidth: 320,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  dayButton: {
    width: '100%',
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 4,
  },
  dayButtonCompact: {
    width: '100%',
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 3,
  },
  ribbonBottom: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 999,
    backgroundColor: OCCUPIED_RIBBON_COLOR,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.half,
  },
  legendRibbon: {
    width: 22,
    height: 3,
    borderRadius: 999,
    backgroundColor: OCCUPIED_RIBBON_COLOR,
  },
  legendText: {
    fontSize: 11,
    flex: 1,
  },
});
