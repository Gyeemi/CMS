import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type UserAvatarProps = {
  avatarUrl?: string | null;
  displayName?: string;
  size?: number;
  style?: ViewStyle;
};

function initialsFromName(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function UserAvatar({ avatarUrl, displayName, size = 112, style }: UserAvatarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        },
        style,
      ]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, backgroundColor: theme.accentMuted },
          ]}>
          <ThemedText
            type={size >= 80 ? 'subtitle' : 'smallBold'}
            style={{ color: theme.accent, fontSize: size >= 80 ? undefined : size * 0.34 }}>
            {initialsFromName(displayName)}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
