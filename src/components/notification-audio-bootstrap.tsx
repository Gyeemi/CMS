import { useEffect } from 'react';
import { Platform } from 'react-native';

import { unlockNotificationAudio } from '@/lib/notification-sound';

/** Warms up native notification audio after sign-in (web unlocks on first click/tap). */
export function NotificationAudioBootstrap() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void unlockNotificationAudio();
    }
  }, []);

  return null;
}
