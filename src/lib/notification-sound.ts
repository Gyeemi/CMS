import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

const notificationSoundAsset = require('../../assets/sounds/notification.wav');

let player: AudioPlayer | null = null;
let webAudioUnlocked = false;
let sharedWebAudioContext: AudioContext | null = null;
let webHtmlAudio: HTMLAudioElement | null = null;

function getSharedWebAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!sharedWebAudioContext) {
    sharedWebAudioContext = new AudioContext();
  }
  return sharedWebAudioContext;
}

/** Must run synchronously inside a user-gesture handler on web. */
function unlockWebAudioFromGesture() {
  if (Platform.OS !== 'web') return;

  webAudioUnlocked = true;
  const context = getSharedWebAudioContext();
  if (context?.state === 'suspended') {
    void context.resume();
  }
}

function installWebAudioUnlockListeners() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const unlockFromGesture = () => {
    unlockWebAudioFromGesture();
    void warmUpExpoPlayer();
  };

  for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'click'] as const) {
    document.addEventListener(eventName, unlockFromGesture, { capture: true, passive: true });
  }
}

installWebAudioUnlockListeners();

async function warmUpExpoPlayer() {
  try {
    const audioPlayer = await ensurePlayer();
    if (Platform.OS === 'web' && !webHtmlAudio) {
      webHtmlAudio = await createWebHtmlAudioElement();
    }
    if (Platform.OS === 'web' && webHtmlAudio) {
      const previousVolume = webHtmlAudio.volume;
      webHtmlAudio.volume = 0.01;
      webHtmlAudio.currentTime = 0;
      await webHtmlAudio.play();
      webHtmlAudio.pause();
      webHtmlAudio.volume = previousVolume;
      webHtmlAudio.currentTime = 0;
      return;
    }

    const previousVolume = audioPlayer.volume;
    audioPlayer.volume = 0.01;
    audioPlayer.play();
    await audioPlayer.seekTo(0);
    audioPlayer.pause();
    audioPlayer.volume = previousVolume;
  } catch {
    // Warm-up is best-effort; gesture unlock still enables the web chime.
  }
}

async function createWebHtmlAudioElement() {
  const { Asset } = await import('expo-asset');
  const asset = Asset.fromModule(notificationSoundAsset);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const element = new Audio(uri);
  element.preload = 'auto';
  return element;
}

export function unlockNotificationAudio() {
  unlockWebAudioFromGesture();
  void warmUpExpoPlayer();
}

async function ensurePlayer() {
  if (player) return player;

  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
  });

  player = createAudioPlayer(notificationSoundAsset);
  player.volume = 1;
  return player;
}

async function waitForPlayerLoaded(audioPlayer: AudioPlayer, timeoutMs = 4000) {
  if (audioPlayer.isLoaded) return;

  await new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (audioPlayer.isLoaded) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error('Notification sound did not load in time.'));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function playWebChime() {
  if (!webAudioUnlocked) return false;

  const context = getSharedWebAudioContext();
  if (!context) return false;

  if (context.state === 'suspended') {
    void context.resume();
  }

  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.55, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  [880, 1175].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    const start = now + index * 0.12;
    oscillator.start(start);
    oscillator.stop(start + 0.22);
  });

  return true;
}

async function playWebAssetSound() {
  if (!webAudioUnlocked) return false;

  try {
    if (!webHtmlAudio) {
      webHtmlAudio = await createWebHtmlAudioElement();
    }
    webHtmlAudio.currentTime = 0;
    webHtmlAudio.volume = 0.9;
    await webHtmlAudio.play();
    return true;
  } catch {
    return false;
  }
}

async function playNativeSound() {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'duckOthers',
  });

  const audioPlayer = await ensurePlayer();
  await waitForPlayerLoaded(audioPlayer);
  await audioPlayer.seekTo(0);
  audioPlayer.volume = 1;
  audioPlayer.play();
}

export async function playNotificationSound() {
  if (Platform.OS === 'web') {
    const playedAsset = await playWebAssetSound();
    if (playedAsset) return;
    playWebChime();
    return;
  }

  try {
    await playNativeSound();
  } catch {
    // Native playback failed; nothing else to try.
  }
}
