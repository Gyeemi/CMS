import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { GroovXBrand } from '@/components/groovx-brand';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { goBackOrReplace } from '@/lib/navigation';
import { useTheme } from '@/hooks/use-theme';
import { formatBhutanPhone } from '@/lib/phone-format';

export default function SignupScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+975 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup({ firstName, middleName, lastName, email, phone, password });
      if (!result.ok) {
        setError(result.error ?? 'Sign up failed.');
        return;
      }
      router.replace('/(client)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + Spacing.five,
              paddingBottom: insets.bottom + Spacing.five,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => goBackOrReplace('/')} style={styles.backLink}>
            <ThemedText type="linkPrimary">Back to home</ThemedText>
          </Pressable>

          <View style={styles.header}>
            <GroovXBrand fontSize={40} lineHeight={44} />
            <ThemedText type="subtitle" style={styles.title}>
              Create client account
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Sign up to book a recording session at our studio.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <FormField
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Suraj"
              autoCapitalize="words"
            />
            <FormField
              label="Second Name"
              value={middleName}
              onChangeText={setMiddleName}
              placeholder="Optional"
              autoCapitalize="words"
            />
            <FormField
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Dorji"
              autoCapitalize="words"
            />
            <FormField
              label="User Name (Email)"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <FormField
              label="Phone"
              value={phone}
              onChangeText={(value) => setPhone(formatBhutanPhone(value))}
              placeholder="+975 XXX XX XXX"
              keyboardType="phone-pad"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FormField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}

            <PrimaryButton
              label={submitting ? 'Creating account…' : 'Sign Up & Create Account'}
              onPress={handleSignup}
              disabled={submitting}
            />

            <Pressable onPress={() => router.push('/')}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpText}>
                Already have an account?{' '}
                <ThemedText type="linkPrimary">Sign in</ThemedText>
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  backLink: {
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: MaxContentWidth,
    marginBottom: Spacing.four,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  helpText: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
