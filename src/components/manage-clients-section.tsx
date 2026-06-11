import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DeleteWalkInClientModal } from '@/components/delete-walk-in-client-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';
import { formatBhutanPhone } from '@/lib/phone-format';
import {
  canDeleteManageClient,
  fetchManageClients,
  WALK_IN_CUSTOMER_LABEL,
  type ManageClientRow,
} from '@/lib/supabase/manage-clients';
import { deleteWalkInManageClient } from '@/lib/supabase/walk-in-clients-directory';
import {
  isWalkInManageClientPaymentCleared,
  WALK_IN_DELETE_PAYMENT_BLOCKED_MESSAGE,
} from '@/lib/supabase/walk-in-client-delete';

function formatClientPhone(phone: string | null | undefined) {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return '—';
  return formatBhutanPhone(trimmed);
}

function formatClientEmail(client: ManageClientRow) {
  const email = (client.email ?? '').trim();
  if (email) return email;
  if (client.source === 'project') return WALK_IN_CUSTOMER_LABEL;
  return '—';
}

function formatRegisteredDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return formatDisplayDate(date);
}

function showWalkInDeletePaymentBlockedAlert() {
  if (Platform.OS === 'web') {
    window.alert(WALK_IN_DELETE_PAYMENT_BLOCKED_MESSAGE);
    return;
  }

  Alert.alert('Cannot Delete', WALK_IN_DELETE_PAYMENT_BLOCKED_MESSAGE);
}

export function ManageClientsSection() {
  const theme = useTheme();
  const [clients, setClients] = useState<ManageClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ManageClientRow | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const rows = await fetchManageClients();
    setClients(rows);
  }, []);

  const handleDeleteWalkInPress = async (client: ManageClientRow) => {
    setError('');
    try {
      const paymentCleared = await isWalkInManageClientPaymentCleared(client);
      if (!paymentCleared) {
        showWalkInDeletePaymentBlockedAlert();
        return;
      }
      setDeleteTarget(client);
    } catch {
      setError('Unable to verify payment status. Please try again.');
    }
  };

  const handleConfirmDeleteWalkIn = async () => {
    if (!deleteTarget) return;

    const targetId = deleteTarget.id;
    setDeletingClientId(targetId);
    setError('');
    try {
      const paymentCleared = await isWalkInManageClientPaymentCleared(deleteTarget);
      if (!paymentCleared) {
        showWalkInDeletePaymentBlockedAlert();
        setDeleteTarget(null);
        return;
      }

      await deleteWalkInManageClient(deleteTarget);
      setDeleteTarget(null);
      await loadClients();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete this walk-in customer. Run fix-walk-in-client-delete.sql in Supabase if needed.';
      setError(message);
      throw deleteError instanceof Error ? deleteError : new Error(message);
    } finally {
      setDeletingClientId(null);
    }
  };

  useEffect(() => {
    void loadClients()
      .catch(() => setError('Unable to load clients.'))
      .finally(() => setLoading(false));
  }, [loadClients]);

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
        Registered client portal sign-ups and walk-in artists from studio projects appear here.
        Studio staff (admin/manager) are excluded.
      </ThemedText>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <ThemedText type="smallBold">
        {clients.length} client{clients.length === 1 ? '' : 's'}
      </ThemedText>

      {clients.length === 0 ? (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            No clients yet.
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.list}>
          {clients.map((client) => (
            <ThemedView
              key={client.id}
              type="backgroundElement"
              style={[styles.clientCard, { borderColor: theme.border }]}>
              <View style={styles.clientHeader}>
                <ThemedText type="smallBold" style={styles.clientName}>
                  {(client.fullName ?? '').trim() || 'No name set'}
                </ThemedText>
                <View
                  style={[
                    styles.sourceBadge,
                    {
                      backgroundColor:
                        client.source === 'account' ? theme.accentMuted : theme.backgroundSelected,
                    },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{
                      color: client.source === 'account' ? theme.accent : theme.textSecondary,
                    }}>
                    {client.source === 'account' ? 'Account' : 'Walk-In'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {formatClientEmail(client)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {formatClientPhone(client.phone)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {client.source === 'account' ? 'Registered' : 'Added'}:{' '}
                {formatRegisteredDate(client.createdAt)}
              </ThemedText>
              {canDeleteManageClient(client) ? (
                <View style={styles.deleteRow}>
                  <Pressable
                    onPress={() => void handleDeleteWalkInPress(client)}
                    disabled={deletingClientId === client.id}
                    accessibilityRole="button"
                    accessibilityLabel="Delete walk-in customer"
                    style={({ pressed }) => [
                      styles.deleteAction,
                      {
                        opacity:
                          deletingClientId === client.id ? 0.5 : pressed ? 0.7 : 1,
                      },
                    ]}>
                    <SymbolView
                      name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                      size={16}
                      tintColor={theme.danger}
                    />
                    <ThemedText type="smallBold" style={{ color: theme.danger }}>
                      {deletingClientId === client.id ? 'Deleting…' : 'Delete'}
                    </ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </ThemedView>
          ))}
        </View>
      )}

      <DeleteWalkInClientModal
        visible={deleteTarget !== null}
        clientName={deleteTarget?.fullName ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteWalkIn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  container: {
    gap: Spacing.three,
  },
  description: {
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  clientCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  clientName: {
    flex: 1,
  },
  sourceBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  deleteRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.one,
  },
  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
