import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PhoneField } from '@/components/phone-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useStudioSettings } from '@/context/studio-settings-context';
import { useTheme } from '@/hooks/use-theme';
import { formatPhoneDisplay, getPhoneValidationError } from '@/lib/phone-format';
import { verifyCurrentUserPassword } from '@/lib/supabase/auth';
import { getSupabaseErrorMessage } from '@/lib/supabase/errors';

export function ManageStudioSection() {
  const theme = useTheme();
  const { user } = useAuth();
  const { details, isLoading, updateDetails } = useStudioSettings();
  const [unlocked, setUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [licenceNo, setLicenceNo] = useState(details.licenceNo);
  const [tpnNo, setTpnNo] = useState(details.tpnNo);
  const [contactNo, setContactNo] = useState(details.contactNo);
  const [location, setLocation] = useState(details.location);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLicenceNo(details.licenceNo);
    setTpnNo(details.tpnNo);
    setContactNo(details.contactNo);
    setLocation(details.location);
  }, [details]);

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
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!licenceNo.trim() || !tpnNo.trim() || !location.trim()) {
      setError('Licence number, TPN number, and location are required.');
      return;
    }

    const phoneError = getPhoneValidationError(contactNo);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setSubmitting(true);
    try {
      await updateDetails({
        licenceNo: licenceNo.trim(),
        tpnNo: tpnNo.trim(),
        contactNo: formatPhoneDisplay(contactNo),
        location: location.trim(),
      });
      setSuccess('Studio details saved. New invoices will use these details.');
    } catch (err) {
      const message = getSupabaseErrorMessage(err, 'Unable to save studio details.');
      setError(message);
      if (Platform.OS === 'web') {
        window.alert(`Unable to save studio details\n\n${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.container}>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Studio company details are protected. Enter your account password to view and edit them.
        </ThemedText>

        {unlockError ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {unlockError}
          </ThemedText>
        ) : null}

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Unlock Studio Settings</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Signed in as {user?.username || 'super admin'}
          </ThemedText>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.unlockedHeader}>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Company details shown on invoices and printouts.
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

      {success ? (
        <ThemedText type="small" style={{ color: theme.success }}>
          {success}
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Studio Company Details</ThemedText>
        <FormField
          label="Licence No."
          value={licenceNo}
          onChangeText={setLicenceNo}
          placeholder="Business licence number"
        />
        <FormField
          label="TPN No."
          value={tpnNo}
          onChangeText={setTpnNo}
          placeholder="Tax payer number"
        />
        <PhoneField label="Contact No." value={contactNo} onChangeValue={setContactNo} />
        <FormField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Studio address"
          multiline
        />
        <PrimaryButton
          label={submitting ? 'Saving…' : 'Save Studio Details'}
          onPress={() => void handleSave()}
          disabled={submitting}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  description: {
    lineHeight: 22,
    flex: 1,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
