import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { dropdownPanelShadow } from '@/constants/shadows';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findClientById } from '@/lib/client-storage';
import { formatPhoneForWhatsApp, openWhatsAppChat } from '@/lib/whatsapp';
import type { ClientAccount } from '@/types/client';

const WHATSAPP_GREEN = '#25D366';

type ClientProfileModalProps = {
  visible: boolean;
  clientId: string | null;
  fallbackName?: string;
  fallbackEmail?: string;
  onClose: () => void;
};

export function ClientProfileModal({
  visible,
  clientId,
  fallbackName,
  fallbackEmail,
  onClose,
}: ClientProfileModalProps) {
  const theme = useTheme();
  const [client, setClient] = useState<ClientAccount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !clientId) {
      setClient(null);
      return;
    }

    setLoading(true);
    void findClientById(clientId)
      .then((result) => setClient(result ?? null))
      .finally(() => setLoading(false));
  }, [visible, clientId]);

  const name = client?.fullName ?? fallbackName ?? '—';
  const email = client?.email ?? fallbackEmail ?? '—';
  const phone = client?.phone?.trim() || '';
  const hasWhatsApp = Boolean(phone && formatPhoneForWhatsApp(phone));

  const handleOpenWhatsApp = () => {
    if (!phone) return;
    void openWhatsAppChat(phone, `Hi ${name}, this is GroovX Studio.`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.panel,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <ThemedText type="subtitle" style={styles.title}>
            Client Profile
          </ThemedText>

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading profile…
            </ThemedText>
          ) : (
            <View style={[styles.detailsCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <ProfileRow label="Name" value={name} />
              <WhatsAppRow
                phone={phone}
                hasWhatsApp={hasWhatsApp}
                onPress={handleOpenWhatsApp}
              />
              <ProfileRow label="Email" value={email} />
            </View>
          )}

          {hasWhatsApp ? (
            <Pressable
              onPress={handleOpenWhatsApp}
              style={({ pressed }) => [
                styles.whatsappButton,
                { backgroundColor: WHATSAPP_GREEN, opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Message ${name} on WhatsApp`}>
              <SymbolView
                name={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
                size={18}
                tintColor="#FFFFFF"
              />
              <ThemedText type="smallBold" style={styles.whatsappButtonText}>
                Message on WhatsApp
              </ThemedText>
            </Pressable>
          ) : null}

          <PrimaryButton label="Close" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function WhatsAppRow({
  phone,
  hasWhatsApp,
  onPress,
}: {
  phone: string;
  hasWhatsApp: boolean;
  onPress: () => void;
}) {
  const displayPhone = phone || 'Not provided';

  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        Phone / WhatsApp
      </ThemedText>
      {hasWhatsApp ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.whatsappLink, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="link"
          accessibilityLabel={`Open WhatsApp chat for ${displayPhone}`}>
          <SymbolView
            name={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
            size={16}
            tintColor={WHATSAPP_GREEN}
          />
          <ThemedText type="smallBold" style={{ color: WHATSAPP_GREEN }}>
            {displayPhone}
          </ThemedText>
        </Pressable>
      ) : (
        <ThemedText type="smallBold">{displayPhone}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  panel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.four,
    gap: Spacing.three,
    ...dropdownPanelShadow,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  detailsCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    gap: Spacing.half,
  },
  whatsappLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
  },
});
