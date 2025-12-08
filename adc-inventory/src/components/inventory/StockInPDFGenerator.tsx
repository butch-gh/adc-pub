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
  supplierSection: {
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
  supplierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  supplierField: {
    width: '50%',
    marginBottom: 8,
  },
  supplierLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  supplierValue: {
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
  itemName: {
    flex: 2,
    fontWeight: 'bold',
  },
  batchNo: {
    flex: 1.5,
  },
  expiryDate: {
    flex: 1,
  },
  quantity: {
    flex: 1,
    textAlign: 'center',
  },
  unitCost: {
    flex: 1,
    textAlign: 'right',
  },
  totalCost: {
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
  remarksSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 3,
  },
  remarksTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  remarksText: {
    fontSize: 10,
    color: '#6b7280',
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

interface StockInItem {
  id: string;
  item_id: number;
  item_name: string;
  batch_no: string;
  expiry_date: string;
  qty_received: number;
  unit_cost: number;
  total_cost: number;
  remarks: string;
}

interface StockInPDFProps {
  stockInData: {
    stock_in_no: string;
    date_received: string;
    po_id: number | null;
    po_number?: string;
    supplier_id: number | null;
    supplier_name: string;
    received_by: string;
    remarks: string;
    items: StockInItem[];
  };
}

const formatCurrency = (amount: number) => {
  return `PHP ${amount.toLocaleString('en-PH', {
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

const StockInPDFDocument: React.FC<StockInPDFProps> = ({ stockInData }) => {
  const calculateTotals = () => {
    const totalItems = stockInData.items.length;
    const totalQuantity = stockInData.items.reduce((sum, item) => sum + item.qty_received, 0);
    const totalAmount = stockInData.items.reduce((sum, item) => sum + item.total_cost, 0);

    return { totalItems, totalQuantity, totalAmount };
  };

  const { totalItems, totalQuantity, totalAmount } = calculateTotals();

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
        <Text style={styles.title}>RECEIVED DELIVERY SLIP</Text>

        {/* Stock-In Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Stock-In No.</Text>
            <Text style={styles.detailValue}>{stockInData.stock_in_no}</Text>
            <Text style={styles.detailLabel}>Date Received</Text>
            <Text style={styles.detailValue}>{formatDate(stockInData.date_received)}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Received By</Text>
            <Text style={styles.detailValue}>{stockInData.received_by}</Text>
            <Text style={styles.detailLabel}>Reference PO</Text>
            <Text style={styles.detailValue}>{stockInData.po_id ? `PO-${stockInData.po_number}` : 'N/A'}</Text>
          </View>
        </View>

        {/* Supplier Information */}
        <View style={styles.supplierSection}>
          <Text style={styles.sectionTitle}>Supplier Information</Text>
          <View style={styles.supplierGrid}>
            <View style={styles.supplierField}>
              <Text style={styles.supplierLabel}>Supplier Name</Text>
              <Text style={styles.supplierValue}>{stockInData.supplier_name || 'N/A'}</Text>
            </View>
            <View style={styles.supplierField}>
              <Text style={styles.supplierLabel}>Supplier ID</Text>
              <Text style={styles.supplierValue}>{stockInData.supplier_id || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Items Received Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>Items Received</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.itemName]}>Item Description</Text>
            <Text style={[styles.tableHeaderText, styles.batchNo]}>Batch No.</Text>
            <Text style={[styles.tableHeaderText, styles.expiryDate]}>Expiry Date</Text>
            <Text style={[styles.tableHeaderText, styles.quantity]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.unitCost]}>Unit Cost</Text>
            <Text style={[styles.tableHeaderText, styles.totalCost]}>Total Cost</Text>
          </View>

          {stockInData.items.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={[styles.tableCell, styles.itemName]}>{item.item_name}</Text>
              <Text style={[styles.tableCell, styles.batchNo]}>{item.batch_no}</Text>
              <Text style={[styles.tableCell, styles.expiryDate]}>
                {item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}
              </Text>
              <Text style={[styles.tableCell, styles.quantity]}>{item.qty_received}</Text>
              <Text style={[styles.tableCell, styles.unitCost]}>{formatCurrency(item.unit_cost)}</Text>
              <Text style={[styles.tableCell, styles.totalCost]}>{formatCurrency(item.total_cost)}</Text>
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
            <Text style={styles.summaryLabel}>Total Quantity Received</Text>
            <Text style={styles.summaryValue}>{totalQuantity}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        {/* Remarks */}
        {stockInData.remarks && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksTitle}>Remarks</Text>
            <Text style={styles.remarksText}>{stockInData.remarks}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your delivery to Adriano Dental Clinic. This is a computer-generated delivery slip.</Text>
          <Text>For any questions, please contact us at (02) 123-4567</Text>
        </View>
      </Page>
    </Document>
  );
};

interface StockInPDFGeneratorProps {
  stockInData: {
    stock_in_no: string;
    date_received: string;
    po_id: number | null;
    supplier_id: number | null;
    supplier_name: string;
    received_by: string;
    remarks: string;
    items: StockInItem[];
  };
  fileName?: string;
}

export const StockInPDFGenerator: React.FC<StockInPDFGeneratorProps> = ({
  stockInData,
  fileName,
}) => {
  const defaultFileName = `StockIn-${stockInData.stock_in_no}.pdf`;

  return (
    <PDFDownloadLink
      document={<StockInPDFDocument stockInData={stockInData} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'Download PDF')}
    </PDFDownloadLink>
  );
};

export default StockInPDFGenerator;