import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

export function goBackOrReplace(fallback: Href = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

export function navigateToLanding() {
  if (Platform.OS === 'web') {
    window.location.replace('/');
    return;
  }

  // Defer until the current render/navigation commit finishes (avoids Expo Router mount races).
  setTimeout(() => {
    try {
      if (router.canDismiss()) {
        router.dismissAll();
      }
    } catch {
      // Nested navigators may not support dismissAll on every platform.
    }

    router.replace('/');
  }, 0);
}