import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { getHomeRouteForRole } from '@/lib/auth-storage';
import { isStudioRole, isSuperAdmin } from '@/lib/roles';
import { useTheme } from '@/hooks/use-theme';

function isPublicRoute(segments: string[]) {
  const first = segments[0];
  return (
    !first ||
    first === 'index' ||
    first === 'login' ||
    first === 'signup' ||
    first === 'auth-loading'
  );
}

function isAdminRoute(segments: string[]) {
  const first = segments[0];
  return first === '(tabs)' || first === 'new' || first === 'project' || first === 'invoice';
}

function isClientRoute(segments: string[]) {
  return segments[0] === '(client)';
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isSigningOut, pendingLoginLoading, finishSigningOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const onPublicRoute = isPublicRoute(segments);

    if (!user || isSigningOut) {
      if (onPublicRoute) {
        if (isSigningOut) finishSigningOut();
        return;
      }

      // signOutToLanding already navigates; avoid duplicate replaces during logout.
      if (!isSigningOut) {
        router.replace('/');
      }
      return;
    }

    if (pendingLoginLoading) {
      if (segments[0] !== 'auth-loading') {
        router.replace('/auth-loading');
      }
      return;
    }

    const home = getHomeRouteForRole(user.role);

    if (isStudioRole(user.role)) {
      if (segments[0] === 'auth-loading') {
        router.replace(home);
        return;
      }
      if (onPublicRoute || isClientRoute(segments)) {
        router.replace(home);
      }
      if (!isSuperAdmin(user.role) && segments[1] === 'manage') {
        router.replace(home);
      }
      return;
    }

    if (segments[0] === 'auth-loading') {
      router.replace(home);
      return;
    }
    if (onPublicRoute || isAdminRoute(segments)) {
      router.replace(home);
    }
  }, [user, isLoading, isSigningOut, pendingLoginLoading, segments, router, finishSigningOut]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
