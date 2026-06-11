import { useEffect, useState } from 'react';
import type { TextInputProps } from 'react-native';

import { FormField } from '@/components/form-field';
import {
  CURRENCY_INPUT_PLACEHOLDER,
  formatCurrencyInput,
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
  ...props
}: CurrencyFieldProps) {
  const [text, setText] = useState(() => formatCurrencyInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatCurrencyInput(value));
    }
  }, [value, focused]);

  return (
    <FormField
      label={label}
      hint={hint}
      value={text}
      editable={editable}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        const parsed = parseCurrencyInput(text);
        onChangeValue(parsed);
        setText(formatCurrencyInput(parsed));
        props.onBlur?.(event);
      }}
      onChangeText={(raw) => {
        setText(raw);
        onChangeValue(parseCurrencyInput(raw));
      }}
      {...props}
    />
  );
}
