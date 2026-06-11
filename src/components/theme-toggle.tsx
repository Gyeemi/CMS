import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { toggleThumbShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';

type ThemeToggleProps = {
  floating?: boolean;
  compact?: boolean;
};

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 22;
const THUMB_SIZE = 16;
const THUMB_OFFSET = 3;

export function ThemeToggle({ floating = false, compact = false }: ThemeToggleProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isDark, toggleColorScheme } = useThemePreference();

  const toggle = <PillSwitch enabled={isDark} onToggle={toggleColorScheme} />;

  if (floating) {
    return (
      <View
        style={[
          styles.floating,
          { top: insets.top + Spacing.two, right: Spacing.four },
        ]}>
        {toggle}
      </View>
    );
  }

  if (compact) {
    return <View style={styles.compact}>{toggle}</View>;
  }

  return (
    <View
      style={[
        styles.inline,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.row}>
        <ThemedText type="smallBold">Dark Mode</ThemedText>
        {toggle}
      </View>
    </View>
  );
}

function PillSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={enabled ? 'Dark mode on' : 'Dark mode off'}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <View
        style={[
          styles.track,
          {
            backgroundColor: enabled ? theme.accent : '#CBD5E1',
          },
        ]}>
        <View
          style={[
            styles.thumb,
            enabled ? styles.thumbOn : styles.thumbOff,
            {
              backgroundColor: '#FFFFFF',
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  floating: {
    position: 'absolute',
    zIndex: 100,
  },
  inline: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: 'stretch',
  },
  compact: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    position: 'absolute',
    top: THUMB_OFFSET,
    ...toggleThumbShadow,
  },
  thumbOff: {
    left: THUMB_OFFSET,
  },
  thumbOn: {
    right: THUMB_OFFSET,
  },
});
