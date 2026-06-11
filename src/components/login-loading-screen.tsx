import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroovXBrand } from '@/components/groovx-brand';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatKuzooZangpoGreeting } from '@/lib/greeting';

type LoginLoadingScreenProps = {
  userName?: string;
};

export function LoginLoadingScreen({ userName }: LoginLoadingScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[
        styles.page,
        {
          paddingTop: insets.top + Spacing.five,
          paddingBottom: insets.bottom + Spacing.five,
        },
      ]}>
      <View style={styles.content}>
        <GroovXBrand fontSize={56} lineHeight={60} />
        <ThemedText type="subtitle" style={styles.greeting}>
          {formatKuzooZangpoGreeting(userName)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          Loading your dashboard…
        </ThemedText>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  greeting: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    maxWidth: 480,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
