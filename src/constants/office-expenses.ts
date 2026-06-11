export type OfficeExpenseGroup = {
  label: string;
  items: readonly string[];
};

export const OFFICE_EXPENSE_GROUPS: readonly OfficeExpenseGroup[] = [
  {
    label: 'Utility Bills',
    items: [
      'Electricity Bill',
      'Water Bill',
      'Internet Bill',
      'House/Office Rent',
      'Telephone Bill',
    ],
  },
  {
    label: 'Asset Purchases (Fixed Assets)',
    items: [
      'Computer/Laptop',
      'Microphone',
      'Sound Card/Audio Interface',
      'Camera',
      'Printer',
      'Furniture',
      'Air Conditioner',
    ],
  },
  {
    label: 'Staff & Payroll',
    items: [
      'Staff Salary',
      'Overtime',
      'Allowances',
      'Bonuses',
      'EPF/PF Contributions',
      'Referral Commission',
    ],
  },
  {
    label: 'Operating Expenses',
    items: [
      'Fuel',
      'Lunch/Meals',
      'Tea & Refreshments',
      'Meeting Expenses',
      'Office Supplies',
      'Stationery',
      'Transportation',
      'Courier/Postage',
    ],
  },
  {
    label: 'Marketing & Promotion',
    items: [
      'Facebook Ads',
      'Google Ads',
      'Banner Printing',
      'Event Promotion',
      'Sponsorship',
    ],
  },
  {
    label: 'Software & Subscriptions',
    items: [
      'Microsoft 365',
      'Adobe Creative Cloud',
      'Studio One',
      'Domain Registration',
      'Web Hosting',
      'Cloud Storage',
    ],
  },
  {
    label: 'Maintenance & Repairs',
    items: [
      'Computer Repair',
      'Vehicle Maintenance',
      'Equipment Servicing',
      'Office Maintenance',
    ],
  },
  {
    label: 'Travel & Accommodation',
    items: ['Bus Fare', 'Taxi Fare', 'Hotel Stay', 'Travel Allowance'],
  },
  {
    label: 'Professional Fees',
    items: ['Legal Fees', 'Accounting Fees', 'Consultancy Fees', 'Licensing Fees'],
  },
  {
    label: 'Miscellaneous Expenses',
    items: [
      'Small one-time expenses',
      'Donations',
      'Penalties/Fines',
      'Emergency purchases',
    ],
  },
] as const;

export const ALL_OFFICE_EXPENSE_GROUPS = 'All categories';

export function getOfficeExpenseGroupLabels(): string[] {
  return OFFICE_EXPENSE_GROUPS.map((group) => group.label);
}

export function getOfficeExpenseItems(groupLabel: string): string[] {
  const group = OFFICE_EXPENSE_GROUPS.find((entry) => entry.label === groupLabel);
  return group ? [...group.items] : [];
}

export function getDefaultOfficeExpenseForm() {
  const firstGroup = OFFICE_EXPENSE_GROUPS[0];
  return {
    categoryGroup: firstGroup.label,
    categoryItem: firstGroup.items[0],
    amount: 0,
    description: '',
  };
}
