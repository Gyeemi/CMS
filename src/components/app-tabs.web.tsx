import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AdminTopBar } from './admin-top-bar';
import { GroovXBrand } from './groovx-brand';
import { PrimaryButton } from './primary-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Radius, SidebarWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();
  const { user, signOutToLanding } = useAuth();
  const showManage = user?.role === 'super_admin';

  return (
    <Tabs style={styles.tabs}>
      <TabList style={styles.hiddenTabList}>
        <TabTrigger name="index" href="/(tabs)" />
        <TabTrigger name="bookings" href="/(tabs)/bookings" />
        <TabTrigger name="account" href="/(tabs)/account" />
        <TabTrigger name="manage" href="/(tabs)/manage" />
        <TabTrigger name="stats" href="/(tabs)/stats" />
      </TabList>

      <ThemedView type="sidebar" style={[styles.sidebar, { borderRightColor: theme.border }]}>
        <View style={styles.sidebarInner}>
          <View style={styles.sidebarTop}>
            <View style={styles.brandBlock}>
              <GroovXBrand fontSize={20} lineHeight={24} />
              <ThemedText type="small" themeColor="textSecondary">
                Studio CMS
              </ThemedText>
            </View>

            <View style={styles.nav}>
              <TabTrigger name="stats" asChild>
                <SidebarLink>Dashboard</SidebarLink>
              </TabTrigger>
              <TabTrigger name="index" asChild>
                <SidebarLink>Projects</SidebarLink>
              </TabTrigger>
              <TabTrigger name="bookings" asChild>
                <SidebarLink>Client Booking</SidebarLink>
              </TabTrigger>
              <TabTrigger name="account" asChild>
                <SidebarLink>Bank Account</SidebarLink>
              </TabTrigger>
              {showManage ? (
                <TabTrigger name="manage" asChild>
                  <SidebarLink>Manage</SidebarLink>
                </TabTrigger>
              ) : null}
            </View>
          </View>

          <View style={styles.sidebarBottom}>
            <PrimaryButton
              label="Logout"
              variant="secondary"
              onPress={() => {
                void signOutToLanding();
              }}
            />
          </View>
        </View>
      </ThemedView>

      <View style={[styles.content, { backgroundColor: theme.background }]}>
        <AdminTopBar />
        <TabSlot style={styles.tabSlot} />
      </View>
    </Tabs>
  );
}

const navItemWebTransition =
  Platform.OS === 'web'
    ? ({
        transitionProperty: 'transform, background-color, opacity',
        transitionDuration: '0.2s',
        transitionTimingFunction: 'ease',
        transformOrigin: 'left center',
      } as const)
    : null;

function SidebarLink({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      {...props}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.navItem,
        navItemWebTransition,
        {
          backgroundColor: isFocused ? theme.accent : hovered ? theme.accentMuted : 'transparent',
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : hovered && !isFocused ? 1.05 : 1 }],
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{
          color: isFocused ? '#FFFFFF' : hovered ? theme.accent : theme.textSecondary,
        }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  hiddenTabList: {
    display: 'none',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  sidebar: {
    width: SidebarWidth,
    borderRightWidth: 1,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  sidebarInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  sidebarTop: {
    gap: Spacing.four,
  },
  sidebarBottom: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
  },
  brandBlock: {
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  nav: {
    gap: Spacing.one,
  },
  navItem: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  tabSlot: {
    flex: 1,
    height: '100%',
  },
});
