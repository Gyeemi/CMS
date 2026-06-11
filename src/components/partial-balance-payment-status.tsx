import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { CurrencyText } from '@/components/currency-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatBalancePaidDate } from '@/lib/date-format';
import {
  getProjectBalancePaymentHistory,
  getTotalBalancePaid,
  hasPartialBalancePayment,
  type Project,
} from '@/types/project';

type PartialBalancePaymentStatusProps = {
  project: Project;
  inline?: boolean;
};

export function PartialBalancePaymentStatus({
  project,
  inline = false,
}: PartialBalancePaymentStatusProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const history = getProjectBalancePaymentHistory(project);
  if (!hasPartialBalancePayment(project) && history.length === 0) return null;

  const paid = getTotalBalancePaid(project);
  const paidAt = project.balancePaidAt ?? project.updatedAt;
  const via =
    project.balancePaymentMethod === 'cash'
      ? 'Cash'
      : project.balancePaymentMethod === 'e_payment'
        ? project.balancePaymentPlatform ?? 'E-Payment'
        : null;
  const metaParts = [paidAt ? formatBalancePaidDate(paidAt) : null, via].filter(Boolean);

  const labelColor = isDark ? '#6EE7B7' : '#047857';
  const valueColor = theme.success;

  return (
    <View style={[styles.row, inline ? styles.inline : null]}>
      <SymbolView
        name={{
          ios: 'checkmark.circle.fill',
          android: 'check_circle',
          web: 'check_circle',
        }}
        size={18}
        tintColor={valueColor}
      />
      <View style={styles.textBlock}>
        <ThemedText type="small" style={{ color: labelColor }}>
          Partial payment received
        </ThemedText>
        <View style={styles.amountRow}>
          <CurrencyText
            amount={paid}
            color={valueColor}
            fontSize={14}
            decimalFontSize={10}
            bold
          />
          {history.length > 1 ? (
            <ThemedText type="smallBold" style={{ color: valueColor }}>
              {` total · ${history.length} payments`}
            </ThemedText>
          ) : null}
        </View>
        {metaParts.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {metaParts.join(' · ')}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  inline: {
    minWidth: '45%',
  },
});
