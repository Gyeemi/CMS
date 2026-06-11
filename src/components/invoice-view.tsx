import { StyleSheet, Switch, View } from 'react-native';

import { BalancePaymentHistory } from '@/components/balance-payment-history';
import { CurrencyText } from '@/components/currency-text';
import { GroovXBrand } from '@/components/groovx-brand';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  INVOICE_TERMS_PARAGRAPHS,
  INVOICE_TERMS_TITLE,
  INVOICE_THANK_YOU,
} from '@/constants/invoice-terms';
import { getStudioCompanyDetailLines } from '@/constants/studio-company';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildInvoiceData, getInvoiceClientDetailRows } from '@/types/invoice';
import type { Project } from '@/types/project';

type InvoiceViewProps = {
  project: Project;
  onGstEnabledChange?: (enabled: boolean) => void;
};

export function InvoiceView({ project, onGstEnabledChange }: InvoiceViewProps) {
  const theme = useTheme();
  const data = buildInvoiceData(project);
  const { project: p } = data;

  return (
    <ThemedView
      nativeID="invoice-print-area"
      style={[styles.invoice, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.accent }]}>
        <View>
          <GroovXBrand fontSize={28} lineHeight={32} />
          <ThemedText type="small" themeColor="textSecondary">
            Turning Vibes into Hits
          </ThemedText>
          <View style={styles.companyDetails}>
            {getStudioCompanyDetailLines().map((line) => (
              <ThemedText key={line} type="small" themeColor="textSecondary">
                {line}
              </ThemedText>
            ))}
          </View>
        </View>
        <View style={styles.meta}>
          <ThemedText type="smallBold" style={styles.invoiceTitle}>
            INVOICE
          </ThemedText>
          <ThemedText type="small">{data.invoiceNumber}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {data.invoiceDate}
          </ThemedText>
        </View>
      </View>

      <Section title="Client & Project" compact>
        <InvoiceClientDetails project={p} />
      </Section>

      <View style={[styles.table, { borderColor: theme.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.descCol}>
            Description
          </ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.amountCol}>
            Amount
          </ThemedText>
        </View>
        {data.lineItems.map((item) => (
          <TableRow
            key={item.description}
            desc={item.description}
            sub={p.projectName}
            amount={item.amount}
            borderColor={theme.border}
          />
        ))}
        {p.discount > 0 ? (
          <TableRow desc="Discount" amount={p.discount} leading="− " borderColor={theme.border} />
        ) : null}
      </View>

      <View style={styles.totals}>
        {onGstEnabledChange ? (
          <GstToggleRow
            enabled={data.gstEnabled}
            amount={data.gst}
            borderColor={theme.border}
            accentColor={theme.accent}
            onChange={onGstEnabledChange}
          />
        ) : data.gstEnabled ? (
          <TotalRow label="GST (5%)" amount={data.gst} borderColor={theme.border} />
        ) : null}
        <TotalRow
          label={data.gstEnabled ? 'Total (incl. GST)' : 'Total'}
          amount={data.total}
          borderColor={theme.border}
          bold
          accent={theme.accent}
        />
        <TotalRow label="Advance Paid" amount={p.advancePayment} borderColor={theme.border} />
      </View>

      {data.showBalancePaymentHistory ? (
        <BalancePaymentHistory project={p} />
      ) : data.paidBalanceValue != null ? (
        <View style={styles.totals}>
          <TotalRow
            label="Paid Balance Amount of"
            amount={data.paidBalanceValue}
            borderColor={theme.border}
            bold
            accent={theme.success}
            subLabel={data.paidBalanceDate ? `on ${data.paidBalanceDate}` : undefined}
          />
        </View>
      ) : null}

      <View style={styles.totals}>
        <TotalRow
          label="Balance Due"
          amount={data.balance}
          borderColor={theme.border}
          bold
          accent={data.balance <= 0 ? theme.warning : theme.danger}
        />
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
        {INVOICE_THANK_YOU}
      </ThemedText>

      <View style={[styles.termsSection, { borderTopColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.termsTitle}>
          {INVOICE_TERMS_TITLE}
        </ThemedText>
        {INVOICE_TERMS_PARAGRAPHS.map((paragraph) => (
          <ThemedText key={paragraph} type="small" themeColor="textSecondary" style={styles.termsParagraph}>
            {paragraph}
          </ThemedText>
        ))}
      </View>
    </ThemedView>
  );
}

function Section({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function InvoiceClientDetails({ project }: { project: Project }) {
  const rows = getInvoiceClientDetailRows(project);

  return (
    <View style={styles.detailRows}>
      {rows.map((row, rowIndex) => (
        <View key={`detail-row-${rowIndex}`} style={styles.detailRow}>
          {row.map((cell) => (
            <View key={cell.label} style={styles.detailCell}>
              <ThemedText themeColor="textSecondary" style={styles.detailLabel}>
                {cell.label}
              </ThemedText>
              <ThemedText style={styles.detailValue}>{cell.value}</ThemedText>
            </View>
          ))}
          {row.length < 3
            ? Array.from({ length: 3 - row.length }, (_, index) => (
                <View key={`detail-spacer-${rowIndex}-${index}`} style={styles.detailCell} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

function TableRow({
  desc,
  sub,
  amount,
  leading,
  borderColor,
}: {
  desc: string;
  sub?: string;
  amount: number;
  leading?: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.tableRow, { borderBottomColor: borderColor }]}>
      <View style={styles.descCol}>
        <ThemedText type="small">{desc}</ThemedText>
        {sub ? (
          <ThemedText type="small" themeColor="textSecondary">
            {sub}
          </ThemedText>
        ) : null}
      </View>
      <CurrencyText
        amount={amount}
        leading={leading}
        fontSize={14}
        bold
        align="right"
        style={styles.amountCol}
      />
    </View>
  );
}

function GstToggleRow({
  enabled,
  amount,
  borderColor,
  accentColor,
  onChange,
}: {
  enabled: boolean;
  amount: number;
  borderColor: string;
  accentColor: string;
  onChange: (enabled: boolean) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.totalRow, { borderBottomColor: borderColor }]}>
      <View style={styles.gstToggleLabel}>
        <ThemedText type="small">GST (5%)</ThemedText>
        <View nativeID="invoice-gst-toggle" style={styles.gstToggleControls}>
          <ThemedText type="small" themeColor="textSecondary">
            {enabled ? 'On' : 'Off'}
          </ThemedText>
          <View style={styles.gstSwitchWrap}>
            <Switch
              value={enabled}
              onValueChange={onChange}
              trackColor={{ false: theme.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>
      {enabled ? (
        <CurrencyText amount={amount} fontSize={14} align="right" />
      ) : (
        <ThemedText type="small">—</ThemedText>
      )}
    </View>
  );
}

function TotalRow({
  label,
  amount,
  subLabel,
  borderColor,
  bold,
  accent,
}: {
  label: string;
  amount: number;
  subLabel?: string;
  borderColor: string;
  bold?: boolean;
  accent?: string;
}) {
  const mainSize = bold ? 18 : 14;

  return (
    <View style={[styles.totalRow, { borderBottomColor: borderColor }]}>
      <View style={styles.totalLabelCol}>
        <ThemedText type={bold ? 'smallBold' : 'small'}>{label}</ThemedText>
        {subLabel ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subLabel}
          </ThemedText>
        ) : null}
      </View>
      <CurrencyText
        amount={amount}
        fontSize={mainSize}
        decimalFontSize={bold ? 12 : 10}
        bold={bold}
        color={accent}
        align="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  invoice: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    paddingBottom: Spacing.three,
  },
  companyDetails: {
    marginTop: Spacing.one,
    gap: 2,
  },
  meta: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  invoiceTitle: {
    fontSize: 18,
  },
  section: {
    gap: Spacing.two,
  },
  sectionCompact: {
    gap: Spacing.one,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    fontSize: 10,
  },
  detailRows: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailCell: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  detailLabel: {
    fontSize: 10,
    lineHeight: 12,
  },
  detailValue: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  table: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: Spacing.two,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: Spacing.two,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  descCol: {
    flex: 1,
  },
  amountCol: {
    minWidth: 100,
  },
  totals: {
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: 320,
    gap: Spacing.half,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
  },
  totalLabelCol: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.two,
  },
  gstToggleLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingRight: Spacing.two,
  },
  gstToggleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  gstSwitchWrap: {
    transform: [{ scale: 0.72 }],
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
  },
  termsSection: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  termsTitle: {
    fontSize: 13,
  },
  termsParagraph: {
    lineHeight: 20,
  },
});
