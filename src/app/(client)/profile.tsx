import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChangePasswordModal } from '@/components/change-password-modal';
import { DeleteAccountModal } from '@/components/delete-account-modal';
import { FormField } from '@/components/form-field';
import { PhoneField } from '@/components/phone-field';
import { LogoutButton } from '@/components/logout-button';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { joinNameParts } from '@/lib/name-format';
import { formatPhoneDisplay, getDefaultPhoneValue, getPhoneValidationError } from '@/lib/phone-format';
import { supabase } from '@/lib/supabase';
import { getSupabaseErrorMessage } from '@/lib/supabase/errors';
import {
    findClientById,
    getClientNameParts,
    getClientUsername,
    updateClientProfile,
} from '@/lib/supabase/profiles';

type ProfileFormState = {
  userName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
};

export default function ClientProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, signOutToLanding } = useAuth();
  const [userName, setUserName] = useState(user?.displayName ?? '');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(getDefaultPhoneValue());
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState<ProfileFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const applyProfileForm = useCallback((form: ProfileFormState) => {
    setUserName(form.userName);
    setFirstName(form.firstName);
    setMiddleName(form.middleName);
    setLastName(form.lastName);
    setPhone(form.phone);
  }, []);

  const loadProfile = useCallback(async () => {
    if (!user?.clientId) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const client = await findClientById(user.clientId);
      if (!client) return;

      const [authUsername, nameParts] = await Promise.all([
        getClientUsername(),
        getClientNameParts(client.fullName),
      ]);

      const form: ProfileFormState = {
        userName: authUsername || nameParts.firstName || client.fullName,
        firstName: nameParts.firstName,
        middleName: nameParts.middleName,
        lastName: nameParts.lastName,
        phone: client.phone?.trim() ? formatPhoneDisplay(client.phone) : getDefaultPhoneValue(),
      };

      applyProfileForm(form);
      setSavedProfile(form);
    } finally {
      setLoadingProfile(false);
    }
  }, [applyProfileForm, user?.clientId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    setSuccess('');
    setError('');

    if (!user?.clientId) return;
    if (!userName.trim()) {
      setError('Enter your user name.');
      return;
    }
    if (!firstName.trim()) {
      setError('Enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      setError('Enter your last name.');
      return;
    }
    const phoneError = getPhoneValidationError(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setSaving(true);
    try {
      await updateClientProfile(user.clientId, {
        username: userName,
        firstName,
        middleName,
        lastName,
        phone,
      });
      await refreshUser();
      const form: ProfileFormState = {
        userName: userName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        phone,
      };
      setSavedProfile(form);
      setEditingProfile(false);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (savedProfile) {
      applyProfileForm(savedProfile);
    }
    setError('');
    setSuccess('');
    setEditingProfile(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw new Error(getSupabaseErrorMessage(updateError, 'Unable to change password.'));
      }

      setPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const displayName =
    savedProfile != null
      ? joinNameParts({
          firstName: savedProfile.firstName,
          middleName: savedProfile.middleName,
          lastName: savedProfile.lastName,
        }) || savedProfile.userName
      : user?.displayName ?? '—';

  return (
    <>
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
          Manage Profile
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Update your contact details and account password.
        </ThemedText>

        <ThemedView style={[styles.card, { borderColor: theme.border }]}>
          {loadingProfile ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading profile…
            </ThemedText>
          ) : (
            <>
              {editingProfile ? (
                <>
                  <ThemedText type="smallBold">Edit Profile</ThemedText>
                  <FormField
                    label="User Name"
                    value={userName}
                    onChangeText={setUserName}
                    placeholder="Display name"
                  />
                  <FormField
                    label="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    autoCapitalize="words"
                  />
                  <FormField
                    label="Middle Name"
                    value={middleName}
                    onChangeText={setMiddleName}
                    placeholder="Optional"
                    autoCapitalize="words"
                  />
                  <FormField
                    label="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    autoCapitalize="words"
                  />
                  <FormField label="Email" value={user?.username ?? ''} editable={false} />
                  <PhoneField
                    label="Phone / WhatsApp"
                    value={phone}
                    onChangeValue={setPhone}
                  />

                  {error ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {error}
                    </ThemedText>
                  ) : null}

                  <View style={styles.editActions}>
                    <PrimaryButton
                      label="Cancel"
                      variant="secondary"
                      onPress={handleCancelEdit}
                      disabled={saving}
                      style={styles.editActionButton}
                    />
                    <PrimaryButton
                      label={saving ? 'Saving…' : 'Save Profile'}
                      onPress={handleSaveProfile}
                      disabled={saving}
                      style={styles.editActionButton}
                    />
                  </View>
                </>
              ) : (
                <>
                  <ThemedText type="smallBold">Profile</ThemedText>
                  <ProfileSummaryRow label="Full Name" value={displayName} />
                  <ProfileSummaryRow label="User Name" value={savedProfile?.userName ?? userName} />
                  <ProfileSummaryRow label="Email" value={user?.username ?? '—'} />
                  <ProfileSummaryRow label="Phone / WhatsApp" value={savedProfile?.phone ?? phone} />

                  {success ? (
                    <ThemedText type="small" style={{ color: theme.success }}>
                      {success}
                    </ThemedText>
                  ) : null}

                  <PrimaryButton label="Edit Profile" onPress={() => setEditingProfile(true)} />
                </>
              )}

              <PrimaryButton
                label="Change Password"
                variant="secondary"
                onPress={() => {
                  setPasswordError('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordOpen(true);
                }}
              />
              <PrimaryButton
                label="Delete Account"
                variant="danger"
                onPress={() => setDeleteAccountOpen(true)}
              />
              <LogoutButton variant="danger" />
            </>
          )}
        </ThemedView>
      </ScrollView>

      <DeleteAccountModal
        visible={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onDeleted={signOutToLanding}
      />

      <ChangePasswordModal
        visible={passwordOpen}
        userLabel={user?.displayName ?? user?.username ?? 'your account'}
        password={newPassword}
        confirmPassword={confirmPassword}
        submitting={passwordSubmitting}
        error={passwordError}
        onChangePassword={setNewPassword}
        onChangeConfirmPassword={setConfirmPassword}
        onSubmit={handleChangePassword}
        onClose={() => setPasswordOpen(false)}
      />
    </>
  );
}

function ProfileSummaryRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.summaryRow, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value.trim() || '—'}</ThemedText>
    </View>
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
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  summaryRow: {
    gap: Spacing.half,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editActionButton: {
    flex: 1,
  },
});
