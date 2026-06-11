import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandaloneWebApp() {
  if (typeof window === 'undefined') return false;

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosWebBrowser() {
  if (typeof window === 'undefined') return false;

  const ua = window.navigator.userAgent;
  const isIosDevice = /iPad|iPhone|iPod/.test(ua);
  const isMsStream = 'MSStream' in window;
  return isIosDevice && !isMsStream;
}

export function usePwaInstall() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    if (isStandaloneWebApp()) {
      setIsInstalled(true);
      return;
    }

    if (isIosWebBrowser()) {
      setIsIos(true);
      setCanInstall(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return 'unavailable';

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
      return 'accepted';
    }

    return 'dismissed';
  }, []);

  const showOnWeb = Platform.OS === 'web';

  return {
    showOnWeb,
    canInstall: showOnWeb && canInstall && !isInstalled,
    showInstallOption: showOnWeb && !isInstalled,
    isInstalled,
    isIos,
    hasNativePrompt: canInstall && !isIos,
    install,
  };
}
