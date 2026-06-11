import { StyleSheet, Text, type TextStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { splitCurrencyAmount } from '@/lib/currency-format';

type CurrencyTextProps = {
  amount: number;
  leading?: string;
  fontSize?: number;
  decimalFontSize?: number;
  color?: string;
  bold?: boolean;
  showPrefix?: boolean;
  style?: TextStyle;
  align?: 'left' | 'right' | 'center';
};

export function CurrencyText({
  amount,
  leading = '',
  fontSize = 14,
  decimalFontSize,
  color,
  bold = false,
  showPrefix = true,
  style,
  align = 'left',
}: CurrencyTextProps) {
  const theme = useTheme();
  const textColor = color ?? theme.text;
  const { prefix, whole, fraction } = splitCurrencyAmount(amount);
  const displayPrefix = showPrefix ? prefix : '';
  const decSize = decimalFontSize ?? Math.max(10, Math.round(fontSize * 0.68));
  const weight = bold ? '600' : '400';
  const textStyle = { color: textColor, fontFamily: Fonts.sans };

  return (
    <Text style={[styles.root, textStyle, { textAlign: align }, style]}>
      {leading ? (
        <Text style={{ fontSize, fontWeight: weight, ...textStyle }}>{leading}</Text>
      ) : null}
      <Text style={{ fontSize, fontWeight: weight, ...textStyle }}>
        {displayPrefix}
        {whole}
      </Text>
      <Text style={{ fontSize: decSize, fontWeight: weight, ...textStyle }}>.{fraction}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  root: {
    fontFamily: Fonts.sans,
  },
});
