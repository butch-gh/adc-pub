import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface PaymentReceiptData {
  payment_id: number;
  invoice_id?: number;
  invoice_code?: string;
  patient_name?: string;
  amount_paid: number;
  method: string;
  payment_date: string;
  transaction_ref?: string;
  notes?: string;
}

interface PaymentReceiptTemplateProps {
  payment: PaymentReceiptData;
  invoice?: { data?: { patient_name?: string; email?: string; mobile_number?: string } };
}

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    width: '40%',
  },
  value: {
    fontSize: 12,
    color: '#111827',
    width: '60%',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
  },
  footerText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  receiptId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 20,
  },
});

const PaymentReceiptTemplate: React.FC<PaymentReceiptTemplateProps> = ({
  payment,
  invoice,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ADC Dental Clinic</Text>
          <Text style={styles.headerSubtitle}>Payment Receipt</Text>
        </View>

        {/* Receipt ID */}
        <Text style={styles.receiptId}>
          Receipt #{payment.payment_id.toString().padStart(6, '0')}
        </Text>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Patient Name:</Text>
            <Text style={styles.value}>{payment.patient_name || invoice?.data?.patient_name || 'N/A'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Invoice Code:</Text>
            <Text style={styles.value}>{payment.invoice_code || 'N/A'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid:</Text>
            <Text style={styles.amount}>{formatCurrency(payment.amount_paid)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{payment.method}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Payment Date:</Text>
            <Text style={styles.value}>{formatDate(payment.payment_date)}</Text>
          </View>

          {payment.transaction_ref && (
            <View style={styles.row}>
              <Text style={styles.label}>Transaction Reference:</Text>
              <Text style={styles.value}>{payment.transaction_ref}</Text>
            </View>
          )}
        </View>

        {/* Additional Information */}
        {(payment.notes || invoice?.data?.email || invoice?.data?.mobile_number) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>

            {invoice?.data?.email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{invoice.data.email}</Text>
              </View>
            )}

            {invoice?.data?.mobile_number && (
              <View style={styles.row}>
                <Text style={styles.label}>Mobile:</Text>
                <Text style={styles.value}>{invoice.data.mobile_number}</Text>
              </View>
            )}

            {payment.notes && (
              <View style={styles.row}>
                <Text style={styles.label}>Notes:</Text>
                <Text style={styles.value}>{payment.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your payment! This receipt was generated on {formatDate(new Date().toISOString())}
          </Text>
          <Text style={styles.footerText}>
            ADC Dental Clinic - Quality Dental Care
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default PaymentReceiptTemplate;