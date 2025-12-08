import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
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
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
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
    fontSize: 9,
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
    fontSize: 8,
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
    fontSize: 8,
    color: '#374151',
  },
  batchNo: {
    flex: 1.2,
  },
  itemName: {
    flex: 2,
  },
  qty: {
    flex: 0.8,
    textAlign: 'center',
  },
  expiryDate: {
    flex: 1,
  },
  status: {
    flex: 1,
  },
  createdDate: {
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
    fontSize: 9,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
});

interface StockBatch {
  batch_id: number;
  item_id: number;
  item_name?: string;
  batch_no: string;
  expiry_date?: string;
  qty_available: number;
  created_at: string;
}

interface StocksPDFProps {
  stocks: StockBatch[];
  getStockStatus: (batch: StockBatch) => { status: string; label: string; color: string };
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const StocksPDFDocument: React.FC<StocksPDFProps> = ({ stocks, getStockStatus }) => {
  const calculateTotals = () => {
    const totalItems = stocks.length;
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.qty_available, 0);
    const inStock = stocks.filter(stock => getStockStatus(stock).status === 'in-stock').length;
    const lowStock = stocks.filter(stock => getStockStatus(stock).status === 'low-stock').length;
    const expiringSoon = stocks.filter(stock => getStockStatus(stock).status === 'expiring-soon').length;
    const expired = stocks.filter(stock => getStockStatus(stock).status === 'expired').length;
    const outOfStock = stocks.filter(stock => getStockStatus(stock).status === 'out-of-stock').length;

    return { totalItems, totalQuantity, inStock, lowStock, expiringSoon, expired, outOfStock };
  };

  const { totalItems, totalQuantity, inStock, lowStock, expiringSoon, expired, outOfStock } = calculateTotals();
  const reportDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>Adriano Dental Clinic</Text>
          <Text style={styles.companyInfo}>Professional Dental Care Services</Text>
          <Text style={styles.companyInfo}>15 Balagtas St, Taguig City, 1632</Text>
          <Text style={styles.companyInfo}>Manila, Philippines 1000</Text>
          <Text style={styles.companyInfo}>Phone: 0915-036-7309 | Email: info@adrianodental.com</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>STOCK INVENTORY REPORT</Text>

        {/* Report Info */}
        <View style={styles.reportInfo}>
          <Text style={styles.reportInfoText}>Report Generated: {reportDate}</Text>
          <Text style={styles.reportInfoText}>Total Stock Items: {totalItems}</Text>
        </View>

        {/* Stocks Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.batchNo]}>Batch No</Text>
            <Text style={[styles.tableHeaderText, styles.itemName]}>Item Name</Text>
            <Text style={[styles.tableHeaderText, styles.qty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.expiryDate]}>Expiry Date</Text>
            <Text style={[styles.tableHeaderText, styles.status]}>Status</Text>
            <Text style={[styles.tableHeaderText, styles.createdDate]}>Created Date</Text>
          </View>

          {stocks.map((stock, index) => {
            const { label: statusLabel } = getStockStatus(stock);
            return (
              <View key={stock.batch_id} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                <Text style={[styles.tableCell, styles.batchNo]}>{stock.batch_no}</Text>
                <Text style={[styles.tableCell, styles.itemName]}>{stock.item_name || 'N/A'}</Text>
                <Text style={[styles.tableCell, styles.qty]}>{stock.qty_available}</Text>
                <Text style={[styles.tableCell, styles.expiryDate]}>
                  {stock.expiry_date ? formatDate(stock.expiry_date) : 'N/A'}
                </Text>
                <Text style={[styles.tableCell, styles.status]}>{statusLabel}</Text>
                <Text style={[styles.tableCell, styles.createdDate]}>{formatDate(stock.created_at)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Quantity</Text>
            <Text style={styles.summaryValue}>{totalQuantity}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>In Stock</Text>
            <Text style={styles.summaryValue}>{inStock}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Low Stock</Text>
            <Text style={styles.summaryValue}>{lowStock}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expiring Soon</Text>
            <Text style={styles.summaryValue}>{expiringSoon}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expired</Text>
            <Text style={styles.summaryValue}>{expired}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Out of Stock</Text>
            <Text style={styles.summaryValue}>{outOfStock}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Adriano Dental Clinic - Inventory Management System</Text>
          <Text>This is a computer-generated stock inventory report.</Text>
        </View>
      </Page>
    </Document>
  );
};

interface StocksPDFGeneratorProps {
  stocks: StockBatch[];
  getStockStatus: (batch: StockBatch) => { status: string; label: string; color: string };
  fileName?: string;
}

export const StocksPDFGenerator: React.FC<StocksPDFGeneratorProps> = ({
  stocks,
  getStockStatus,
  fileName,
}) => {
  const defaultFileName = `stocks-inventory-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<StocksPDFDocument stocks={stocks} getStockStatus={getStockStatus} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'PDF')}
    </PDFDownloadLink>
  );
};

export default StocksPDFGenerator;