import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ChangePasswordModal } from '@/components/change-password-modal';
import { EditNameModal } from '@/components/edit-name-modal';
import { RemoveStaffModal } from '@/components/remove-staff-modal';
import { FormField } from '@/components/form-field';
import { SelectField } from '@/components/select-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getRoleLabel } from '@/lib/roles';
import { getSupabaseErrorMessage } from '@/lib/supabase/errors';
import {
  changeManagerPassword,
  fetchStudioManagers,
  inviteManager,
  removeManager,
  updateManagerName,
} from '@/lib/supabase/managers';
import type { ProfileRow, StaffInviteRole } from '@/types/database';

const STAFF_ROLE_OPTIONS = ['Admin', 'Manager'] as const;
type StaffRoleLabel = (typeof STAFF_ROLE_OPTIONS)[number];

function staffRoleToDb(label: StaffRoleLabel): StaffInviteRole {
  return label === 'Admin' ? 'admin' : 'manager';
}

export function ManageRolesSection() {
  const theme = useTheme();
  const { user, refreshUser } = useAuth();
  const [managers, setManagers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRoleLabel>('Manager');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<ProfileRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameTarget, setNameTarget] = useState<ProfileRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [nameError, setNameError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<ProfileRow | null>(null);

  const loadManagers = useCallback(async () => {
    const rows = await fetchStudioManagers();
    setManagers(rows);
  }, []);

  useEffect(() => {
    void loadManagers()
      .catch(() => setError('Unable to load managers.'))
      .finally(() => setLoading(false));
  }, [loadManagers]);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setStaffRole('Manager');
    setError('');
  };

  const handleAddManager = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const role = staffRoleToDb(staffRole);
      await inviteManager({ fullName, email, phone, password, role });
      await loadManagers();
      resetForm();
      setShowAddForm(false);
      setSuccess(
        `${staffRole} account created. They can sign in from the home page.`,
      );
    } catch (err) {
      const message = getSupabaseErrorMessage(err, `Unable to add ${staffRole.toLowerCase()}.`);
      setError(message);
      showMessage(`Unable to add ${staffRole.toLowerCase()}`, message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditName = (manager: ProfileRow) => {
    setNameTarget(manager);
    setEditFullName(manager.full_name || '');
    setNameError('');
    setError('');
    setSuccess('');
  };

  const closeEditName = () => {
    setNameTarget(null);
    setEditFullName('');
    setNameError('');
  };

  const handleEditName = async () => {
    if (!nameTarget) return;

    setNameError('');
    if (!editFullName.trim()) {
      setNameError('Enter a name.');
      return;
    }

    setSubmitting(true);
    try {
      await updateManagerName(nameTarget.id, editFullName);
      await loadManagers();
      if (nameTarget.email.toLowerCase() === user?.username?.toLowerCase()) {
        await refreshUser();
      }
      closeEditName();
      setSuccess(`Name updated for ${nameTarget.email}.`);
    } catch (err) {
      const message = getSupabaseErrorMessage(err, 'Unable to update name.');
      setNameError(message);
      showMessage('Unable to update name', message);
    } finally {
      setSubmitting(false);
    }
  };

  const openChangePassword = (manager: ProfileRow) => {
    setPasswordTarget(manager);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setError('');
    setSuccess('');
  };

  const closeChangePassword = () => {
    setPasswordTarget(null);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleChangePassword = async () => {
    if (!passwordTarget) return;

    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await changeManagerPassword(passwordTarget.id, newPassword);
      closeChangePassword();
      setSuccess(`Password updated for ${passwordTarget.full_name || passwordTarget.email}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to change password.';
      setPasswordError(message);
      showMessage('Unable to change password', message);
    } finally {
      setSubmitting(false);
    }
  };

  const openRemoveStaff = (manager: ProfileRow) => {
    if (manager.role === 'super_admin') return;
    setRemoveTarget(manager);
    setError('');
    setSuccess('');
  };

  const closeRemoveStaff = () => {
    setRemoveTarget(null);
  };

  const handleConfirmRemoveStaff = async () => {
    if (!removeTarget) return;

    setSubmitting(true);
    setError('');
    try {
      await removeManager(removeTarget.id);
      await loadManagers();
      setSuccess('Staff member removed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to remove staff member.';
      setError(message);
      showMessage('Unable to remove staff member', message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText themeColor="textSecondary" style={styles.description}>
        Add and remove studio staff with Admin or Manager roles. admin@groovx.com
        remains the super admin.
      </ThemedText>

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

      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold">Studio Staff</ThemedText>
        <PrimaryButton
          label={showAddForm ? 'Cancel' : 'Add Staff'}
          onPress={() => {
            setShowAddForm((open) => !open);
            setError('');
            setSuccess('');
            if (showAddForm) resetForm();
          }}
          variant="secondary"
          disabled={submitting}
        />
      </View>

      {showAddForm ? (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">New Staff Member</ThemedText>
          <SelectField
            label="Role"
            options={STAFF_ROLE_OPTIONS}
            value={staffRole}
            onChange={setStaffRole}
          />
          <FormField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Studio manager name"
          />
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="manager@groovx.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <FormField
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="+975 XXX XX XXX"
            keyboardType="phone-pad"
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
          />
          <PrimaryButton
            label={submitting ? 'Creating…' : `Create ${staffRole}`}
            onPress={() => void handleAddManager()}
            disabled={submitting}
          />
        </ThemedView>
      ) : null}

      <View style={styles.list}>
        {managers.map((manager) => (
          <ThemedView
            key={manager.id}
            type="backgroundElement"
            style={[styles.managerCard, { borderColor: theme.border }]}>
            <View style={styles.managerInfo}>
              <ThemedText type="smallBold">
                {manager.full_name.trim() || 'No name set'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {manager.email}
              </ThemedText>
              <View style={[styles.roleBadge, { backgroundColor: theme.accentMuted }]}>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  {getRoleLabel(manager.role)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.managerActions}>
              <Pressable
                onPress={() => openEditName(manager)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Edit name"
                style={({ pressed }) => [
                  styles.textAction,
                  { opacity: submitting ? 0.5 : pressed ? 0.7 : 1 },
                ]}>
                <View style={styles.textActionIcon}>
                  <SymbolView
                    name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                    size={16}
                    tintColor={theme.text}
                  />
                </View>
                <ThemedText type="smallBold">Edit Name</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => openChangePassword(manager)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Change password"
                style={({ pressed }) => [
                  styles.textAction,
                  { opacity: submitting ? 0.5 : pressed ? 0.7 : 1 },
                ]}>
                <View style={styles.textActionIcon}>
                  <SymbolView
                    name={{ ios: 'key', android: 'vpn_key', web: 'key' }}
                    size={16}
                    tintColor={theme.accent}
                  />
                </View>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  Change Password
                </ThemedText>
              </Pressable>

              {manager.role !== 'super_admin' ? (
                <Pressable
                  onPress={() => openRemoveStaff(manager)}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Remove staff member"
                  style={({ pressed }) => [
                    styles.textAction,
                    { opacity: submitting ? 0.5 : pressed ? 0.7 : 1 },
                  ]}>
                  <View style={styles.textActionIcon}>
                    <SymbolView
                      name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                      size={16}
                      tintColor={theme.danger}
                    />
                  </View>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    Remove
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </ThemedView>
        ))}
      </View>

      <EditNameModal
        visible={nameTarget != null}
        userLabel={nameTarget?.email || 'user'}
        fullName={editFullName}
        submitting={submitting}
        error={nameError}
        onChangeFullName={setEditFullName}
        onSubmit={() => void handleEditName()}
        onClose={closeEditName}
      />

      <ChangePasswordModal
        visible={passwordTarget != null}
        userLabel={passwordTarget?.full_name || passwordTarget?.email || 'user'}
        password={newPassword}
        confirmPassword={confirmPassword}
        submitting={submitting}
        error={passwordError}
        onChangePassword={setNewPassword}
        onChangeConfirmPassword={setConfirmPassword}
        onSubmit={() => void handleChangePassword()}
        onClose={closeChangePassword}
      />

      <RemoveStaffModal
        visible={removeTarget != null}
        staff={removeTarget}
        onClose={closeRemoveStaff}
        onConfirm={handleConfirmRemoveStaff}
      />
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  managerCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  managerInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    marginTop: Spacing.half,
  },
  managerActions: {
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  textActionIcon: {
    width: 18,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
