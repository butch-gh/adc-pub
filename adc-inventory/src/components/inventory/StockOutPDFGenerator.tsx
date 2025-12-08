import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
  },
  detailsSection: {
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
  purposeSection: {
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
  purposeText: {
    fontSize: 11,
    color: '#1f2937',
    lineHeight: 1.4,
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
  itemName: {
    flex: 2,
    fontWeight: 'bold',
  },
  batchNo: {
    flex: 1.5,
  },
  quantity: {
    flex: 1,
    textAlign: 'center',
  },
  remarks: {
    flex: 2,
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

interface StockOutItem {
  id: number;
  item_name: string;
  batch_no: string;
  qty_released: number;
  remarks: string | null;
}

interface StockOutTransaction {
  stock_out_id: number;
  reference_no: string;
  stock_out_date: string;
  released_to: string;
  created_by: string;
  purpose?: string;
  items: StockOutItem[];
}

interface StockOutPDFProps {
  transaction: StockOutTransaction;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const StockOutPDFDocument: React.FC<StockOutPDFProps> = ({ transaction }) => {
  const calculateTotals = () => {
    const totalItems = transaction.items?.length || 0;
    const totalQuantity = transaction.items?.reduce((sum, item) => sum + item.qty_released, 0) || 0;

    return { totalItems, totalQuantity };
  };

  const { totalItems, totalQuantity } = calculateTotals();

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

        {/* Title */}
        <Text style={styles.title}>STOCK-OUT RELEASE SLIP</Text>

        {/* Transaction Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Reference Number</Text>
            <Text style={styles.detailValue}>{transaction.reference_no}</Text>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.stock_out_date)}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Released To</Text>
            <Text style={styles.detailValue}>{transaction.released_to}</Text>
            <Text style={styles.detailLabel}>Created By</Text>
            <Text style={styles.detailValue}>{transaction.created_by}</Text>
          </View>
        </View>

        {/* Purpose */}
        {transaction.purpose && (
          <View style={styles.purposeSection}>
            <Text style={styles.sectionTitle}>Purpose</Text>
            <Text style={styles.purposeText}>{transaction.purpose}</Text>
          </View>
        )}

        {/* Items Released Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>Items Released</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.itemName]}>Item Description</Text>
            <Text style={[styles.tableHeaderText, styles.batchNo]}>Batch No.</Text>
            <Text style={[styles.tableHeaderText, styles.quantity]}>Qty Released</Text>
            <Text style={[styles.tableHeaderText, styles.remarks]}>Remarks</Text>
          </View>

          {transaction.items?.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={[styles.tableCell, styles.itemName]}>{item.item_name}</Text>
              <Text style={[styles.tableCell, styles.batchNo]}>{item.batch_no}</Text>
              <Text style={[styles.tableCell, styles.quantity]}>{item.qty_released}</Text>
              <Text style={[styles.tableCell, styles.remarks]}>{item.remarks || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Quantity Released</Text>
            <Text style={styles.summaryValue}>{totalQuantity}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for using Adriano Dental Clinic inventory management system.</Text>
          <Text>This is a computer-generated stock-out release slip.</Text>
        </View>
      </Page>
    </Document>
  );
};

interface StockOutPDFGeneratorProps {
  transaction: StockOutTransaction;
  fileName?: string;
}

export const StockOutPDFGenerator: React.FC<StockOutPDFGeneratorProps> = ({
  transaction,
  fileName,
}) => {
  const defaultFileName = `StockOut-${transaction.reference_no}.pdf`;

  return (
    <PDFDownloadLink
      document={<StockOutPDFDocument transaction={transaction} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  );
};

export default StockOutPDFGenerator;