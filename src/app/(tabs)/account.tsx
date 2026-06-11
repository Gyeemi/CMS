import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  getPayeeDisplayName,
  type StudioPaymentAccount,
  type StudioPaymentAccountInput,
} from '@/constants/studio-payment';
import { useAuth } from '@/context/auth-context';
import {
  createEmptyStudioPaymentForm,
  useStudioPayment,
} from '@/context/studio-payment-context';
import { useTheme } from '@/hooks/use-theme';
import { verifyCurrentUserPassword } from '@/lib/supabase/auth';

export default function AccountDetailsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { accounts, isLoading, addAccount, removeAccount } = useStudioPayment();
  const [unlocked, setUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<StudioPaymentAccountInput>(createEmptyStudioPaymentForm());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const handleUnlock = async () => {
    setUnlockError('');
    setUnlocking(true);
    try {
      const result = await verifyCurrentUserPassword(unlockPassword);
      if (!result.ok) {
        setUnlockError(result.error || 'Incorrect password.');
        return;
      }
      setUnlocked(true);
      setUnlockPassword('');
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    setUnlockPassword('');
    setUnlockError('');
    setSuccess('');
    setShowAddForm(false);
    setForm(createEmptyStudioPaymentForm());
  };

  const openAddForm = () => {
    setSuccess('');
    setForm(createEmptyStudioPaymentForm());
    setShowAddForm(true);
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    setForm(createEmptyStudioPaymentForm());
    setSuccess('');
  };

  const update = <K extends keyof StudioPaymentAccountInput>(
    key: K,
    value: StudioPaymentAccountInput[K],
  ) => {
    setSuccess('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    setSuccess('');
    try {
      const result = await addAccount(form);
      if (!result.ok) {
        Alert.alert('Unable to save', result.error ?? 'Please check the bank details and try again.');
        return;
      }
      setShowAddForm(false);
      setForm(createEmptyStudioPaymentForm());
      setSuccess('Bank details saved successfully.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (account: StudioPaymentAccount) => {
    const confirmMessage = `Remove ${getPayeeDisplayName(account)} (${account.accountNumber})?`;
    let confirmed = false;

    if (Platform.OS === 'web') {
      confirmed = window.confirm(`Remove bank account\n\n${confirmMessage}`);
    } else {
      confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert('Remove bank account', confirmMessage, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
    }

    if (!confirmed) return;

    setSuccess('');
    try {
      await removeAccount(account.id);
      setSuccess('Bank account removed.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to remove this bank account.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Unable to remove', message);
      }
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.three,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        },
      ]}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="subtitle" style={styles.title}>
        Bank Account
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Add studio bank accounts shown to clients when they pay advance.
      </ThemedText>

      {!unlocked ? (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Unlock Bank Accounts</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Bank account details are protected. Enter your account password to view and manage them.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Signed in as {user?.username || 'admin'}
          </ThemedText>
          {unlockError ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {unlockError}
            </ThemedText>
          ) : null}
          <FormField
            label="Password"
            value={unlockPassword}
            onChangeText={setUnlockPassword}
            placeholder="Enter your login password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={() => void handleUnlock()}
          />
          <PrimaryButton
            label={unlocking ? 'Verifying…' : 'Unlock'}
            onPress={() => void handleUnlock()}
            disabled={unlocking || !unlockPassword.trim()}
          />
        </ThemedView>
      ) : (
        <>
      <View style={styles.unlockedHeader}>
        <ThemedText type="small" themeColor="textSecondary">
          Bank accounts unlocked.
        </ThemedText>
        <Pressable
          onPress={handleLock}
          style={({ pressed }) => [
            styles.lockButton,
            { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold">Lock</ThemedText>
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Saved Bank Accounts
          </ThemedText>
          {!showAddForm ? (
            <PrimaryButton label="Add New Account" onPress={openAddForm} disabled={isLoading} />
          ) : null}
        </View>

        {success ? (
          <ThemedText type="small" style={{ color: theme.success }}>
            {success}
          </ThemedText>
        ) : null}

        {accounts.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No bank accounts saved yet. Click Add New Account to add your first bank details.
          </ThemedText>
        ) : (
          <View style={[styles.table, { borderColor: theme.border }]}>
            <View style={[styles.tableHeader, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.colPayee}>
                Payee Name
              </ThemedText>
              <ThemedText type="smallBold" style={styles.colName}>
                Account Name
              </ThemedText>
              <ThemedText type="smallBold" style={styles.colBank}>
                Bank
              </ThemedText>
              <ThemedText type="smallBold" style={styles.colBranch}>
                Branch
              </ThemedText>
              <ThemedText type="smallBold" style={styles.colNumber}>
                Account Number
              </ThemedText>
              <View style={styles.colAction} />
            </View>

            {accounts.map((account) => (
              <View
                key={account.id}
                style={[styles.tableRow, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <ThemedText type="smallBold" style={styles.colPayee}>
                  {getPayeeDisplayName(account)}
                </ThemedText>
                <ThemedText type="small" style={styles.colName}>
                  {account.accountName}
                </ThemedText>
                <ThemedText type="small" style={styles.colBank}>
                  {account.bankName}
                </ThemedText>
                <ThemedText type="small" style={styles.colBranch}>
                  {account.branch}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.colNumber}>
                  {account.accountNumber}
                </ThemedText>
                <View style={styles.colAction}>
                  <PressableRemove onPress={() => void handleRemove(account)} disabled={isLoading} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ThemedView>

      {showAddForm ? (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Bank Details
          </ThemedText>

          <FormField
            label="Payee Name"
            value={form.accountHolder}
            onChangeText={(value) => update('accountHolder', value)}
            placeholder="Nehal Raj Baraily"
            editable={!isLoading && !submitting}
          />
          <FormField
            label="Account Name"
            value={form.accountName}
            onChangeText={(value) => update('accountName', value)}
            placeholder="GroovX Recording Studio"
            editable={!isLoading && !submitting}
          />
          <FormField
            label="Bank Name"
            value={form.bankName}
            onChangeText={(value) => update('bankName', value)}
            placeholder="Bank of Bhutan"
            editable={!isLoading && !submitting}
          />
          <FormField
            label="Branch"
            value={form.branch}
            onChangeText={(value) => update('branch', value)}
            placeholder="Thimphu Main Branch"
            editable={!isLoading && !submitting}
          />
          <FormField
            label="Account Number"
            value={form.accountNumber}
            onChangeText={(value) => update('accountNumber', value)}
            placeholder="1234567890123"
            keyboardType="numeric"
            editable={!isLoading && !submitting}
          />

          <View style={styles.formActions}>
            <PrimaryButton
              label={submitting ? 'Saving…' : 'Save Bank Details'}
              onPress={() => void handleSave()}
              disabled={isLoading || submitting}
            />
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              onPress={closeAddForm}
              disabled={submitting}
            />
          </View>
        </ThemedView>
      ) : null}
        </>
      )}
    </ScrollView>
  );
}

function PressableRemove({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
      <ThemedText type="linkPrimary" style={{ color: theme.danger, fontSize: 13 }}>
        Remove
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  subtitle: {
    marginBottom: Spacing.one,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  lockButton: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 16,
  },
  formActions: {
    gap: Spacing.two,
  },
  table: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colPayee: {
    flex: 1.3,
    minWidth: 110,
  },
  colName: {
    flex: 1.2,
    minWidth: 90,
  },
  colBank: {
    flex: 1.1,
    minWidth: 90,
  },
  colBranch: {
    flex: 1.1,
    minWidth: 90,
  },
  colNumber: {
    flex: 1.2,
    minWidth: 110,
  },
  colAction: {
    width: 64,
    alignItems: 'flex-end',
  },
});
