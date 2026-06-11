import { StyleSheet, type TextStyle } from 'react-native';

import { CurrencyText } from '@/components/currency-text';
import { ThemedText } from '@/components/themed-text';

type StatValueProps = {
  amount?: number;
  value?: string;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  style?: TextStyle;
};

export function StatValue({
  amount,
  value,
  color,
  fontSize = 18,
  bold = true,
  style,
}: StatValueProps) {
  if (amount != null) {
    return (
      <CurrencyText
        amount={amount}
        color={color}
        fontSize={fontSize}
        decimalFontSize={Math.max(10, Math.round(fontSize * 0.62))}
        bold={bold}
        style={style}
      />
    );
  }

  return (
    <ThemedText
      type="smallBold"
      style={[styles.text, { color, fontSize, fontWeight: bold ? '600' : '400' }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}>
      {value ?? '—'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
  },
});
