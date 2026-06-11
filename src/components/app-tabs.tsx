import { useColorScheme } from '@/hooks/use-color-scheme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { user } = useAuth();
  const showManage = user?.role === 'super_admin';

  return (
    <NativeTabs
      backgroundColor={colors.background}
      disableIndicator
      tintColor={colors.accent}
      labelVisibilityMode="labeled"
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.accent },
      }}>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="dashboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Projects</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="folder" md="folder" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bookings">
        <NativeTabs.Trigger.Label>Client Booking</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Bank Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.circle" md="account_balance" />
      </NativeTabs.Trigger>

      {showManage ? (
        <NativeTabs.Trigger name="manage">
          <NativeTabs.Trigger.Label>Manage</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="gearshape" md="admin_panel_settings" />
        </NativeTabs.Trigger>
      ) : null}
    </NativeTabs>
  );
}
