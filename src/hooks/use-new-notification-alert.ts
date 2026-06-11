import { useEffect, useRef } from 'react';

import { playNotificationSound } from '@/lib/notification-sound';

type Options = {
  enabled: boolean;
  ready: boolean;
  unreadKeySignature: string;
  onNewAlert?: () => void;
  playSound?: boolean;
};

export function useNewNotificationAlert({
  enabled,
  ready,
  unreadKeySignature,
  onNewAlert,
  playSound = true,
}: Options) {
  const knownSignatureRef = useRef<string | null>(null);
  const onNewAlertRef = useRef(onNewAlert);
  onNewAlertRef.current = onNewAlert;

  useEffect(() => {
    if (!enabled) {
      knownSignatureRef.current = null;
      return;
    }

    if (!ready) return;

    if (knownSignatureRef.current === null) {
      knownSignatureRef.current = unreadKeySignature;
      return;
    }

    if (unreadKeySignature === knownSignatureRef.current) return;

    const previousKeys = new Set(knownSignatureRef.current.split('|').filter(Boolean));
    const currentKeys = unreadKeySignature.split('|').filter(Boolean);
    const hasNewUnread = currentKeys.some((key) => !previousKeys.has(key));

    knownSignatureRef.current = unreadKeySignature;

    if (hasNewUnread) {
      if (playSound) {
        void playNotificationSound();
      }
      onNewAlertRef.current?.();
    }
  }, [enabled, playSound, ready, unreadKeySignature]);
}
