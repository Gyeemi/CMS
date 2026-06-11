import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { CurrencyText } from '@/components/currency-text';
import { DeleteOfficeExpenseModal } from '@/components/delete-office-expense-modal';
import { DateField } from '@/components/date-field';
import { CurrencyField } from '@/components/currency-field';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ALL_OFFICE_EXPENSE_GROUPS,
  getDefaultOfficeExpenseForm,
  getOfficeExpenseGroupLabels,
  getOfficeExpenseItems,
} from '@/constants/office-expenses';
import { Radius, Spacing } from '@/constants/theme';
import {
  displayToIsoDate,
  formatDisplayDate,
  getLastMonthRangeDisplay,
  getMonthRangeDisplay,
  isIsoDateInRange,
  isoToDisplayDate,
} from '@/lib/date-format';
import { printOfficeExpenseReport } from '@/lib/office-expense-export';
import { getSupabaseErrorMessage } from '@/lib/supabase/errors';
import {
  createOfficeExpense,
  deleteOfficeExpense,
  fetchOfficeExpenses,
} from '@/lib/supabase/office-expenses';
import { useTheme } from '@/hooks/use-theme';
import type { OfficeExpenseRow } from '@/types/office-expense';

const FILTER_OPTIONS = [ALL_OFFICE_EXPENSE_GROUPS, ...getOfficeExpenseGroupLabels()] as const;

