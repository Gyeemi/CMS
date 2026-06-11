import { SymbolView } from 'expo-symbols';
import type { SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ManageClientsSection } from '@/components/manage-clients-section';
import { ManageOfficeSection } from '@/components/manage-office-section';
import { ManageRolesSection } from '@/components/manage-roles-section';
import { ManageStudioSection } from '@/components/manage-studio-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

type ManageSection = 'roles' | 'studio' | 'office' | 'clients';

type SectionConfig = {
  id: ManageSection;
  label: string;
  icon: SymbolViewProps['name'];
};

const SECTIONS: SectionConfig[] = [
  {
    id: 'roles',
    label: 'Manage Roles',
    icon: { ios: 'person.2', android: 'group', web: 'group' },
  },
  {
    id: 'studio',
    label: 'Manage Studio',
    icon: { ios: 'building.2', android: 'business', web: 'business' },
  },
  {
    id: 'office',
    label: 'Manage Office',
    icon: { ios: 'doc.text', android: 'description', web: 'description' },
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: { ios: 'person.3', android: 'people', web: 'people' },
  },
];

const TAB_SPRING = { damping: 16, stiffness: 220, mass: 0.7 };
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.6 };
const TAB_ICON_SIZE = 18;
const TAB_FONT_SIZE = 15;
const TAB_LINE_HEIGHT = 22;

type ManageSectionTabProps = {
  selected: boolean;
  label: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
};

function ManageSectionTab({ selected, label, icon, onPress }: ManageSectionTabProps) {
  const theme = useTheme();
  const color = selected ? theme.accent : theme.textSecondary;
  const activeProgress = useSharedValue(selected ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    activeProgress.value = withSpring(selected ? 1 : 0, TAB_SPRING);
  }, [activeProgress, selected]);

  const animatedStyle = useAnimatedStyle(() => {
    const activeScale = interpolate(activeProgress.value, [0, 1], [0.94, 1.08]);
    return {
      transform: [{ scale: activeScale * pressScale.value }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.94, PRESS_SPRING);
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, PRESS_SPRING);
      }}
      style={styles.sectionTabPressable}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}>
      <Animated.View style={[styles.sectionTab, animatedStyle]}>
        <View style={styles.sectionTabIcon}>
          <SymbolView name={icon} size={TAB_ICON_SIZE} tintColor={color} />
        </View>
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          style={{ color, fontSize: TAB_FONT_SIZE, lineHeight: TAB_LINE_HEIGHT }}>
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

export default function ManageScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [section, setSection] = useState<ManageSection>('roles');

  if (user?.role !== 'super_admin') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Only the super admin can access Manage.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.six,
        },
      ]}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="subtitle" style={styles.title}>
        Manage
      </ThemedText>

      <View style={styles.sectionTabsBlock}>
        <View style={styles.sectionTabs}>
          {SECTIONS.flatMap(({ id, label, icon }, index) => {
            const nodes = [
              <View key={id} style={styles.sectionTabSlot}>
                <ManageSectionTab
                  selected={section === id}
                  label={label}
                  icon={icon}
                  onPress={() => setSection(id)}
                />
              </View>,
            ];

            if (index > 0) {
              nodes.unshift(
                <View
                  key={`divider-${id}`}
                  style={[styles.sectionTabDivider, { backgroundColor: theme.border }]}
                />,
              );
            }

            return nodes;
          })}
        </View>
        <View style={[styles.sectionTabsDivider, { backgroundColor: theme.border }]} />
      </View>

      <View style={section === 'roles' ? undefined : styles.sectionHidden}>
        <ManageRolesSection />
      </View>
      <View style={section === 'studio' ? undefined : styles.sectionHidden}>
        <ManageStudioSection />
      </View>
      <View style={section === 'office' ? undefined : styles.sectionHidden}>
        <ManageOfficeSection />
      </View>
      <View style={section === 'clients' ? undefined : styles.sectionHidden}>
        <ManageClientsSection />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  sectionTabsBlock: {
    gap: Spacing.three,
  },
  sectionTabs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTabSlot: {
    flex: 1,
    minWidth: 132,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTabDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    flexShrink: 0,
    alignSelf: 'center',
  },
  sectionTabsDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  sectionHidden: {
    display: 'none',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionTabIcon: {
    width: 22,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
