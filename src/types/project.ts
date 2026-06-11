import { formatBalancePaidDate } from '@/lib/date-format';
import {
  formatCurrency,
  formatCurrencyHtml,
  splitCurrencyAmount,
} from '@/lib/currency-format';

export const COMBO_PROJECT_TYPE = 'Music & Music Video Production' as const;
export const PROJECT_TYPES = [
  'Music Production',
  'Music Video',
  COMBO_PROJECT_TYPE,
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export function normalizeProjectType(value: string): ProjectType {
  if (value === 'Audio Production') return 'Music Production';
  if (value === 'Audio & Video Production') return COMBO_PROJECT_TYPE;
  if (PROJECT_TYPES.includes(value as ProjectType)) return value as ProjectType;
  return 'Music Production';
}

export const PROJECT_CATEGORIES = [
  'Original',
  'Cover',
  'Reprise',
  'Mixtape',
  'Remix',
  'Jingle',
  'Vocal Recording',
  'Mixing & Mastering',
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const AUDIO_COPYRIGHTS = ['Authorized', 'Unauthorized'] as const;
export type AudioCopyright = (typeof AUDIO_COPYRIGHTS)[number];

export const PRODUCTION_STATUSES = [
  'project_registered',
  'under_production',
  'post_production',
  'production_completed',
] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  project_registered: 'Project Registered',
  under_production: 'Under Production',
  post_production: 'Post Production',
  production_completed: 'Production Completed',
};

export const PRODUCTION_STATUS_LABEL_OPTIONS = PRODUCTION_STATUSES.map(
  (status) => PRODUCTION_STATUS_LABELS[status],
);

export function getProductionStatusLabel(status: ProductionStatus) {
  return PRODUCTION_STATUS_LABELS[status];
}

export function getProductionStatusFromLabel(label: string): ProductionStatus | null {
  const match = PRODUCTION_STATUSES.find((status) => PRODUCTION_STATUS_LABELS[status] === label);
  return match ?? null;
}

export function getAllowedProductionStatuses(current: ProductionStatus): ProductionStatus[] {
  switch (current) {
    case 'project_registered':
      return ['project_registered', 'under_production'];
    case 'under_production':
      return ['under_production', 'post_production'];
    case 'post_production':
      return ['post_production', 'production_completed'];
    case 'production_completed':
      return ['production_completed'];
  }
}

export function getAllowedProductionStatusLabelOptions(current: ProductionStatus) {
  return getAllowedProductionStatuses(current).map((status) => PRODUCTION_STATUS_LABELS[status]);
}

export function isAllowedProductionStatusTransition(
  current: ProductionStatus,
  next: ProductionStatus,
) {
  return getAllowedProductionStatuses(current).includes(next);
}

export function getProductionStatusTransitionError(
  current: ProductionStatus,
  next: ProductionStatus,
) {
  if (isAllowedProductionStatusTransition(current, next)) return null;

  if (current === 'under_production') {
    return 'Under Production can only be updated to Post Production.';
  }
  if (current === 'post_production') {
    return 'Post Production can only be updated to Production Completed.';
  }
  if (current === 'production_completed') {
    return 'Production Completed cannot be changed.';
  }
  if (current === 'project_registered') {
    return 'Project Registered can only be updated to Under Production.';
  }

  return 'This production status change is not allowed.';
}

export function shouldNotifyClientOfProductionStatus(status: ProductionStatus) {
  return status !== 'project_registered';
}

export function normalizeProductionStatus(value: string | null | undefined): ProductionStatus {
  if (value === 'project_registered') return value;
  if (value === 'post_production' || value === 'production_completed') return value;
  return 'under_production';
}

export function getProductionStatusNotificationKey(
  project: Pick<Project, 'id' | 'productionStatus' | 'productionStatusUpdatedAt' | 'updatedAt'>,
) {
  const stamp = project.productionStatusUpdatedAt ?? project.updatedAt;
  return `production_status:${project.id}:${project.productionStatus}:${stamp}`;
}

export const BALANCE_PAYMENT_METHODS = ['cash', 'e_payment'] as const;
export type BalancePaymentMethod = (typeof BALANCE_PAYMENT_METHODS)[number];

export const EPAYMENT_PLATFORMS = [
  'mBOB',
  'T-Pay',
  'BNB mPay',
  'Punjab',
  'DrukPay',
  'DK',
  'BDB e-Pay',
] as const;
export type EPaymentPlatform = (typeof EPAYMENT_PLATFORMS)[number];

export type BalancePaymentTransaction = {
  amount: number;
  method: BalancePaymentMethod;
  platform?: EPaymentPlatform;
  ref?: string;
  paidAt: string;
};

export type Project = {
  id: string;
  projectName: string;
  artistName: string;
  artistPhone: string;
  producer: string;
  projectType: ProjectType;
  projectCategory: ProjectCategory;
  projectAmount: number;
  audioAmount?: number;
  videoAmount?: number;
  advancePayment: number;
  discount: number;
  gstEnabled: boolean;
  audioCopyright: AudioCopyright;
  balancePaymentMethod?: BalancePaymentMethod;
  balancePaymentPlatform?: EPaymentPlatform;
  balancePaymentRef?: string;
  balancePaidAmount?: number;
  balancePaidAt?: string;
  balancePaymentHistory?: BalancePaymentTransaction[];
  productionStatus: ProductionStatus;
  productionStatusUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export function isComboProjectType(projectType: ProjectType) {
  return projectType === COMBO_PROJECT_TYPE;
}

export function getProjectLineItems(
  project: Pick<
    Project,
    'projectType' | 'projectCategory' | 'projectName' | 'projectAmount' | 'audioAmount' | 'videoAmount'
  >,
) {
  if (!isComboProjectType(project.projectType)) {
    return [
      {
        description: `${project.projectType} — ${project.projectCategory}`,
        amount: project.projectAmount,
      },
    ];
  }

  return [
    {
      description: `Music Production — ${project.projectCategory}`,
      amount: project.audioAmount ?? project.projectAmount,
    },
    {
      description: `Music Video — ${project.projectCategory}`,
      amount: project.videoAmount ?? 0,
    },
  ];
}

export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

export function calculateBalance(project: Pick<Project, 'projectAmount' | 'advancePayment' | 'discount'>) {
  return Math.max(0, project.projectAmount - project.discount - project.advancePayment);
}

export function getFullProjectPayment(project: Pick<Project, 'projectAmount' | 'discount'>) {
  return Math.max(0, project.projectAmount - project.discount);
}

export function getTotalBalancePaid(
  project: Pick<Project, 'balancePaidAmount' | 'balancePaymentMethod' | 'balancePaidAt'>,
) {
  if (project.balancePaidAmount != null && project.balancePaidAmount > 0) {
    return project.balancePaidAmount;
  }
  return 0;
}

export function hasRecordedBalancePayment(
  project: Pick<Project, 'balancePaidAt' | 'balancePaymentMethod' | 'balancePaidAmount'>,
) {
  return Boolean(
    getTotalBalancePaid(project) > 0 ||
      project.balancePaidAt ||
      project.balancePaymentMethod,
  );
}

export function getBalanceDueAmount(
  project: Pick<Project, 'projectAmount' | 'advancePayment' | 'discount'>,
) {
  return Math.max(0, getFullProjectPayment(project) - project.advancePayment);
}

export function getOutstandingBalance(
  project: Pick<
    Project,
    | 'projectAmount'
    | 'advancePayment'
    | 'discount'
    | 'balancePaidAmount'
  >,
) {
  return Math.max(0, getBalanceDueAmount(project) - getTotalBalancePaid(project));
}

export function isProjectBalancePaid(
  project: Pick<
    Project,
    | 'projectAmount'
    | 'advancePayment'
    | 'discount'
    | 'balancePaidAmount'
  >,
) {
  const outstanding = getOutstandingBalance(project);
  if (outstanding <= 0) {
    return getFullProjectPayment(project) > 0;
  }
  return getTotalBalancePaid(project) >= getBalanceDueAmount(project);
}

export function hasPartialBalancePayment(project: Project) {
  const paid = getTotalBalancePaid(project);
  return paid > 0 && getOutstandingBalance(project) > 0;
}

export function getDisplayAdvancePayment(project: Project) {
  return project.advancePayment;
}

export function getDisplayBalancePaidAmount(project: Project) {
  return getTotalBalancePaid(project);
}

/** Admin dashboard: sum of balance amounts confirmed received by admin. */
export function getConfirmedBalanceReceivedAmount(
  project: Pick<Project, 'balancePaidAmount'>,
) {
  return getTotalBalancePaid(project);
}

export function formatBalanceCellValue(project: Project) {
  return formatCurrency(getOutstandingBalance(project));
}

function formatBalancePaymentVia(
  project: Pick<Project, 'balancePaymentMethod' | 'balancePaymentPlatform' | 'balancePaymentRef'>,
) {
  if (project.balancePaymentMethod === 'cash') return 'Cash';
  if (project.balancePaymentMethod === 'e_payment') {
    const platform = project.balancePaymentPlatform ?? 'E-Payment';
    return project.balancePaymentRef
      ? `${platform} · Ref: ${project.balancePaymentRef}`
      : platform;
  }
  return null;
}

export function formatPartialPaymentViaSuffix(
  project: Pick<Project, 'balancePaymentMethod' | 'balancePaymentPlatform' | 'balancePaymentRef'>,
) {
  if (project.balancePaymentMethod === 'cash') return 'via Cash';
  if (project.balancePaymentMethod === 'e_payment') {
    const platform = project.balancePaymentPlatform ?? 'E-Payment';
    const ref = project.balancePaymentRef?.trim();
    return ref ? `via ${platform} Ref: ${ref}` : `via ${platform}`;
  }
  return '';
}

export function formatBalancePaymentTransactionVia(
  transaction: Pick<BalancePaymentTransaction, 'method' | 'platform' | 'ref'>,
) {
  if (transaction.method === 'cash') return 'Cash';
  const platform = transaction.platform ?? 'E-Payment';
  const ref = transaction.ref?.trim();
  return ref ? `${platform} · Ref: ${ref}` : platform;
}

export function getProjectBalancePaymentHistory(
  project: Pick<Project, 'balancePaymentHistory'>,
): BalancePaymentTransaction[] {
  return project.balancePaymentHistory ?? [];
}

export function hasBalancePaymentHistory(project: Pick<Project, 'balancePaymentHistory'>) {
  return getProjectBalancePaymentHistory(project).length > 0;
}

export type PartialPaymentReceivedDetails = {
  amountLabel: string;
  dateLabel: string | null;
  viaLabel: string;
  metaLabel: string | null;
};

export function getPartialPaymentReceivedDetails(
  project: Pick<
    Project,
    | 'projectAmount'
    | 'advancePayment'
    | 'discount'
    | 'balancePaidAmount'
    | 'balancePaymentMethod'
    | 'balancePaymentPlatform'
    | 'balancePaymentRef'
    | 'balancePaidAt'
    | 'updatedAt'
  >,
): PartialPaymentReceivedDetails | null {
  if (!hasPartialBalancePayment(project as Project)) return null;

  const paid = getTotalBalancePaid(project);
  const history = getProjectBalancePaymentHistory(project);
  const paidAt = project.balancePaidAt ?? project.updatedAt;
  const via = formatPartialPaymentViaSuffix(project);
  const dateLabel = paidAt ? formatBalancePaidDate(paidAt) : null;
  const metaParts = [dateLabel, via].filter(Boolean);

  return {
    amountLabel:
      history.length > 1
        ? `${formatCurrency(paid)} total · ${history.length} payments`
        : formatCurrency(paid),
    dateLabel,
    viaLabel: via,
    metaLabel: metaParts.length > 0 ? metaParts.join(' · ') : null,
  };
}

export function formatPartialPaymentReceivedLine(
  project: Pick<
    Project,
    | 'projectAmount'
    | 'advancePayment'
    | 'discount'
    | 'balancePaidAmount'
    | 'balancePaymentMethod'
    | 'balancePaymentPlatform'
    | 'balancePaymentRef'
    | 'balancePaidAt'
    | 'updatedAt'
  >,
) {
  const details = getPartialPaymentReceivedDetails(project);
  if (!details) return null;

  const parts = [`Partial payment received: ${details.amountLabel}`];
  if (details.metaLabel) parts.push(details.metaLabel);
  return parts.join(' · ');
}

export function formatPartialPaymentRemainingLine(
  project: Pick<Project, 'projectAmount' | 'advancePayment' | 'discount' | 'balancePaidAmount'>,
) {
  if (!hasPartialBalancePayment(project as Project)) return null;
  return `Remaining Balance: ${formatCurrency(getOutstandingBalance(project))}`;
}

export function formatBalancePaymentLabel(
  project: Pick<
    Project,
    | 'projectAmount'
    | 'advancePayment'
    | 'discount'
    | 'balancePaidAmount'
    | 'balancePaymentMethod'
    | 'balancePaymentPlatform'
    | 'balancePaymentRef'
    | 'balancePaidAt'
    | 'updatedAt'
  >,
) {
  const paidAt = project.balancePaidAt ?? project.updatedAt;
  const via = formatBalancePaymentVia(project);
  const outstanding = getOutstandingBalance(project);
  const paid = getTotalBalancePaid(project);

  if (paid > 0 && outstanding > 0) {
    return formatPartialPaymentReceivedLine(project) ?? 'Partial payment received';
  }

  if (!paidAt) {
    return via ? `Balance paid in full via ${via}` : 'Balance paid in full';
  }

  const dateLabel = formatBalancePaidDate(paidAt);
  return via
    ? `Balance paid in full - ${dateLabel} via ${via}`
    : `Balance paid in full - ${dateLabel}`;
}

export function isGstEnabled(project: Pick<Project, 'gstEnabled'>) {
  return project.gstEnabled === true;
}

export function calculateGst(project: Pick<Project, 'projectAmount' | 'discount' | 'gstEnabled'>) {
  if (!isGstEnabled(project)) return 0;
  const taxable = Math.max(0, project.projectAmount - project.discount);
  return taxable * 0.05;
}

export function calculateTotal(project: Pick<Project, 'projectAmount' | 'discount' | 'gstEnabled'>) {
  const subtotal = Math.max(0, project.projectAmount - project.discount);
  return subtotal + calculateGst(project);
}

/** Invoice balance due — includes GST when enabled. */
export function getOutstandingInvoiceBalance(
  project: Pick<
    Project,
    | 'projectAmount'
    | 'advancePayment'
    | 'discount'
    | 'balancePaidAmount'
    | 'gstEnabled'
  >,
) {
  const totalDue = calculateTotal(project);
  const paid = project.advancePayment + getTotalBalancePaid(project);
  return Math.max(0, totalDue - paid);
}

export { formatCurrency, formatCurrencyHtml, splitCurrencyAmount };

export function createEmptyProjectForm(): ProjectFormData {
  return {
    projectName: '',
    artistName: '',
    artistPhone: '',
    producer: '',
    projectType: 'Music Production',
    projectCategory: 'Original',
    projectAmount: 0,
    audioAmount: 0,
    videoAmount: 0,
    advancePayment: 0,
    discount: 0,
    gstEnabled: false,
    audioCopyright: 'Unauthorized',
    balancePaymentMethod: undefined,
    balancePaymentPlatform: undefined,
    balancePaymentRef: undefined,
    balancePaidAmount: undefined,
    balancePaidAt: undefined,
    productionStatus: 'project_registered',
  };
}
