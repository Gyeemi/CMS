import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CurrencyField } from '@/components/currency-field';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  EPAYMENT_PLATFORMS,
  formatCurrency,
  getOutstandingBalance,
  getTotalBalancePaid,
  type BalancePaymentMethod,
  type EPaymentPlatform,
  type Project,
} from '@/types/project';

export type BalancePaymentSubmitResult = {
  message: string;
  warning?: string;
};

type MarkBalancePaidModalProps = {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSubmit: (
    method: BalancePaymentMethod,
    details?: {
      paymentRef?: string;
      ePaymentPlatform?: EPaymentPlatform;
      amount: number;
    },
  ) => Promise<BalancePaymentSubmitResult>;
};

export function MarkBalancePaidModal({
  visible,
  project,
  onClose,
  onSubmit,
}: MarkBalancePaidModalProps) {
  const theme = useTheme();
  const [step, setStep] = useState<'method' | 'e_payment'>('method');
  const [ePaymentPlatform, setEPaymentPlatform] = useState<EPaymentPlatform>(EPAYMENT_PLATFORMS[0]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const balanceDue = project ? getOutstandingBalance(project) : 0;
  const alreadyPaid = project ? getTotalBalancePaid(project) : 0;

  useEffect(() => {
    if (!visible) {
      setStep('method');
      setEPaymentPlatform(EPAYMENT_PLATFORMS[0]);
      setPaymentAmount(0);
      setPaymentRef('');
      setError('');
      setWarning('');
      setSubmitting(false);
      return;
    }

    if (!project) return;
    const due = getOutstandingBalance(project);
    setPaymentAmount(due > 0 ? due : 0);
  }, [visible, project?.id, project?.balancePaidAmount, project?.updatedAt]);

  if (!project) return null;

  const validateAmount = (amount: number) => {
    if (amount <= 0) {
      setError('Enter an amount greater than zero.');
      return false;
    }
    if (amount > balanceDue) {
      setError(`Amount cannot exceed the remaining balance of ${formatCurrency(balanceDue)}.`);
      return false;
    }
    return true;
  };

  const remainingAfterPayment = Math.max(0, balanceDue - paymentAmount);

  const runSubmit = async (
    method: BalancePaymentMethod,
    details: {
      amount: number;
      paymentRef?: string;
      ePaymentPlatform?: EPaymentPlatform;
    },
  ) => {
    setSubmitting(true);
    setError('');
    setWarning('');
    try {
      const result = await onSubmit(method, details);
      if (result.warning) setWarning(result.warning);
      onClose();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save the payment. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectCash = () => {
    if (!validateAmount(paymentAmount)) return;
    void runSubmit('cash', { amount: paymentAmount });
  };

  const handleSelectEPayment = () => {
    setError('');
    setWarning('');
    setStep('e_payment');
  };

  const handleConfirmEPayment = () => {
    if (!validateAmount(paymentAmount)) return;

    const ref = paymentRef.trim();
    if (!ref) {
      setError('Enter the payment reference after receiving the transfer.');
      return;
    }
    void runSubmit('e_payment', {
      amount: paymentAmount,
      paymentRef: ref,
      ePaymentPlatform,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={submitting ? undefined : onClose}>
        <Pressable
          style={styles.dialogPressable}
          onPress={(event) => event.stopPropagation()}>
          <ThemedView type="backgroundElement" style={[styles.dialog, { borderColor: theme.border }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              {step === 'method' ? (
                <>
                  <ThemedText type="subtitle" style={styles.title}>
                    Record balance payment
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {project.projectName || 'Untitled Project'} · {formatCurrency(balanceDue)} remaining
                  </ThemedText>
                  {alreadyPaid > 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Already received toward balance: {formatCurrency(alreadyPaid)}
                    </ThemedText>
                  ) : null}

                  <CurrencyField
                    label="Amount received (Nu.)"
                    value={paymentAmount}
                    onChangeValue={(value) => {
                      setPaymentAmount(value);
                      if (error) setError('');
                    }}
                    placeholder={balanceDue > 0 ? formatCurrency(balanceDue) : 'Nu. 0.00'}
                    editable={!submitting}
                    hint="Enter the full or partial payment received."
                  />

                  {paymentAmount > 0 && paymentAmount < balanceDue ? (
                    <ThemedText type="small" style={{ color: theme.warning }}>
                      Remaining after this payment: {formatCurrency(remainingAfterPayment)}
                    </ThemedText>
                  ) : null}

                  {error ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {error}
                    </ThemedText>
                  ) : null}

                  <View style={styles.actions}>
                    <PrimaryButton
                      label={submitting ? 'Recording…' : 'Paid in Cash'}
                      onPress={handleSelectCash}
                      disabled={submitting}
                    />
                    <PrimaryButton
                      label="E-Payment"
                      onPress={handleSelectEPayment}
                      variant="secondary"
                      disabled={submitting}
                    />
                    <PrimaryButton
                      label="Cancel"
                      onPress={onClose}
                      variant="secondary"
                      disabled={submitting}
                    />
                  </View>
                </>
              ) : (
                <>
                  <ThemedText type="subtitle" style={styles.title}>
                    E-Payment received
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Select the payment app and enter the amount received and transfer reference.
                    {alreadyPaid > 0
                      ? ` ${formatCurrency(balanceDue)} is still due after ${formatCurrency(alreadyPaid)} received.`
                      : ` ${formatCurrency(balanceDue)} is due.`}
                  </ThemedText>

                  <CurrencyField
                    label="Amount received (Nu.)"
                    value={paymentAmount}
                    onChangeValue={(value) => {
                      setPaymentAmount(value);
                      if (error) setError('');
                    }}
                    placeholder={balanceDue > 0 ? formatCurrency(balanceDue) : 'Nu. 0.00'}
                    editable={!submitting}
                  />

                  {paymentAmount > 0 && paymentAmount < balanceDue ? (
                    <ThemedText type="small" style={{ color: theme.warning }}>
                      Remaining after this payment: {formatCurrency(remainingAfterPayment)}
                    </ThemedText>
                  ) : null}

                  <SelectField
                    label="Payment App"
                    options={EPAYMENT_PLATFORMS}
                    value={ePaymentPlatform}
                    onChange={setEPaymentPlatform}
                  />

                  <FormField
                    label="Ref-"
                    value={paymentRef}
                    onChangeText={(value) => {
                      setPaymentRef(value);
                      if (error) setError('');
                    }}
                    placeholder="Transaction / reference number"
                    autoCapitalize="characters"
                    editable={!submitting}
                    onSubmitEditing={handleConfirmEPayment}
                    returnKeyType="done"
                  />

                  {error ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {error}
                    </ThemedText>
                  ) : null}

                  {warning ? (
                    <ThemedText type="small" style={{ color: theme.warning }}>
                      {warning}
                    </ThemedText>
                  ) : null}

                  <View style={styles.actions}>
                    <PrimaryButton
                      label={submitting ? 'Recording…' : 'Confirm Payment'}
                      onPress={handleConfirmEPayment}
                      disabled={submitting}
                    />
                    <PrimaryButton
                      label="Back"
                      onPress={() => {
                        setStep('method');
                        setError('');
                        setWarning('');
                      }}
                      variant="secondary"
                      disabled={submitting}
                    />
                  </View>
                </>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
      },
    }),
  },
  dialogPressable: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  scrollContent: {
    gap: Spacing.three,
  },
  dialog: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  actions: {
    gap: Spacing.two,
  },
});
