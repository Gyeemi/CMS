import { StyleSheet, View } from 'react-native';

import { CurrencyText } from '@/components/currency-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatBalancePaidDate } from '@/lib/date-format';
import {
  formatBalancePaymentTransactionVia,
  getProjectBalancePaymentHistory,
  getTotalBalancePaid,
  type Project,
} from '@/types/project';

type BalancePaymentHistoryProps = {
  project: Project;
  showTotal?: boolean;
};

export function BalancePaymentHistory({ project, showTotal = true }: BalancePaymentHistoryProps) {
  const theme = useTheme();
  const history = getProjectBalancePaymentHistory(project);

  if (history.length === 0) return null;

  const totalPaid = getTotalBalancePaid(project);

  return (
    <View style={[styles.wrap, { borderTopColor: theme.border }]}>
      <ThemedText type="smallBold" style={{ color: theme.info }}>
        Payment history
      </ThemedText>

      <View style={styles.table}>
        <View style={styles.headerRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.colAmount}>
            Amount
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.colDate}>
            Date
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.colMethod}>
            Method
          </ThemedText>
        </View>

        {history.map((transaction, index) => (
          <View
            key={`${transaction.paidAt}-${transaction.amount}-${index}`}
            style={[styles.dataRow, { borderBottomColor: theme.border }]}>
            <View style={styles.colAmount}>
              <CurrencyText
                amount={transaction.amount}
                color={theme.success}
                fontSize={14}
                decimalFontSize={10}
                bold
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.colDate}>
              {formatBalancePaidDate(transaction.paidAt)}
            </ThemedText>
            <ThemedText type="small" style={[styles.colMethod, { color: theme.text }]}>
              {formatBalancePaymentTransactionVia(transaction)}
            </ThemedText>
          </View>
        ))}

        {showTotal ? (
          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <ThemedText type="smallBold" style={styles.totalLabel}>
              Total balance paid
            </ThemedText>
            <CurrencyText
              amount={totalPaid}
              color={theme.success}
              fontSize={14}
              decimalFontSize={10}
              bold
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    width: '100%',
  },
  table: {
    width: '100%',
    gap: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.one,
    gap: Spacing.two,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  colAmount: {
    flex: 2,
    minWidth: 0,
  },
  colDate: {
    flex: 2,
    minWidth: 0,
  },
  colMethod: {
    flex: 3,
    minWidth: 0,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    marginTop: Spacing.half,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  totalLabel: {
    flex: 1,
  },
});
