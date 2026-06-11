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

type DeleteWalkInClientModalProps = {
  visible: boolean;
  clientName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteWalkInClientModal({
  visible,
  clientName,
  onClose,
  onConfirm,
}: DeleteWalkInClientModalProps) {
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

      await onConfirm();
      onClose();
    } catch (confirmError) {
      const message =
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not delete this walk-in customer. Please try again.';
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
                Delete Walk-In Customer
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                You are about to remove{' '}
                <ThemedText type="smallBold">{clientName || 'this walk-in customer'}</ThemedText>{' '}
                from Manage → Clients. Their studio projects are not deleted.
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
                onSubmitEditing={() => void handleDelete()}
              />

              <View style={styles.actions}>
                <PrimaryButton
                  label={submitting ? 'Deleting…' : 'Delete Walk-In'}
                  variant="danger"
                  onPress={() => void handleDelete()}
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
