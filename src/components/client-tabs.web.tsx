import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ClientTopBar } from './client-top-bar';
import { GroovXBrand } from './groovx-brand';
import { PrimaryButton } from './primary-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { SidebarProfileAvatar } from './sidebar-profile-avatar';

import { Radius, SidebarWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function ClientTabs() {
  const theme = useTheme();
  const { user, signOutToLanding } = useAuth();

  return (
    <Tabs style={styles.tabs}>
      <TabList style={styles.hiddenTabList}>
        <TabTrigger name="index" href="/(client)" />
        <TabTrigger name="bookings" href="/(client)/bookings" />
        <TabTrigger name="projects" href="/(client)/projects" />
        <TabTrigger name="profile" href="/(client)/profile" />
      </TabList>

      <ThemedView type="sidebar" style={[styles.sidebar, { borderRightColor: theme.border }]}>
        <View style={styles.sidebarInner}>
          <View style={styles.sidebarTop}>
            <View style={styles.brandBlock}>
              <GroovXBrand fontSize={20} lineHeight={24} />
              <ThemedText type="small" themeColor="textSecondary">
                Client Portal
              </ThemedText>
            </View>

            <View style={styles.userBlock}>
              <SidebarProfileAvatar />
            </View>

            <View style={styles.nav}>
              <TabTrigger name="index" asChild>
                <SidebarLink>My Dashboard</SidebarLink>
              </TabTrigger>
              <TabTrigger name="bookings" asChild>
                <SidebarLink>My Booking</SidebarLink>
              </TabTrigger>
              <TabTrigger name="projects" asChild>
                <SidebarLink>My Total Projects</SidebarLink>
              </TabTrigger>
              <TabTrigger name="profile" asChild>
                <SidebarLink>Manage Profile</SidebarLink>
              </TabTrigger>
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
        <ClientTopBar />
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
  userBlock: {
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    width: '100%',
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
