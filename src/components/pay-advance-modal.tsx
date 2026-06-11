import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import {
  getPayeeDisplayName,
  sortPayeeAccountsForDisplay,
  type StudioPaymentAccount,
} from '@/constants/studio-payment';
import { dropdownPanelShadow } from '@/constants/shadows';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useBookings } from '@/context/bookings-context';
import { useTheme } from '@/hooks/use-theme';
import { loadStudioPaymentAccounts } from '@/lib/studio-payment-storage';
import type { RecordingBooking } from '@/types/client';
import { formatCurrency } from '@/types/project';

type PayAdvanceModalProps = {
  visible: boolean;
  booking: RecordingBooking | null;
  onClose: () => void;
  onPaymentConfirmed?: (booking: RecordingBooking) => void;
};

export function PayAdvanceModal({
  visible,
  booking,
  onClose,
  onPaymentConfirmed,
}: PayAdvanceModalProps) {
  const theme = useTheme();
  const { payAdvance } = useBookings();
  const [accounts, setAccounts] = useState<StudioPaymentAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedAccountId(null);
      setScreenshotUri(null);
      setCopyingId(null);
      setConfirming(false);
      setUploading(false);
      return;
    }

    void loadStudioPaymentAccounts().then(setAccounts);
  }, [visible, booking?.id]);

  const selectedAccount =
    selectedAccountId != null
      ? accounts.find((account) => account.id === selectedAccountId) ?? null
      : null;
  const payeeAccounts = sortPayeeAccountsForDisplay(accounts);

  if (!booking) return null;

  const advanceAmount = booking.requiredAdvance ?? 0;

  const handleCopyAccountNumber = async (account: StudioPaymentAccount) => {
    setCopyingId(account.id);
    try {
      await Clipboard.setStringAsync(account.accountNumber);
      Alert.alert('Copied', 'Account number copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Unable to copy the account number. Please copy it manually.');
    } finally {
      setCopyingId(null);
    }
  };

  const handleUploadScreenshot = async () => {
    setUploading(true);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permission needed',
            'Allow photo library access to upload your payment screenshot.',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;
      setScreenshotUri(uri);
    } catch {
      Alert.alert('Upload failed', 'Unable to select a payment screenshot. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (advanceAmount <= 0) {
      Alert.alert('Payment unavailable', 'The studio has not set an advance amount yet.');
      return;
    }
    if (!screenshotUri) {
      Alert.alert('Screenshot required', 'Upload a payment screenshot before submitting.');
      return;
    }

    setConfirming(true);
    try {
      const result = await payAdvance(booking.id, screenshotUri);
      if (!result.ok) {
        Alert.alert('Payment failed', result.error ?? 'Unable to submit payment.');
        return;
      }
      onClose();
      if (result.booking) onPaymentConfirmed?.(result.booking);
      Alert.alert(
        'Payment submitted',
        'Your payment is awaiting confirmation. Fill in your project details next so the studio can prepare your session.',
      );
    } catch {
      Alert.alert('Payment failed', 'Unable to record advance payment.');
    } finally {
      setConfirming(false);
    }
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
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ThemedText type="subtitle" style={styles.title}>
              Pay Advance
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {selectedAccount
                ? `Transfer ${formatCurrency(advanceAmount)} to ${getPayeeDisplayName(selectedAccount)} to start your ${booking.projectType} project.`
                : `Transfer ${formatCurrency(advanceAmount)} to start your ${booking.projectType} project. Choose who you would like to pay.`}
            </ThemedText>

            <View
              style={[
                styles.amountCard,
                { backgroundColor: theme.accentMuted, borderColor: theme.accent },
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                Amount to pay
              </ThemedText>
              <ThemedText type="subtitle" style={{ color: theme.accent }}>
                {formatCurrency(advanceAmount)}
              </ThemedText>
            </View>

            {!selectedAccount ? (
              <View
                style={[
                  styles.detailsCard,
                  { borderColor: theme.border, backgroundColor: theme.background },
                ]}>
                <ThemedText type="smallBold" style={styles.detailsTitle}>
                  Choose who to pay
                </ThemedText>
                {accounts.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    The studio has not added bank details yet. Please contact the studio.
                  </ThemedText>
                ) : (
                  <View style={styles.payeeButtons}>
                    {payeeAccounts.map((account) => (
                      <PrimaryButton
                        key={account.id}
                        style={styles.payeeButton}
                        label={getPayeeDisplayName(account)}
                        onPress={() => {
                          setSelectedAccountId(account.id);
                          setScreenshotUri(null);
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    setSelectedAccountId(null);
                    setScreenshotUri(null);
                  }}
                  style={({ pressed }) => [
                    styles.backLink,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a different payee">
                  <SymbolView
                    name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                    size={16}
                    tintColor={theme.accent}
                  />
                  <ThemedText type="linkPrimary" style={{ color: theme.accent }}>
                    Choose a different payee
                  </ThemedText>
                </Pressable>

                <View
                  style={[
                    styles.detailsCard,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}>
                  <ThemedText type="smallBold" style={styles.detailsTitle}>
                    Account Details — {getPayeeDisplayName(selectedAccount)}
                  </ThemedText>
                  <View style={styles.accountBlock}>
                    <AccountDetailRow label="Account Name" value={selectedAccount.accountName} />
                    <AccountDetailRow label="Bank" value={selectedAccount.bankName} />
                    <AccountDetailRow label="Branch" value={selectedAccount.branch} />
                    <View style={styles.accountNumberRow}>
                      <View style={styles.accountNumberText}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Account Number
                        </ThemedText>
                        <ThemedText type="smallBold">{selectedAccount.accountNumber}</ThemedText>
                      </View>
                      <Pressable
                        onPress={() => void handleCopyAccountNumber(selectedAccount)}
                        disabled={copyingId === selectedAccount.id}
                        style={({ pressed }) => [
                          styles.copyButton,
                          {
                            backgroundColor: theme.accent,
                            opacity: copyingId === selectedAccount.id ? 0.6 : pressed ? 0.85 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Copy account number">
                        <SymbolView
                          name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
                          size={16}
                          tintColor="#FFFFFF"
                        />
                        <ThemedText type="smallBold" style={styles.copyLabel}>
                          Copy
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.uploadCard,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}>
                  <ThemedText type="smallBold" style={styles.detailsTitle}>
                    Payment Screenshot
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Upload a screenshot of your bank transfer so the studio can verify your payment.
                  </ThemedText>

                  {screenshotUri ? (
                    <View style={styles.previewWrap}>
                      <Image
                        source={{ uri: screenshotUri }}
                        style={styles.preview}
                        contentFit="contain"
                      />
                      <View style={styles.previewActions}>
                        <PrimaryButton
                          label="Change Screenshot"
                          variant="secondary"
                          onPress={() => void handleUploadScreenshot()}
                          disabled={uploading || confirming}
                        />
                        <PrimaryButton
                          label="Remove"
                          variant="danger"
                          onPress={() => setScreenshotUri(null)}
                          disabled={uploading || confirming}
                        />
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => void handleUploadScreenshot()}
                      disabled={uploading || confirming}
                      style={({ pressed }) => [
                        styles.uploadDropzone,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.backgroundInput,
                          opacity: uploading || confirming ? 0.6 : pressed ? 0.85 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Upload payment screenshot">
                      <SymbolView
                        name={{
                          ios: 'photo.on.rectangle.angled',
                          android: 'upload_file',
                          web: 'upload_file',
                        }}
                        size={28}
                        tintColor={theme.accent}
                      />
                      <ThemedText type="smallBold" style={{ color: theme.accent }}>
                        {uploading ? 'Opening gallery…' : 'Upload Payment Screenshot'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.uploadHint}>
                        PNG, JPG, or screenshot from your banking app
                      </ThemedText>
                    </Pressable>
                  )}
                </View>

                <ThemedText type="small" themeColor="textSecondary">
                  After transferring and uploading your screenshot, tap I've Made Payment so the
                  studio can verify and start your project.
                </ThemedText>

                <View style={styles.actions}>
                  <PrimaryButton
                    label={confirming ? 'Submitting…' : "I've Made Payment"}
                    onPress={() => void handleConfirmPayment()}
                    disabled={confirming || uploading || !screenshotUri}
                  />
                </View>
              </>
            )}

            <View style={styles.actions}>
              <PrimaryButton
                label="Close"
                variant="secondary"
                onPress={onClose}
                disabled={confirming}
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AccountDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
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
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: Radius.md,
    ...dropdownPanelShadow,
  },
  scroll: {
    maxHeight: '100%',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  amountCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
    alignItems: 'center',
  },
  detailsCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  uploadCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailsTitle: {
    fontSize: 15,
  },
  payeeButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  payeeButton: {
    flex: 1,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  accountBlock: {
    gap: Spacing.two,
  },
  detailRow: {
    gap: Spacing.half,
  },
  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
  accountNumberText: {
    flex: 1,
    gap: Spacing.half,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  copyLabel: {
    color: '#FFFFFF',
  },
  uploadDropzone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  uploadHint: {
    textAlign: 'center',
  },
  previewWrap: {
    gap: Spacing.two,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    backgroundColor: '#00000020',
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
});
