import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { useTheme } from '@/hooks/use-theme';

export function InstallAppButton() {
  const theme = useTheme();
  const { showInstallOption, isIos, hasNativePrompt, install } = usePwaInstall();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const [genericHelpOpen, setGenericHelpOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!showInstallOption) {
    return null;
  }

  const handlePress = async () => {
    if (isIos) {
      setIosHelpOpen(true);
      return;
    }

    if (!hasNativePrompt) {
      setGenericHelpOpen(true);
      return;
    }

    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => void handlePress()}
        disabled={installing}
        accessibilityRole="button"
        accessibilityLabel="Install GroovX app"
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
            opacity: installing ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}>
        <View style={styles.iconSlot}>
          <SymbolView
            name={{ ios: 'arrow.down.app', android: 'download', web: 'download' }}
            size={20}
            tintColor={theme.accent}
          />
        </View>
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          {installing ? 'Opening installer…' : 'Install App'}
        </ThemedText>
      </Pressable>

      <Modal
        visible={iosHelpOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIosHelpOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setIosHelpOpen(false)}>
          <Pressable style={styles.dialogPressable} onPress={(event) => event.stopPropagation()}>
            <ThemedView type="backgroundElement" style={[styles.dialog, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">Install GroovX on iPhone</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpLine}>
                1. Tap the Share button in Safari (square with an arrow).
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpLine}>
                2. Scroll down and tap Add to Home Screen.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpLine}>
                3. Tap Add to install GroovX like an app.
              </ThemedText>
              <PrimaryButton label="Got it" onPress={() => setIosHelpOpen(false)} />
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={genericHelpOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGenericHelpOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setGenericHelpOpen(false)}>
          <Pressable style={styles.dialogPressable} onPress={(event) => event.stopPropagation()}>
            <ThemedView type="backgroundElement" style={[styles.dialog, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">Install GroovX</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpLine}>
                Open your browser menu and choose Install app or Add to Home screen.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpLine}>
                In Chrome or Edge, you may also see an install icon in the address bar.
              </ThemedText>
              <PrimaryButton label="Got it" onPress={() => setGenericHelpOpen(false)} />
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  iconSlot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialogPressable: {
    width: '100%',
    maxWidth: 420,
  },
  dialog: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  helpLine: {
    lineHeight: 22,
  },
});
