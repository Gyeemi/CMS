import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormFieldProps = TextInputProps & {
  label: string;
  hint?: string;
};

export function FormField({
  label,
  hint,
  style,
  editable = true,
  secureTextEntry,
  ...props
}: FormFieldProps) {
  const theme = useTheme();
  const isDisabled = editable === false;
  const isPasswordField = secureTextEntry === true;
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          editable={editable}
          secureTextEntry={isPasswordField && !passwordVisible}
          style={[
            styles.input,
            isPasswordField && styles.inputWithToggle,
            {
              color: theme.text,
              backgroundColor: isDisabled ? theme.backgroundSelected : theme.backgroundInput,
              borderColor: theme.border,
              opacity: isDisabled ? 0.7 : 1,
            },
            style,
          ]}
          {...props}
        />
        {isPasswordField ? (
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}>
            <ThemedText type="linkPrimary">{passwordVisible ? 'Hide' : 'Show'}</ThemedText>
          </Pressable>
        ) : null}
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
  inputWrap: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontFamily: FontFamily,
  },
  inputWithToggle: {
    paddingRight: Spacing.six,
  },
  toggle: {
    position: 'absolute',
    right: Spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
