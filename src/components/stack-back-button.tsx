import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { goBackOrReplace } from '@/lib/navigation';

type StackBackButtonProps = {
  fallback?: Parameters<typeof goBackOrReplace>[0];
};

export function StackBackButton({ fallback = '/(tabs)' }: StackBackButtonProps) {
  return (
    <Pressable
      onPress={() => goBackOrReplace(fallback)}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <ThemedText type="linkPrimary">Back</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