export function ManageOfficeSection() {
  const theme = useTheme();
  const [expenses, setExpenses] = useState<OfficeExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>(ALL_OFFICE_EXPENSE_GROUPS);
  const [dateFrom, setDateFrom] = useState(() => getMonthRangeDisplay().from);
  const [dateTo, setDateTo] = useState(() => getMonthRangeDisplay().to);
  const [form, setForm] = useState(() => ({
    ...getDefaultOfficeExpenseForm(),
    expenseDate: formatDisplayDate(new Date()),
  }));
  const [removeTarget, setRemoveTarget] = useState<OfficeExpenseRow | null>(null);

  const loadExpenses = useCallback(async () => {
    const rows = await fetchOfficeExpenses();
    setExpenses(rows);
  }, []);

  useEffect(() => {
    void loadExpenses()
      .catch(() => setError('Unable to load office expenses.'))
      .finally(() => setLoading(false));
  }, [loadExpenses]);

  const categoryItems = useMemo(
    () => getOfficeExpenseItems(form.categoryGroup),
    [form.categoryGroup],
  );

  const fromIso = useMemo(() => displayToIsoDate(dateFrom), [dateFrom]);
  const toIso = useMemo(() => displayToIsoDate(dateTo), [dateTo]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const inCategory =
        filterGroup === ALL_OFFICE_EXPENSE_GROUPS || expense.categoryGroup === filterGroup;
      const inDateRange = isIsoDateInRange(expense.expenseDate, fromIso, toIso);
      return inCategory && inDateRange;
    });
  }, [expenses, filterGroup, fromIso, toIso]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );

  const resetForm = () => {
    setForm({
      ...getDefaultOfficeExpenseForm(),
      expenseDate: formatDisplayDate(new Date()),
    });
    setError('');
  };

  const handleCategoryGroupChange = (categoryGroup: string) => {
    const items = getOfficeExpenseItems(categoryGroup);
    setForm((prev) => ({
      ...prev,
      categoryGroup,
      categoryItem: items[0] ?? prev.categoryItem,
    }));
    setSuccess('');
  };

  const handleAddExpense = async () => {
    setError('');
    setSuccess('');

    const amount = form.amount;
    if (amount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    if (!form.expenseDate.trim()) {
      setError('Select an expense date.');
      return;
    }

    setSubmitting(true);
    try {
      await createOfficeExpense({
        categoryGroup: form.categoryGroup,
        categoryItem: form.categoryItem,
        amount,
        expenseDate: form.expenseDate,
        description: form.description,
      });
      await loadExpenses();
      resetForm();
      setShowAddForm(false);
      setSuccess('Expense recorded.');
    } catch (err) {
      const message = getSupabaseErrorMessage(err, 'Unable to save expense.');
      setError(message);
      if (Platform.OS === 'web') {
        window.alert(`Unable to save expense\n\n${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const applyMonthPreset = (preset: 'this-month' | 'last-month') => {
    const range =
      preset === 'this-month' ? getMonthRangeDisplay() : getLastMonthRangeDisplay();
    setDateFrom(range.from);
    setDateTo(range.to);
    setSuccess('');
  };

  const handlePrintReport = () => {
    setError('');

    if (!fromIso || !toIso) {
      setError('Select valid From and To dates.');
      return;
    }

    if (fromIso > toIso) {
      setError('From date must be on or before To date.');
      return;
    }

    const reportId = `expenses-${fromIso}-${toIso}-${Date.now()}`;

    void printOfficeExpenseReport({
      id: reportId,
      fromDate: dateFrom,
      toDate: dateTo,
      categoryFilter: filterGroup,
      expenses: filteredExpenses,
      total: filteredTotal,
    }).catch((err) => {
      const message = err instanceof Error ? err.message : 'Unable to open print report.';
      setError(message);
      if (Platform.OS === 'web') {
        window.alert(`Print failed\n\n${message}`);
      }
    });
  };

  const handleConfirmRemoveExpense = async () => {
    if (!removeTarget) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await deleteOfficeExpense(removeTarget.id);
      await loadExpenses();
      setSuccess('Expense removed.');
    } catch (err) {
      const message = getSupabaseErrorMessage(err, 'Unable to remove expense.');
      setError(message);
      if (Platform.OS === 'web') {
        window.alert(message);
      }
      throw err instanceof Error ? err : new Error(message);
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
        Record and track studio office expenses across utility bills, payroll, assets, and more.
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

      <ThemedView type="backgroundElement" style={[styles.summaryCard, { borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Total for {dateFrom} — {dateTo}
          {filterGroup !== ALL_OFFICE_EXPENSE_GROUPS ? ` · ${filterGroup}` : ''}
        </ThemedText>
        <CurrencyText amount={filteredTotal} fontSize={28} bold />
        <ThemedText type="small" themeColor="textSecondary">
          {filteredExpenses.length} record{filteredExpenses.length === 1 ? '' : 's'}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Report period</ThemedText>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <DateField
              label="From"
              value={dateFrom}
              onChange={(value) => {
                setDateFrom(value);
                setSuccess('');
              }}
              minimumDate={new Date(2000, 0, 1)}
            />
          </View>
          <View style={styles.dateField}>
            <DateField
              label="To"
              value={dateTo}
              onChange={(value) => {
                setDateTo(value);
                setSuccess('');
              }}
              minimumDate={new Date(2000, 0, 1)}
            />
          </View>
        </View>
        <View style={styles.presetRow}>
          <Pressable
            onPress={() => applyMonthPreset('this-month')}
            style={({ pressed }) => [
              styles.presetButton,
              { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}>
            <ThemedText type="smallBold">This month</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => applyMonthPreset('last-month')}
            style={({ pressed }) => [
              styles.presetButton,
              { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}>
            <ThemedText type="smallBold">Last month</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <View style={styles.filterSection}>
        <ThemedText type="smallBold">Filter by category</ThemedText>
        <View style={styles.filterToolbar}>
          <View style={styles.filterSelect}>
            <SelectField
              hideLabel
              label="Filter by category"
              options={FILTER_OPTIONS}
              value={filterGroup}
              onChange={(value) => {
                setFilterGroup(value);
                setSuccess('');
              }}
            />
          </View>
          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => void handlePrintReport()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Print Report"
              style={({ pressed }) => [
                styles.textAction,
                { opacity: submitting ? 0.5 : pressed ? 0.7 : 1 },
              ]}>
              <View style={styles.textActionIcon}>
                <SymbolView
                  name={{ ios: 'printer', android: 'print', web: 'print' }}
                  size={16}
                  tintColor={theme.accent}
                />
              </View>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Print Report
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowAddForm((open) => !open);
                setSuccess('');
                if (showAddForm) resetForm();
              }}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={showAddForm ? 'Cancel' : 'Add Expense'}
              style={({ pressed }) => [
                styles.textAction,
                { opacity: submitting ? 0.5 : pressed ? 0.7 : 1 },
              ]}>
              <View style={styles.textActionIcon}>
                <SymbolView
                  name={
                    showAddForm
                      ? { ios: 'xmark', android: 'close', web: 'close' }
                      : { ios: 'plus', android: 'add', web: 'add' }
                  }
                  size={16}
                  tintColor={theme.text}
                />
              </View>
              <ThemedText type="smallBold">{showAddForm ? 'Cancel' : 'Add Expense'}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>

      {showAddForm ? (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">New Expense</ThemedText>
          <SelectField
            label="Category"
            options={getOfficeExpenseGroupLabels()}
            value={form.categoryGroup}
            onChange={handleCategoryGroupChange}
          />
          <SelectField
            label="Expense type"
            options={categoryItems}
            value={form.categoryItem}
            onChange={(categoryItem) => {
              setForm((prev) => ({ ...prev, categoryItem }));
              setSuccess('');
            }}
          />
          <CurrencyField
            label="Amount (Nu.)"
            value={form.amount}
            onChangeValue={(amount) => {
              setForm((prev) => ({ ...prev, amount }));
              setSuccess('');
            }}
            placeholder="Nu. 0.00"
          />
          <DateField
            label="Expense date"
            value={form.expenseDate}
            onChange={(expenseDate) => {
              setForm((prev) => ({ ...prev, expenseDate }));
              setSuccess('');
            }}
            minimumDate={new Date(2000, 0, 1)}
          />
          <FormField
            label="Notes (optional)"
            value={form.description}
            onChangeText={(description) => {
              setForm((prev) => ({ ...prev, description }));
              setSuccess('');
            }}
            placeholder="Invoice no., vendor, remarks…"
            multiline
          />
          <PrimaryButton
            label={submitting ? 'Saving…' : 'Save Expense'}
            onPress={() => void handleAddExpense()}
            disabled={submitting}
          />
        </ThemedView>
      ) : null}

      <View style={styles.listHeader}>
        <ThemedText type="smallBold">Expenses in selected period</ThemedText>
      </View>

      {filteredExpenses.length === 0 ? (
        <ThemedView type="backgroundElement" style={[styles.emptyCard, { borderColor: theme.border }]}>
          <ThemedText themeColor="textSecondary">
            No expenses found between {dateFrom} and {dateTo}
            {filterGroup !== ALL_OFFICE_EXPENSE_GROUPS ? ` for ${filterGroup}` : ''}.
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.list}>
          {filteredExpenses.map((expense) => (
            <ThemedView
              key={expense.id}
              type="backgroundElement"
              style={[styles.expenseCard, { borderColor: theme.border }]}>
              <View style={styles.expenseInfo}>
                <ThemedText type="smallBold">{expense.categoryItem}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {expense.categoryGroup}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {isoToDisplayDate(expense.expenseDate)}
                </ThemedText>
                {expense.description.trim() ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {expense.description.trim()}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.expenseActions}>
                <CurrencyText amount={expense.amount} fontSize={18} bold align="right" />
                <Pressable
                  onPress={() => setRemoveTarget(expense)}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Remove expense"
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
              </View>
            </ThemedView>
          ))}
        </View>
      )}

      <DeleteOfficeExpenseModal
        visible={removeTarget !== null}
        expenseLabel={
          removeTarget
            ? `${removeTarget.categoryItem} (${isoToDisplayDate(removeTarget.expenseDate)})`
            : ''
        }
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemoveExpense}
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  dateField: {
    flex: 1,
    minWidth: 200,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  presetButton: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  filterSection: {
    gap: Spacing.one,
  },
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  filterSelect: {
    flex: 1,
    minWidth: 200,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.four,
    flexShrink: 0,
    marginLeft: 'auto',
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
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  listHeader: {
    marginTop: Spacing.one,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  expenseCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  expenseInfo: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 200,
  },
  expenseActions: {
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
});
