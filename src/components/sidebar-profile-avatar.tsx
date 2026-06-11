import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';

import { ProfileImageCropModal } from '@/components/profile-image-crop-modal';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { pickProfileImageUri } from '@/lib/pick-profile-image';
import { uploadProfileAvatar } from '@/lib/supabase/profile-avatars';
import { updateClientAvatarUrl } from '@/lib/supabase/profiles';

const DEFAULT_AVATAR_SIZE = 96;

const avatarWebTransition =
  Platform.OS === 'web'
    ? ({
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.25s',
        transitionTimingFunction: 'ease',
      } as const)
    : null;

type SidebarProfileAvatarProps = {
  size?: number;
};

export function SidebarProfileAvatar({ size = DEFAULT_AVATAR_SIZE }: SidebarProfileAvatarProps) {
  const theme = useTheme();
  const { user, refreshUser } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [cropUri, setCropUri] = useState<string | null>(null);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl);
  }, [user?.avatarUrl]);

  const uploadImage = async (uri: string) => {
    if (!user?.clientId) return;

    setUploading(true);
    try {
      const publicUrl = await uploadProfileAvatar(user.clientId, uri);
      await updateClientAvatarUrl(user.clientId, publicUrl);
      setAvatarUrl(publicUrl);
      await refreshUser();
    } catch (err) {
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Unable to upload profile picture.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handlePress = async () => {
    if (uploading || !user?.clientId) return;

    try {
      const uri = await pickProfileImageUri();
      if (!uri) return;

      if (Platform.OS === 'web') {
        setCropUri(uri);
        return;
      }

      await uploadImage(uri);
    } catch (err) {
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Unable to upload profile picture.',
      );
    }
  };

  const handleCropConfirm = async (croppedUri: string) => {
    setCropUri(null);
    await uploadImage(croppedUri);
  };

  return (
    <>
      <Pressable
        onPress={() => void handlePress()}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Upload profile picture"
        style={({ pressed }) => [
          styles.button,
          { borderRadius: size / 2 },
          avatarWebTransition,
          {
            opacity: uploading ? 0.7 : pressed ? 0.9 : 1,
            transform: [{ scale: hovered ? 1.1 : pressed ? 1.05 : 1 }],
            ...(Platform.OS === 'web' && hovered
              ? { boxShadow: `0 0 22px ${theme.accent}` }
              : { boxShadow: 'none' }),
          },
        ]}>
        <UserAvatar
          avatarUrl={avatarUrl}
          displayName={user?.displayName}
          size={size}
        />
      </Pressable>

      <ProfileImageCropModal
        visible={cropUri != null}
        imageUri={cropUri}
        onClose={() => setCropUri(null)}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
});
