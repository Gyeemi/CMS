export type OfficeExpenseRow = {
  id: string;
  categoryGroup: string;
  categoryItem: string;
  amount: number;
  expenseDate: string;
  description: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OfficeExpenseInput = {
  categoryGroup: string;
  categoryItem: string;
  amount: number;
  expenseDate: string;
  description: string;
};
