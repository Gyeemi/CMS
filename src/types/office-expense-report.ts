import type { OfficeExpenseRow } from '@/types/office-expense';

export type OfficeExpensePrintReport = {
  id: string;
  fromDate: string;
  toDate: string;
  categoryFilter: string;
  expenses: OfficeExpenseRow[];
  total: number;
};
