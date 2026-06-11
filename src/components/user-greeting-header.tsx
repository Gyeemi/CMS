import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { formatKuzooZangpoGreeting } from '@/lib/greeting';

type UserGreetingHeaderProps = {
  style?: StyleProp<TextStyle>;
};

export function UserGreetingHeader({ style }: UserGreetingHeaderProps) {
  const { user } = useAuth();

  return (
    <ThemedText type="subtitle" style={[styles.greeting, style]}>
      {formatKuzooZangpoGreeting(user?.displayName)}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 22,
    lineHeight: 30,
  },
});
