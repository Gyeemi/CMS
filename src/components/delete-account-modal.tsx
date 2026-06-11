import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { verifyCurrentUserPassword } from '@/lib/supabase/auth';
import { deleteClientAccount } from '@/lib/supabase/delete-client-account';

type DeleteAccountModalProps = {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
};

export function DeleteAccountModal({ visible, onClose, onDeleted }: DeleteAccountModalProps) {
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

  const handleDelete = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await verifyCurrentUserPassword(password);
      if (!result.ok) {
        setError(result.error || 'Incorrect password.');
        return;
      }

      await deleteClientAccount();
      await onDeleted();
      onClose();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete your account. Please try again.';
      if (
        message.toLowerCase().includes('delete_client_account') ||
        message.toLowerCase().includes('could not find the function')
      ) {
        setError(
          'Account deletion is not set up yet. Ask your studio admin to run supabase/fix-client-account-delete.sql in Supabase.',
        );
        return;
      }
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
                Delete Account
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                This permanently removes your GroovX login for{' '}
                <ThemedText type="smallBold">{user?.username ?? 'this email'}</ThemedText>. Your
                studio project history, payments, and balances stay in the admin portal as a
                walk-in customer record.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Enter your password to confirm.
              </ThemedText>

              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your current password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              {error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              ) : null}

              <View style={styles.actions}>
                <PrimaryButton
                  label="Cancel"
                  variant="secondary"
                  onPress={onClose}
                  disabled={submitting}
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label={submitting ? 'Deleting…' : 'Delete Account'}
                  variant="danger"
                  onPress={handleDelete}
                  disabled={submitting}
                  style={styles.actionButton}
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
    padding: Spacing.four,
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
    fontSize: 22,
    lineHeight: 28,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
});
