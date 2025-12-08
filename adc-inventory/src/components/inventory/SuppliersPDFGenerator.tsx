import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { Supplier } from '@/lib/inventory-api';

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
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  supplierName: {
    width: '25%',
  },
  contactPerson: {
    width: '20%',
  },
  phone: {
    width: '15%',
  },
  email: {
    width: '20%',
  },
  address: {
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

interface SuppliersPDFGeneratorProps {
  suppliers: Supplier[];
  fileName?: string;
}

const SuppliersPDFDocument: React.FC<{
  suppliers: Supplier[];
}> = ({ suppliers }) => {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalSuppliers = suppliers.length;
  const suppliersWithPhone = suppliers.filter(supplier => supplier.phone).length;
  const suppliersWithEmail = suppliers.filter(supplier => supplier.email).length;
  const suppliersWithAddress = suppliers.filter(supplier => supplier.address).length;

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
        <Text style={styles.title}>SUPPLIERS DIRECTORY REPORT</Text>

        {/* Report Information */}
        <View style={styles.reportInfo}>
          <Text style={styles.reportInfoText}>Report Generated: {reportDate}</Text>
          <Text style={styles.reportInfoText}>Total Suppliers: {totalSuppliers}</Text>
        </View>

        {/* Suppliers Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.supplierName]}>Supplier Name</Text>
            <Text style={[styles.tableHeaderText, styles.contactPerson]}>Contact Person</Text>
            <Text style={[styles.tableHeaderText, styles.phone]}>Phone</Text>
            <Text style={[styles.tableHeaderText, styles.email]}>Email</Text>
            <Text style={[styles.tableHeaderText, styles.address]}>Address</Text>
          </View>

          {suppliers.map((supplier, index) => (
            <View key={supplier.supplier_id} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={[styles.tableCell, styles.supplierName]}>{supplier.supplier_name}</Text>
              <Text style={[styles.tableCell, styles.contactPerson]}>{supplier.contact_person || '-'}</Text>
              <Text style={[styles.tableCell, styles.phone]}>{supplier.phone || '-'}</Text>
              <Text style={[styles.tableCell, styles.email]}>{supplier.email || '-'}</Text>
              <Text style={[styles.tableCell, styles.address]}>{supplier.address || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Supplier Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Suppliers:</Text>
            <Text style={styles.summaryValue}>{totalSuppliers}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>With Phone Numbers:</Text>
            <Text style={styles.summaryValue}>{suppliersWithPhone}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>With Email Addresses:</Text>
            <Text style={styles.summaryValue}>{suppliersWithEmail}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>With Addresses:</Text>
            <Text style={styles.summaryValue}>{suppliersWithAddress}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Adriano Dental Clinic - Inventory Management System</Text>
          <Text>This is a computer-generated suppliers directory report.</Text>
        </View>
      </Page>
    </Document>
  );
};

const SuppliersPDFGenerator: React.FC<SuppliersPDFGeneratorProps> = ({
  suppliers,
  fileName,
}) => {
  const defaultFileName = `suppliers-directory-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<SuppliersPDFDocument suppliers={suppliers} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'PDF')}
    </PDFDownloadLink>
  );
};

export default SuppliersPDFGenerator;