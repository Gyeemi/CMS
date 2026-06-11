import { StyleSheet, View } from 'react-native';

import { CurrencyText } from '@/components/currency-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LabeledCurrencyRowProps = {
  label: string;
  amount: number;
  color?: string;
  showPrefix?: boolean;
  boldLabel?: boolean;
  leading?: string;
};

export function LabeledCurrencyRow({
  label,
  amount,
  color,
  showPrefix = true,
  boldLabel = false,
  leading,
}: LabeledCurrencyRowProps) {
  const theme = useTheme();
  const valueColor = color ?? theme.text;

  return (
    <View style={styles.row}>
      <ThemedText
        type={boldLabel ? 'smallBold' : 'small'}
        themeColor={color ? undefined : 'textSecondary'}
        style={color ? { color } : undefined}>
        {label}
      </ThemedText>
      {leading ? (
        <ThemedText
          type={boldLabel ? 'smallBold' : 'small'}
          themeColor={color ? undefined : 'textSecondary'}
          style={color ? { color } : undefined}>
          {leading}
        </ThemedText>
      ) : null}
      <CurrencyText
        amount={amount}
        color={valueColor}
        fontSize={14}
        decimalFontSize={10}
        bold={boldLabel}
        showPrefix={showPrefix}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
});
