import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';

type GroovXBrandProps = {
  fontSize?: number;
  lineHeight?: number;
  fontWeight?: TextStyle['fontWeight'];
  style?: StyleProp<TextStyle>;
};

export function GroovXBrand({
  fontSize = 56,
  lineHeight,
  fontWeight = '700',
  style,
}: GroovXBrandProps) {
  const theme = useTheme();
  const { isDark } = useThemePreference();
  const groovColor = isDark ? theme.text : '#000000';

  return (
    <Text
      style={[
        styles.brand,
        { fontSize, lineHeight: lineHeight ?? fontSize + 4, fontWeight },
        style,
      ]}>
      <Text style={{ color: groovColor }}>Groov</Text>
      <Text style={{ color: theme.accent }}>X</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontFamily: FontFamily,
    fontWeight: '700',
  },
});
