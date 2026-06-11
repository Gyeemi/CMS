import { SymbolView } from 'expo-symbols';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

type LogoutButtonProps = {
  compact?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
};

function confirmLogout(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm('Sign out of GroovX?')) onConfirm();
    return;
  }

  Alert.alert('Logout', 'Sign out of GroovX?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: onConfirm },
  ]);
}

export function LogoutButton({ compact = false, variant = 'secondary' }: LogoutButtonProps) {
  const theme = useTheme();
  const { signOutToLanding, isSigningOut } = useAuth();

  const handlePress = () => {
    if (isSigningOut) return;

    confirmLogout(() => {
      void signOutToLanding();
    });
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isSigningOut}
        accessibilityRole="button"
        accessibilityLabel="Logout"
        style={({ pressed }) => [
          styles.compact,
          (pressed || isSigningOut) && styles.pressed,
        ]}>
        <SymbolView
          name={{
            ios: 'rectangle.portrait.and.arrow.right',
            android: 'logout',
            web: 'logout',
          }}
          size={22}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    );
  }

  return (
    <PrimaryButton
      label={isSigningOut ? 'Signing out…' : 'Logout'}
      variant={variant}
      onPress={handlePress}
      disabled={isSigningOut}
    />
  );
}

const styles = StyleSheet.create({
  compact: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
