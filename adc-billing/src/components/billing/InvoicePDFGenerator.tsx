import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer';
import { Invoice, Payment, AdjustmentLog } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  detailLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  patientSection: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5,
  },
  patientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patientField: {
    width: '50%',
    marginBottom: 8,
  },
  patientLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  patientValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
  },
  serviceName: {
    flex: 2,
    fontWeight: 'bold',
  },
  amount: {
    flex: 1,
    textAlign: 'right',
  },
  summary: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalRow: {
    borderTop: 2,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  historySection: {
    marginTop: 20,
  },
  historyItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 3,
    borderLeft: 3,
    borderLeftColor: '#2563eb',
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3,
  },
  historyDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  payments: Payment[];
  adjustments: AdjustmentLog[];
}

const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Calculate financial values
const calculateFinancials = (invoice: Invoice, payments: Payment[], adjustments: AdjustmentLog[]) => {
  const subtotal = invoice.treatments?.reduce((sum, treatment) => {
    const amount = Number(treatment.final_amount) || Number(treatment.estimated_amount) || 0;
    return sum + amount;
  }, 0) || invoice.total_amount_estimated || 0;

  const totalPaid = payments?.reduce((sum, payment) => sum + Number(payment.amount_paid), 0) || 0;

  const discountFromAdjustments = adjustments
    .filter((adj) => adj.type === 'discount')
    .reduce((sum, adj) => sum + Math.abs(Number(adj.amount)), 0) || 0;

  const refundAmount = adjustments
    .filter((adj: any) => adj.type === 'refund' || (adj.reason && adj.reason.toLowerCase().includes('refund')))
    .reduce((sum, adj) => sum + Math.abs(Number(adj.amount)), 0) || 0;

  const writeoffAmount = adjustments
    .filter((adj: any) => adj.type === 'write-off' || (adj.reason && adj.reason.toLowerCase().includes('write-off')))
    .reduce((sum, adj) => sum + Math.abs(Number(adj.amount)), 0) || 0;  const totalDiscounts = (invoice.discount_amount || 0) + discountFromAdjustments;
  const netAmount = subtotal - (totalDiscounts + writeoffAmount + refundAmount);
  const balanceDue = netAmount - totalPaid;

  return {
    subtotal,
    totalPaid,
    totalDiscounts,
    refundAmount,
    writeoffAmount,
    netAmount,
    balanceDue,
  };
};

const InvoicePDFDocument: React.FC<InvoicePDFProps> = ({ invoice, payments, adjustments }) => {
  const financials = calculateFinancials(invoice, payments, adjustments);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>Adriano Dental Clinic</Text>
          <Text style={styles.companyInfo}>Professional Dental Care Services</Text>
          <Text style={styles.companyInfo}>15 Balagtas St, Taguig City, 1632</Text>
          <Text style={styles.companyInfo}>Manila, Philippines 1000</Text>
          <Text style={styles.companyInfo}>Phone: 0915-036-7309 | Email: info@adrianodental.com</Text>
        </View>

        {/* Invoice Title */}
        <Text style={styles.invoiceTitle}>INVOICE</Text>

        {/* Invoice Details */}
        <View style={styles.invoiceDetails}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Invoice Number</Text>
            <Text style={styles.detailValue}>{invoice.invoice_code}</Text>
            <Text style={styles.detailLabel}>Issue Date</Text>
            <Text style={styles.detailValue}>{formatDate(invoice.created_at)}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{invoice.status.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{formatDate(invoice.created_at)}</Text>
          </View>
        </View>

        {/* Patient Information */}
        <View style={styles.patientSection}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.patientGrid}>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Patient Name</Text>
              <Text style={styles.patientValue}>{invoice.patient_name || 'N/A'}</Text>
            </View>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Patient ID</Text>
              <Text style={styles.patientValue}>{invoice.patient_id}</Text>
            </View>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Dentist</Text>
              <Text style={styles.patientValue}>{invoice.dentist_name || 'N/A'}</Text>
            </View>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Contact</Text>
              <Text style={styles.patientValue}>{invoice.mobile_number || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Invoice Items */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>Services & Charges</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.serviceName]}>Service Description</Text>
            <Text style={[styles.tableHeaderText, styles.amount]}>Estimated</Text>
            <Text style={[styles.tableHeaderText, styles.amount]}>Final Amount</Text>
          </View>

          {invoice.treatments?.map((treatment, index) => (
            <View key={treatment.charge_id || index} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={[styles.tableCell, styles.serviceName]}>
                {treatment.service_name}
                {treatment.notes && `\nNotes: ${treatment.notes}`}
              </Text>
              <Text style={[styles.tableCell, styles.amount]}>
                {formatCurrency(treatment.estimated_amount || 0)}
              </Text>
              <Text style={[styles.tableCell, styles.amount]}>
                {formatCurrency(treatment.final_amount || treatment.estimated_amount || 0)}
              </Text>
            </View>
          ))}
        </View>

        {/* Financial Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(financials.subtotal)}</Text>
          </View>

          {financials.totalDiscounts > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discounts</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>
                -{formatCurrency(financials.totalDiscounts)}
              </Text>
            </View>
          )}

          {financials.writeoffAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Write-off</Text>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                -{formatCurrency(financials.writeoffAmount)}
              </Text>
            </View>
          )}

          {financials.refundAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Refunds</Text>
              <Text style={[styles.summaryValue, { color: '#7c3aed' }]}>
                -{formatCurrency(financials.refundAmount)}
              </Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(financials.netAmount)}</Text>
          </View>

          {financials.totalPaid > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Paid</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>
                -{formatCurrency(financials.totalPaid)}
              </Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Balance Due</Text>
            <Text style={[styles.totalValue, { color: financials.balanceDue > 0 ? '#dc2626' : '#059669' }]}>
              {formatCurrency(financials.balanceDue)}
            </Text>
          </View>
        </View>

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((payment) => (
              <View key={payment.payment_id} style={styles.historyItem}>
                <Text style={styles.historyTitle}>
                  Payment #{payment.payment_id} - {formatCurrency(payment.amount_paid)}
                </Text>
                <Text style={styles.historyDetail}>
                  Date: {formatDate(payment.payment_date)} | Method: {payment.method}
                  {payment.transaction_ref && ` | Ref: ${payment.transaction_ref}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Adjustments History */}
        {adjustments && adjustments.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Adjustments History</Text>
            {adjustments.map((adjustment) => (
              <View key={adjustment.adjustment_id} style={styles.historyItem}>
                <Text style={styles.historyTitle}>
                  Adjustment #{adjustment.adjustment_id} - {adjustment.type} - {formatCurrency(Math.abs(adjustment.amount))}
                </Text>
                <Text style={styles.historyDetail}>
                  Date: {formatDate(adjustment.created_at)}
                  {adjustment.note && ` | Note: ${adjustment.note}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for choosing Adriano Dental Clinic. For any questions, please contact us at (02) 123-4567</Text>
          <Text>This is a computer-generated invoice and does not require a signature.</Text>
        </View>
      </Page>
    </Document>
  );
};

interface InvoicePDFGeneratorProps {
  invoice: Invoice;
  payments: Payment[];
  adjustments: AdjustmentLog[];
  fileName?: string;
}

export const InvoicePDFGenerator: React.FC<InvoicePDFGeneratorProps> = ({
  invoice,
  payments,
  adjustments,
  fileName,
}) => {
  const defaultFileName = `Invoice-${invoice.invoice_code}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePDFDocument invoice={invoice} payments={payments} adjustments={adjustments} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
    >
      {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  );
};

export default InvoicePDFGenerator;