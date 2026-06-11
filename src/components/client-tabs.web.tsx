import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClientTopBar } from './client-top-bar';
import { GroovXBrand } from './groovx-brand';
import { PrimaryButton } from './primary-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { SidebarProfileAvatar } from './sidebar-profile-avatar';

import { Radius, SidebarWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useTheme } from '@/hooks/use-theme';

const CLIENT_TAB_ROUTES = [
  { name: 'index', href: '/(client)', label: 'My Dashboard', icon: { ios: 'chart.bar', android: 'dashboard', web: 'dashboard' } as const },
  { name: 'bookings', href: '/(client)/bookings', label: 'My Booking', icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' } as const },
  { name: 'projects', href: '/(client)/projects', label: 'My Projects', icon: { ios: 'folder', android: 'folder', web: 'folder' } as const },
  { name: 'profile', href: '/(client)/profile', label: 'Manage Profile', icon: { ios: 'person.circle', android: 'account_circle', web: 'account_circle' } as const },
] as const;

function HiddenTabRoutes() {
  return (
    <TabList style={styles.hiddenTabList}>
      {CLIENT_TAB_ROUTES.map((tab) => (
        <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
      ))}
    </TabList>
  );
}

export default function ClientTabs() {
  const compactLayout = useCompactLayout();

  if (compactLayout) {
    return <ClientMobileWebTabs />;
  }

  return <ClientSidebarTabs />;
}

function ClientSidebarTabs() {
  const theme = useTheme();
  const { signOutToLanding } = useAuth();

  return (
    <Tabs style={styles.sidebarTabs}>
      <HiddenTabRoutes />

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
              {CLIENT_TAB_ROUTES.map((tab) => (
                <TabTrigger key={tab.name} name={tab.name} asChild>
                  <SidebarLink>{tab.label}</SidebarLink>
                </TabTrigger>
              ))}
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

function ClientMobileWebTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.mobileTabs}>
      <HiddenTabRoutes />

      <View style={[styles.mobileContent, { backgroundColor: theme.background }]}>
        <ClientTopBar />
        <TabSlot style={styles.tabSlot} />
      </View>

      <TabList
        style={[
          styles.bottomTabList,
          {
            borderTopColor: theme.border,
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        {CLIENT_TAB_ROUTES.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} asChild>
            <BottomTabLink label={tab.label} icon={tab.icon} />
          </TabTrigger>
        ))}
      </TabList>
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

type BottomTabLinkProps = TabTriggerSlotProps & {
  label: string;
  icon: (typeof CLIENT_TAB_ROUTES)[number]['icon'];
};

function BottomTabLink({ label, icon, isFocused, ...props }: BottomTabLinkProps) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textSecondary;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.bottomTabItem,
        { opacity: pressed ? 0.75 : 1 },
      ]}>
      <SymbolView name={icon} size={22} tintColor={color} />
      <ThemedText
        type="small"
        numberOfLines={1}
        style={[styles.bottomTabLabel, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebarTabs: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  mobileTabs: {
    flex: 1,
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
  mobileContent: {
    flex: 1,
    minHeight: 0,
  },
  tabSlot: {
    flex: 1,
    height: '100%',
  },
  bottomTabList: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    minWidth: 0,
  },
  bottomTabLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
