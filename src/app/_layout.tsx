import '@/lib/supabase/install-global-resilient-fetch';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useSegments } from 'expo-router';
import { View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthGate } from '@/components/auth-gate';
import { NotificationAudioBootstrap } from '@/components/notification-audio-bootstrap';
import { StackBackButton } from '@/components/stack-back-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { AuthProvider } from '@/context/auth-context';
import { BookingsProvider } from '@/context/bookings-context';
import { ProjectsProvider } from '@/context/projects-context';
import { StudioPaymentProvider } from '@/context/studio-payment-context';
import { StudioSettingsProvider } from '@/context/studio-settings-context';
import { ThemePreferenceProvider, useThemePreference } from '@/context/theme-context';

function RootNavigation() {
  const { colorScheme } = useThemePreference();
  const segments = useSegments();
  const showFloatingToggle =
    segments[0] !== '(tabs)' &&
    segments[0] !== '(client)' &&
    segments[0] !== 'auth-loading';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        {showFloatingToggle ? <ThemeToggle floating /> : null}
        <AnimatedSplashOverlay />
        <AuthGate>
          <NotificationAudioBootstrap />
          <Stack
            screenOptions={{
              headerLeft: () => <StackBackButton />,
            }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="auth-loading" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(client)" options={{ headerShown: false }} />
            <Stack.Screen
              name="new"
              options={{ title: 'New Project', presentation: 'modal', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="project/[id]"
              options={{ title: 'Edit Project', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="invoice/[id]"
              options={{ title: 'Invoice', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="invoice/print/[id]"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="office/expenses/print/[id]"
              options={{ headerShown: false, presentation: 'modal' }}
            />
          </Stack>
        </AuthGate>
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        <BookingsProvider>
          <StudioPaymentProvider>
            <StudioSettingsProvider>
              <ProjectsProvider>
                <RootNavigation />
              </ProjectsProvider>
            </StudioSettingsProvider>
          </StudioPaymentProvider>
        </BookingsProvider>
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}
