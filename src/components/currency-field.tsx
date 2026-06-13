import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  AMOUNT_INPUT_PLACEHOLDER,
  amountPlaceholderFromFull,
  CURRENCY_INPUT_PLACEHOLDER,
  CURRENCY_SYMBOL,
  formatCurrencyAmountOnly,
  parseCurrencyInput,
} from '@/lib/currency-format';

type CurrencyFieldProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  hint?: string;
};

export function CurrencyField({
  label,
  value,
  onChangeValue,
  hint,
  placeholder = CURRENCY_INPUT_PLACEHOLDER,
  editable = true,
  onFocus,
  onBlur,
  ...props
}: CurrencyFieldProps) {
  const theme = useTheme();
  const isDisabled = editable === false;
  const amountPlaceholder = amountPlaceholderFromFull(placeholder);
  const [text, setText] = useState(() => formatCurrencyAmountOnly(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatCurrencyAmountOnly(value));
    }
  }, [value, focused]);

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.fieldRow,
          {
            borderColor: theme.border,
            backgroundColor: isDisabled ? theme.backgroundSelected : theme.backgroundInput,
            opacity: isDisabled ? 0.7 : 1,
          },
        ]}>
        <View style={styles.currencySection}>
          <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
            {CURRENCY_SYMBOL}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <TextInput
          value={text}
          editable={editable}
          placeholder={amountPlaceholder || AMOUNT_INPUT_PLACEHOLDER}
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { color: theme.text }]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            const parsed = parseCurrencyInput(text);
            onChangeValue(parsed);
            setText(formatCurrencyAmountOnly(parsed));
            onBlur?.(event);
          }}
          onChangeText={(raw) => {
            setText(raw);
            onChangeValue(parseCurrencyInput(raw));
          }}
          {...props}
        />
      </View>

      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 46,
  },
  currencySection: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    minWidth: 52,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
  },
  amountInput: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontFamily: FontFamily,
    backgroundColor: 'transparent',
  },
});
