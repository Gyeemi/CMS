import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClientNotificationBell } from '@/components/client-notification-bell';
import { LogoutButton } from '@/components/logout-button';
import { SidebarProfileAvatar } from '@/components/sidebar-profile-avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Spacing } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useTheme } from '@/hooks/use-theme';

const TOP_BAR_AVATAR_SIZE = 36;

export function ClientTopBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const compactLayout = useCompactLayout();
  const showProfileAvatar = Platform.OS !== 'web' || compactLayout;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + Spacing.two,
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        },
      ]}>
      {showProfileAvatar ? (
        <SidebarProfileAvatar size={TOP_BAR_AVATAR_SIZE} />
      ) : (
        <View style={styles.spacer} />
      )}
      <View style={styles.spacer} />
      <View style={styles.actions}>
        {showProfileAvatar ? <LogoutButton compact /> : null}
        <ThemeToggle compact />
        <ClientNotificationBell />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 50,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
});
