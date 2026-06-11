import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickProfileImageUri } from '@/lib/pick-profile-image';

type ProfileAvatarPickerProps = {
  avatarUrl?: string | null;
  displayName?: string;
  uploading?: boolean;
  onPick: (uri: string) => void | Promise<void>;
};

export function ProfileAvatarPicker({
  avatarUrl,
  displayName,
  uploading = false,
  onPick,
}: ProfileAvatarPickerProps) {
  const theme = useTheme();

  const handlePick = async () => {
    if (uploading) return;

    try {
      const uri = await pickProfileImageUri();
      if (!uri) return;
      await onPick(uri);
    } catch {
      Alert.alert('Upload failed', 'Unable to select a profile picture. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Profile Picture</ThemedText>
      <UserAvatar avatarUrl={avatarUrl} displayName={displayName} size={AVATAR_SIZE} />
      <Pressable
        onPress={() => void handlePick()}
        disabled={uploading}
        style={({ pressed }) => ({ opacity: uploading ? 0.6 : pressed ? 0.7 : 1 })}>
        <ThemedText type="small" style={{ color: theme.link }}>
          {uploading ? 'Uploading image…' : 'Upload image'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const AVATAR_SIZE = 112;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
});
