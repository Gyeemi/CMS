import { displayToIsoDate } from '@/lib/date-format';
import { supabase } from '@/lib/supabase';
import type { OfficeExpenseInput, OfficeExpenseRow } from '@/types/office-expense';

function rowFromDb(row: {
  id: string;
  category_group: string;
  category_item: string;
  amount: number | string;
  expense_date: string;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}): OfficeExpenseRow {
  return {
    id: row.id,
    categoryGroup: row.category_group,
    categoryItem: row.category_item,
    amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
    expenseDate: row.expense_date,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchOfficeExpenses(): Promise<OfficeExpenseRow[]> {
  const { data, error } = await supabase
    .from('office_expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowFromDb);
}

export async function createOfficeExpense(input: OfficeExpenseInput): Promise<OfficeExpenseRow> {
  const isoDate = displayToIsoDate(input.expenseDate);
  if (!isoDate) {
    throw new Error('Enter a valid expense date.');
  }

  const { data: authData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('office_expenses')
    .insert({
      category_group: input.categoryGroup.trim(),
      category_item: input.categoryItem.trim(),
      amount: input.amount,
      expense_date: isoDate,
      description: input.description.trim(),
      created_by: authData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowFromDb(data);
}

export async function deleteOfficeExpense(id: string) {
  const { error } = await supabase.from('office_expenses').delete().eq('id', id);
  if (error) throw error;
}
