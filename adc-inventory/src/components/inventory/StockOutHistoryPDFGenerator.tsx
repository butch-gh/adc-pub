import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
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
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
  },
  reportInfo: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 5,
  },
  reportInfoText: {
    fontSize: 10,
    color: '#374151',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  refNo: {
    flex: 1.5,
  },
  date: {
    flex: 1.2,
  },
  releasedTo: {
    flex: 1.5,
  },
  itemsCount: {
    flex: 0.8,
    textAlign: 'center',
  },
  totalQty: {
    flex: 0.8,
    textAlign: 'center',
  },
  createdBy: {
    flex: 1,
  },
  summary: {
    marginTop: 20,
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
    fontSize: 10,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 10,
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

interface StockOutTransaction {
  stock_out_id: number;
  reference_no: string;
  stock_out_date: string;
  released_to: string;
  created_by: string;
  purpose?: string;
  items_count?: number;
  total_qty_released?: number;
}

interface StockOutHistoryPDFProps {
  transactions: StockOutTransaction[];
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const StockOutHistoryPDFDocument: React.FC<StockOutHistoryPDFProps> = ({ transactions }) => {
  const calculateTotals = () => {
    const totalTransactions = transactions.length;
    const totalItems = transactions.reduce((sum, t) => sum + (t.items_count || 0), 0);
    const totalQuantity = transactions.reduce((sum, t) => sum + (t.total_qty_released || 0), 0);

    return { totalTransactions, totalItems, totalQuantity };
  };

  const { totalTransactions, totalItems, totalQuantity } = calculateTotals();
  const reportDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
        <Text style={styles.title}>STOCK-OUT HISTORY REPORT</Text>

        {/* Report Info */}
        <View style={styles.reportInfo}>
          <Text style={styles.reportInfoText}>Report Generated: {reportDate}</Text>
          <Text style={styles.reportInfoText}>Total Transactions: {totalTransactions}</Text>
        </View>

        {/* Transactions Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.refNo]}>Reference No</Text>
            <Text style={[styles.tableHeaderText, styles.date]}>Date</Text>
            <Text style={[styles.tableHeaderText, styles.releasedTo]}>Released To</Text>
            <Text style={[styles.tableHeaderText, styles.itemsCount]}>Items</Text>
            <Text style={[styles.tableHeaderText, styles.totalQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.createdBy]}>Created By</Text>
          </View>

          {transactions.map((transaction, index) => (
            <View key={transaction.stock_out_id} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={[styles.tableCell, styles.refNo]}>{transaction.reference_no}</Text>
              <Text style={[styles.tableCell, styles.date]}>{formatDate(transaction.stock_out_date)}</Text>
              <Text style={[styles.tableCell, styles.releasedTo]}>{transaction.released_to}</Text>
              <Text style={[styles.tableCell, styles.itemsCount]}>{transaction.items_count || 0}</Text>
              <Text style={[styles.tableCell, styles.totalQty]}>{transaction.total_qty_released || 0}</Text>
              <Text style={[styles.tableCell, styles.createdBy]}>{transaction.created_by}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Transactions</Text>
            <Text style={styles.summaryValue}>{totalTransactions}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items Released</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Quantity Released</Text>
            <Text style={styles.summaryValue}>{totalQuantity}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Adriano Dental Clinic - Inventory Management System</Text>
          <Text>This is a computer-generated stock-out history report.</Text>
        </View>
      </Page>
    </Document>
  );
};

interface StockOutHistoryPDFGeneratorProps {
  transactions: StockOutTransaction[];
  fileName?: string;
}

export const StockOutHistoryPDFGenerator: React.FC<StockOutHistoryPDFGeneratorProps> = ({
  transactions,
  fileName,
}) => {
  const defaultFileName = `stock-out-history-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<StockOutHistoryPDFDocument transactions={transactions} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'PDF')}
    </PDFDownloadLink>
  );
};

export default StockOutHistoryPDFGenerator;