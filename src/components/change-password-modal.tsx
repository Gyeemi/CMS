import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChangePasswordModalProps = {
  visible: boolean;
  userLabel: string;
  password: string;
  confirmPassword: string;
  submitting: boolean;
  error?: string;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function ChangePasswordModal({
  visible,
  userLabel,
  password,
  confirmPassword,
  submitting,
  error,
  onChangePassword,
  onChangeConfirmPassword,
  onSubmit,
  onClose,
}: ChangePasswordModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialogPressable} onPress={(event) => event.stopPropagation()}>
          <ThemedView type="backgroundElement" style={[styles.dialog, { borderColor: theme.border }]}>
            <ThemedText type="subtitle" style={styles.title}>
              Change Password
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Set a new password for {userLabel}.
            </ThemedText>

            <FormField
              label="New Password"
              value={password}
              onChangeText={onChangePassword}
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
            />
            <FormField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={onChangeConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}

            <View style={styles.actions}>
              <PrimaryButton
                label={submitting ? 'Saving…' : 'Save Password'}
                onPress={onSubmit}
                disabled={submitting}
              />
              <PrimaryButton label="Cancel" onPress={onClose} variant="secondary" disabled={submitting} />
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialogPressable: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  dialog: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  actions: {
    gap: Spacing.two,
  },
});
