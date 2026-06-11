import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { CurrencyText } from '@/components/currency-text';
import { BalancePaymentHistory } from '@/components/balance-payment-history';
import { PartialBalancePaymentStatus } from '@/components/partial-balance-payment-status';
import { ProductionStatusTag } from '@/components/production-status-tag';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  calculateGst,
  getDisplayAdvancePayment,
  getFullProjectPayment,
  getOutstandingBalance,
  isGstEnabled,
  hasBalancePaymentHistory,
  hasPartialBalancePayment,
  isProjectBalancePaid,
  type Project,
} from '@/types/project';

type ProjectCardProps = {
  project: Project;
  onPress: () => void;
  onMarkPaid?: (project: Project) => void;
  markingPaid?: boolean;
};

export function ProjectCard({ project, onPress, onMarkPaid, markingPaid }: ProjectCardProps) {
  const theme = useTheme();
  const gst = calculateGst(project);
  const gstOn = isGstEnabled(project);
  const balancePaid = isProjectBalancePaid(project);
  const outstandingBalance = getOutstandingBalance(project);
  const netAmount = getFullProjectPayment(project);
  const hasDiscount = project.discount > 0;
  const hasHistory = hasBalancePaymentHistory(project);
  const isPartial = hasPartialBalancePayment(project);

  const balanceCell = (
    <AmountCell
      variant="balance"
      label="Remaining Balance"
      amount={outstandingBalance}
      highlight={!balancePaid && outstandingBalance > 0}
      paid={balancePaid}
      fullWidth={hasHistory}
    />
  );

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {project.projectName || 'Untitled Project'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {project.artistName || 'No artist'} · {project.producer || 'No producer'}
            </ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.accentMuted }]}>
            <ThemedText type="small" style={{ color: theme.accent }}>
              {project.projectCategory}
            </ThemedText>
          </View>
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {project.projectType}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {project.audioCopyright}
          </ThemedText>
        </View>

        <ProductionStatusTag status={project.productionStatus} />

        <View style={[styles.amounts, { borderTopColor: theme.border }]}>
          <AmountCell variant="amount" label="Amount" amount={project.projectAmount} />
          {hasDiscount ? (
            <AmountCell variant="discount" label="Discount" amount={project.discount} />
          ) : null}
          {hasDiscount ? (
            <AmountCell variant="net" label="Net Amount" amount={netAmount} />
          ) : null}
          <AmountCell
            variant="advance"
            label="Advance"
            amount={getDisplayAdvancePayment(project)}
          />
          {isPartial && !hasHistory ? (
            <PartialBalancePaymentStatus project={project} inline />
          ) : null}
          {!hasHistory ? balanceCell : null}
          {gstOn ? (
            <AmountCell variant="gst" label="GST 5%" amount={gst} />
          ) : null}
        </View>
      </Pressable>

      {hasHistory ? <BalancePaymentHistory project={project} /> : null}
      {hasHistory ? balanceCell : null}

      {!balancePaid && onMarkPaid && outstandingBalance > 0 ? (
        <PrimaryButton
          label={markingPaid ? 'Recording…' : 'Paid'}
          onPress={() => onMarkPaid(project)}
          disabled={markingPaid}
        />
      ) : null}
    </ThemedView>
  );
}

type AmountCellVariant = 'amount' | 'discount' | 'net' | 'advance' | 'balance' | 'gst';

function getAmountCellColors(
  variant: AmountCellVariant,
  theme: ReturnType<typeof useTheme>,
  isDark: boolean,
) {
  switch (variant) {
    case 'amount':
      return {
        labelColor: theme.textSecondary,
        valueColor: theme.info,
      };
    case 'discount':
      return {
        labelColor: isDark ? '#FCD34D' : '#B45309',
        valueColor: theme.warning,
      };
    case 'net':
      return {
        labelColor: isDark ? '#93C5FD' : '#1D4ED8',
        valueColor: theme.accent,
      };
    case 'advance':
      return {
        labelColor: isDark ? '#6EE7B7' : '#047857',
        valueColor: theme.success,
      };
    case 'balance':
      return {
        labelColor: theme.textSecondary,
        valueColor: theme.danger,
      };
    case 'gst':
      return {
        labelColor: theme.textSecondary,
        valueColor: theme.info,
      };
  }
}

function getAmountCellIcon(
  variant: AmountCellVariant,
  paid?: boolean,
  highlight?: boolean,
): { ios: string; android: string; web: string } {
  if (variant === 'balance') {
    if (paid) {
      return { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' };
    }
    if (highlight) {
      return { ios: 'exclamationmark.circle.fill', android: 'error_outline', web: 'error_outline' };
    }
    return {
      ios: 'creditcard.fill',
      android: 'account_balance_wallet',
      web: 'account_balance_wallet',
    };
  }

  switch (variant) {
    case 'amount':
      return { ios: 'banknote.fill', android: 'payments', web: 'payments' };
    case 'discount':
      return { ios: 'tag.fill', android: 'sell', web: 'sell' };
    case 'net':
      return { ios: 'equal.circle.fill', android: 'calculate', web: 'calculate' };
    case 'advance':
      return { ios: 'arrow.down.circle.fill', android: 'savings', web: 'savings' };
    case 'gst':
      return { ios: 'doc.text.fill', android: 'receipt', web: 'receipt' };
  }
}

function AmountCell({
  variant,
  label,
  value,
  amount,
  highlight,
  paid,
  fullWidth = false,
}: {
  variant: AmountCellVariant;
  label: string;
  value?: string;
  amount?: number;
  highlight?: boolean;
  paid?: boolean;
  fullWidth?: boolean;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = getAmountCellColors(variant, theme, isDark);
  const isBalanceDue = variant === 'balance' && highlight && !paid;
  const valueColor =
    variant === 'balance' && paid
      ? theme.warning
      : paid
        ? theme.success
        : isBalanceDue
          ? theme.danger
          : colors.valueColor;
  const labelColor = isBalanceDue ? (isDark ? '#FCA5A5' : '#B91C1C') : colors.labelColor;
  const icon = getAmountCellIcon(variant, paid, highlight);

  return (
    <View
      style={[
        styles.amountCell,
        fullWidth
          ? [styles.amountCellFull, { borderTopColor: theme.border }]
          : null,
      ]}>
      <SymbolView name={icon} size={18} tintColor={valueColor} />
      <View style={styles.amountCellText}>
        <ThemedText type="small" style={{ color: labelColor }}>
          {label}
        </ThemedText>
        {amount != null ? (
          <CurrencyText
            amount={amount}
            color={valueColor}
            fontSize={14}
            decimalFontSize={10}
            bold
            showPrefix={!(variant === 'balance' && paid)}
          />
        ) : (
          <ThemedText type="smallBold" style={{ color: valueColor }}>
            {value}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  amountCell: {
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  amountCellFull: {
    width: '100%',
    minWidth: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    marginTop: Spacing.half,
  },
  amountCellText: {
    flex: 1,
    gap: Spacing.half,
  },
});
