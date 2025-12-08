import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const pdfStyles = StyleSheet.create({
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
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    textAlign: 'center',
  },
  // Expiry specific widths
  expiryItemName: { width: '25%' },
  expiryBatch: { width: '20%' },
  expiryDate: { width: '20%' },
  expiryQuantity: { width: '20%' },
  expiryStatus: { width: '15%' },
  // Low stock specific widths
  lowStockItemName: { width: '25%' },
  lowStockCurrent: { width: '20%' },
  lowStockMin: { width: '20%' },
  lowStockSupplier: { width: '25%' },
  lowStockStatus: { width: '10%' },
  // Purchase history specific widths
  purchasePoNumber: { width: '10%' },
  purchasePoDate: { width: '10%' },
  purchaseSupplier: { width: '15%' },
  purchaseItem: { width: '15%' },
  purchaseQtyOrdered: { width: '8%' },
  purchaseQtyReceived: { width: '8%' },
  purchaseUnitCost: { width: '10%' },
  purchaseOrderedTotal: { width: '10%' },
  purchaseReceivedTotal: { width: '10%' },
  purchaseStatus: { width: '4%' },
});

interface ReportsPDFDocumentProps {
  reportType: string;
  data: any[];
  dateRange: string;
}

const ReportsPDFDocument: React.FC<ReportsPDFDocumentProps> = ({ reportType, data, dateRange }) => {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let title = '';
  let headers: { text: string; style: any }[] = [];
  let rows: any[][] = [];

  if (reportType === 'expiry') {
    title = 'Expiry Report';
    headers = [
      { text: 'Item Name', style: pdfStyles.expiryItemName },
      { text: 'Batch Number', style: pdfStyles.expiryBatch },
      { text: 'Expiry Date', style: pdfStyles.expiryDate },
      { text: 'Quantity', style: pdfStyles.expiryQuantity },
      { text: 'Status', style: pdfStyles.expiryStatus },
    ];
    rows = data.map((r: any) => [
      { text: r.name || '', style: pdfStyles.expiryItemName },
      { text: r.batch_number || '', style: pdfStyles.expiryBatch },
      { text: r.expiry_date || '', style: pdfStyles.expiryDate },
      { text: `${r.quantity || 0} ${r.unit || ''}`, style: pdfStyles.expiryQuantity },
      { text: r.days_until_expiry <= 0 ? 'Expired' : (r.days_until_expiry <= 30 ? 'Critical' : (r.days_until_expiry <= 90 ? 'Warning' : 'Safe')), style: pdfStyles.expiryStatus },
    ]);
  } else if (reportType === 'low-stock') {
    title = 'Low Stock Report';
    headers = [
      { text: 'Item Name', style: pdfStyles.lowStockItemName },
      { text: 'Current Stock', style: pdfStyles.lowStockCurrent },
      { text: 'Minimum Stock', style: pdfStyles.lowStockMin },
      { text: 'Supplier', style: pdfStyles.lowStockSupplier },
      { text: 'Status', style: pdfStyles.lowStockStatus },
    ];
    rows = data.map((r: any) => [
      { text: r.name || '', style: pdfStyles.lowStockItemName },
      { text: `${r.current_stock || 0} ${r.unit || ''}`, style: pdfStyles.lowStockCurrent },
      { text: `${r.minimum_stock || 0} ${r.unit || ''}`, style: pdfStyles.lowStockMin },
      { text: r.supplier_name || '', style: pdfStyles.lowStockSupplier },
      { text: 'Low Stock', style: pdfStyles.lowStockStatus },
    ]);
  } else if (reportType === 'purchase-history') {
    title = 'Purchase History';
    headers = [
      { text: 'PO Number', style: pdfStyles.purchasePoNumber },
      { text: 'PO Date', style: pdfStyles.purchasePoDate },
      { text: 'Supplier', style: pdfStyles.purchaseSupplier },
      { text: 'Item', style: pdfStyles.purchaseItem },
      { text: 'Qty Ordered', style: pdfStyles.purchaseQtyOrdered },
      { text: 'Qty Received', style: pdfStyles.purchaseQtyReceived },
      { text: 'Unit Cost', style: pdfStyles.purchaseUnitCost },
      { text: 'Ordered Total', style: pdfStyles.purchaseOrderedTotal },
      { text: 'Received Total', style: pdfStyles.purchaseReceivedTotal },
      { text: 'Status', style: pdfStyles.purchaseStatus },
    ];
    rows = data.map((r: any) => [
      { text: r.po_number || '', style: pdfStyles.purchasePoNumber },
      { text: r.po_date || '', style: pdfStyles.purchasePoDate },
      { text: r.supplier_name || '', style: pdfStyles.purchaseSupplier },
      { text: r.item_name || '', style: pdfStyles.purchaseItem },
      { text: String(r.quantity_ordered || 0), style: pdfStyles.purchaseQtyOrdered },
      { text: String(r.quantity_received || 0), style: pdfStyles.purchaseQtyReceived },
      { text: String(r.unit_cost || 0), style: pdfStyles.purchaseUnitCost },
      { text: String(r.ordered_total || 0), style: pdfStyles.purchaseOrderedTotal },
      { text: String(r.received_total || 0), style: pdfStyles.purchaseReceivedTotal },
      { text: r.receiving_status || '', style: pdfStyles.purchaseStatus },
    ]);
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page} orientation="landscape">
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.companyName}>Adriano Dental Clinic</Text>
          <Text style={pdfStyles.companyInfo}>Professional Dental Care Services</Text>
          <Text style={pdfStyles.companyInfo}>15 Balagtas St, Taguig City, 1632</Text>
          <Text style={pdfStyles.companyInfo}>Manila, Philippines 1000</Text>
          <Text style={pdfStyles.companyInfo}>Phone: 0915-036-7309 | Email: info@adrianodental.com</Text>
        </View>

        {/* Title */}
        <Text style={pdfStyles.title}>{title}</Text>

        {/* Report Information */}
        <View style={pdfStyles.reportInfo}>
          <Text style={pdfStyles.reportInfoText}>Report Generated: {reportDate}</Text>
          <Text style={pdfStyles.reportInfoText}>Date Range: Last {dateRange} days</Text>
          <Text style={pdfStyles.reportInfoText}>Total Records: {data.length}</Text>
        </View>

        {/* Table */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            {headers.map((h, idx) => (
              <Text key={idx} style={[pdfStyles.tableHeaderText, h.style]}>{h.text}</Text>
            ))}
          </View>

          {rows.map((row, idx) => (
            <View key={idx} style={[pdfStyles.tableRow, ...(idx % 2 === 1 ? [pdfStyles.tableRowAlt] : [])]}>
              {row.map((cell, cellIdx) => (
                <Text key={cellIdx} style={[pdfStyles.tableCell, cell.style]}>{cell.text}</Text>
              ))}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>Adriano Dental Clinic - Inventory Management System</Text>
          <Text>This is a computer-generated report.</Text>
        </View>
      </Page>
    </Document>
  );
};

const ReportsPDFGenerator: React.FC<{
  reportType: string;
  data: any[];
  dateRange: string;
  fileName?: string;
}> = ({ reportType, data, dateRange, fileName }) => {
  const defaultFileName = `${reportType.replace(/\s+/g, '-').toLowerCase()}-${dateRange}days.pdf`;

  return (
    <PDFDownloadLink
      document={<ReportsPDFDocument reportType={reportType} data={data} dateRange={dateRange} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'PDF')}
    </PDFDownloadLink>
  );
};

export default ReportsPDFGenerator;