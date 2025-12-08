import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { StockBatch, StockAdjustment } from '../../lib/inventory-api';

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
  batchInfo: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 5,
  },
  batchInfoText: {
    fontSize: 9,
    color: '#374151',
    marginBottom: 3,
  },
  reportInfo: {
    marginBottom: 20,
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 5,
  },
  reportInfoText: {
    fontSize: 9,
    color: '#0c4a6e',
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
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  dateTime: {
    width: '15%',
  },
  qty: {
    width: '10%',
    textAlign: 'right',
  },
  change: {
    width: '10%',
    textAlign: 'right',
  },
  type: {
    width: '15%',
  },
  reason: {
    width: '30%',
  },
  by: {
    width: '20%',
  },
  summary: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    textAlign: 'center',
  },
});

interface StocksAdjustmentHistoryPDFGeneratorProps {
  selectedBatch: StockBatch;
  adjustmentHistory: StockAdjustment[];
  fileName?: string;
}

const StocksAdjustmentHistoryPDFDocument: React.FC<{
  selectedBatch: StockBatch;
  adjustmentHistory: StockAdjustment[];
}> = ({ selectedBatch, adjustmentHistory }) => {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalAdjustments = adjustmentHistory.length;
  const totalIncrease = adjustmentHistory.reduce((sum, adj) => {
    const change = adj.new_qty - adj.old_qty;
    return change > 0 ? sum + change : sum;
  }, 0);
  const totalDecrease = adjustmentHistory.reduce((sum, adj) => {
    const change = adj.new_qty - adj.old_qty;
    return change < 0 ? sum + Math.abs(change) : sum;
  }, 0);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
        <Text style={styles.title}>STOCK ADJUSTMENT HISTORY REPORT</Text>

        {/* Batch Information */}
        <View style={styles.batchInfo}>
          <Text style={styles.batchInfoText}>Batch Number: {selectedBatch.batch_no}</Text>
          <Text style={styles.batchInfoText}>Item: {selectedBatch.item_name || 'N/A'}</Text>
          <Text style={styles.batchInfoText}>Current Quantity: {selectedBatch.qty_available}</Text>
        </View>

        {/* Report Information */}
        <View style={styles.reportInfo}>
          <Text style={styles.reportInfoText}>Report Generated: {reportDate}</Text>
          <Text style={styles.reportInfoText}>Total Adjustments: {totalAdjustments}</Text>
        </View>

        {/* History Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.dateTime]}>Date / Time</Text>
            <Text style={[styles.tableHeaderText, styles.qty]}>Old Qty</Text>
            <Text style={[styles.tableHeaderText, styles.qty]}>New Qty</Text>
            <Text style={[styles.tableHeaderText, styles.change]}>Change</Text>
            <Text style={[styles.tableHeaderText, styles.type]}>Type</Text>
            <Text style={[styles.tableHeaderText, styles.reason]}>Reason</Text>
            <Text style={[styles.tableHeaderText, styles.by]}>By</Text>
          </View>

          {adjustmentHistory.map((adjustment, index) => {
            const change = adjustment.new_qty - adjustment.old_qty;
            const changeText = change > 0 ? `+${change}` : change.toString();

            return (
              <View key={adjustment.adjustment_id} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
                <Text style={[styles.tableCell, styles.dateTime]}>
                  {formatDateTime(adjustment.adjusted_at)}
                </Text>
                <Text style={[styles.tableCell, styles.qty]}>{adjustment.old_qty}</Text>
                <Text style={[styles.tableCell, styles.qty]}>{adjustment.new_qty}</Text>
                <Text style={[styles.tableCell, styles.change, { color: change > 0 ? '#16a34a' : change < 0 ? '#dc2626' : '#6b7280' }]}>
                  {changeText}
                </Text>
                <Text style={[styles.tableCell, styles.type]}>
                  {adjustment.adjustment_type || 'Correction'}
                </Text>
                <Text style={[styles.tableCell, styles.reason]}>
                  {adjustment.reason || 'No reason provided'}
                </Text>
                <Text style={[styles.tableCell, styles.by]}>
                  {adjustment.adjusted_by ? `User ${adjustment.adjusted_by}` : 'System'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Adjustment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Adjustments:</Text>
            <Text style={styles.summaryValue}>{totalAdjustments}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Quantity Increase:</Text>
            <Text style={styles.summaryValue}>+{totalIncrease}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Quantity Decrease:</Text>
            <Text style={styles.summaryValue}>-{totalDecrease}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Change:</Text>
            <Text style={[styles.summaryValue, { color: (totalIncrease - totalDecrease) >= 0 ? '#16a34a' : '#dc2626' }]}>
              {(totalIncrease - totalDecrease) >= 0 ? '+' : ''}{totalIncrease - totalDecrease}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Adriano Dental Clinic - Inventory Management System</Text>
          <Text>This is a computer-generated stock adjustment history report.</Text>
        </View>
      </Page>
    </Document>
  );
};

const StocksAdjustmentHistoryPDFGenerator: React.FC<StocksAdjustmentHistoryPDFGeneratorProps> = ({
  selectedBatch,
  adjustmentHistory,
  fileName,
}) => {
  const defaultFileName = `stock-adjustment-history-${selectedBatch.batch_no}-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<StocksAdjustmentHistoryPDFDocument selectedBatch={selectedBatch} adjustmentHistory={adjustmentHistory} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'PDF')}
    </PDFDownloadLink>
  );
};

export default StocksAdjustmentHistoryPDFGenerator;