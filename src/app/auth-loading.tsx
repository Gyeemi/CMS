import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { LoginLoadingScreen } from '@/components/login-loading-screen';
import { useAuth } from '@/context/auth-context';
import { getHomeRouteForRole } from '@/lib/auth-storage';
import { getRandomLoginLoadingMs } from '@/lib/greeting';

/** Shown after sign-in; keeps the user on a loading screen before entering the app. */
export default function AuthLoadingScreen() {
  const { user, finishLoginLoading } = useAuth();
  const loadingMs = useMemo(() => getRandomLoginLoadingMs(), []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const timer = setTimeout(() => {
      if (!active) return;
      finishLoginLoading();
      const home = getHomeRouteForRole(user.role);
      setTimeout(() => {
        if (!active) return;
        router.replace(home);
      }, 0);
    }, loadingMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [user, loadingMs, finishLoginLoading]);

  return <LoginLoadingScreen userName={user?.displayName} />;
}
