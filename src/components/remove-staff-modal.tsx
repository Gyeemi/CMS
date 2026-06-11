import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getRoleLabel } from '@/lib/roles';
import { verifyCurrentUserPassword } from '@/lib/supabase/auth';
import type { ProfileRow } from '@/types/database';

type RemoveStaffModalProps = {
  visible: boolean;
  staff: ProfileRow | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function RemoveStaffModal({ visible, staff, onClose, onConfirm }: RemoveStaffModalProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setError('');
      setSubmitting(false);
    }
  }, [visible]);

  const staffLabel = staff?.full_name?.trim() || staff?.email || 'this staff member';

  const handleRemove = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await verifyCurrentUserPassword(password);
      if (!result.ok) {
        setError(result.error || 'Incorrect password.');
        return;
      }

      await onConfirm();
      onClose();
    } catch (confirmError) {
      const message =
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not remove this staff member. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={submitting ? undefined : onClose}>
      <Pressable style={styles.overlay} onPress={submitting ? undefined : onClose}>
        <Pressable style={styles.dialogPressable} onPress={(event) => event.stopPropagation()}>
          <ThemedView type="backgroundElement" style={[styles.panel, { borderColor: theme.border }]}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <ThemedText type="subtitle" style={styles.title}>
                Remove Staff Member
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                You are about to remove{' '}
                <ThemedText type="smallBold">{staffLabel}</ThemedText>
                {staff ? ` (${getRoleLabel(staff.role)})` : ''}. They will lose studio access
                immediately.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Enter your account password to confirm. Signed in as {user?.username || 'admin'}.
              </ThemedText>

              {error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              ) : null}

              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your login password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!submitting}
                onSubmitEditing={() => void handleRemove()}
              />

              <View style={styles.actions}>
                <PrimaryButton
                  label={submitting ? 'Removing…' : 'Remove Staff'}
                  variant="danger"
                  onPress={() => void handleRemove()}
                  disabled={submitting || !password.trim()}
                />
                <PrimaryButton
                  label="Cancel"
                  variant="secondary"
                  onPress={onClose}
                  disabled={submitting}
                />
              </View>
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  dialogPressable: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  panel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.half,
  },
  actions: {
    gap: Spacing.two,
  },
});
