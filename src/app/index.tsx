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
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      const trimmed = username.trim();
      const trimmedPassword = password.trim();
      if (!trimmed || !trimmedPassword) {
        setError('Enter your user name and password.');
        return;
      }

      const result = await login(trimmed, trimmedPassword);
      if (!result.ok) {
        setError(result.error ?? 'Sign in failed.');
        return;
      }

      router.replace('/auth-loading');
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
          <View style={styles.hero}>
            <GroovXBrand fontSize={56} lineHeight={60} />
            <ThemedText type="subtitle" style={styles.headline}>
              Turning Vibes into Hits
            </ThemedText>
          </View>

          <View style={styles.form}>
            <FormField
              label="User Name"
              value={username}
              onChangeText={setUsername}
              placeholder="Email or user name"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
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
              label={submitting ? 'Signing in…' : 'Sign In'}
              onPress={handleLogin}
              disabled={submitting}
            />

            <Pressable onPress={() => router.push('/signup')}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpText}>
                Don&apos;t have an account?{' '}
                <ThemedText type="linkPrimary">Create Account</ThemedText>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  hero: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  headline: {
    fontSize: 28,
    lineHeight: 36,
    maxWidth: 640,
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
