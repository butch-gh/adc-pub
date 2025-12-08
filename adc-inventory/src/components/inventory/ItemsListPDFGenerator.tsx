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
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
  },
  productCode: {
    width: '12%',
  },
  productName: {
    width: '20%',
  },
  category: {
    width: '15%',
  },
  supplier: {
    width: '18%',
  },
  unitMeasure: {
    width: '10%',
  },
  reorderLevel: {
    width: '10%',
    textAlign: 'right',
  },
  storageLocation: {
    width: '15%',
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

interface Product {
  item_id: number;
  item_code: string;
  item_name: string;
  category_id: number;
  category_name: string;
  supplier_id: number;
  supplier_name: string;
  unit_of_measure: string;
  reorder_level: number;
  storage_location: string;
  created_at: string;
}

interface ItemsListPDFGeneratorProps {
  products: Product[];
  fileName?: string;
}

const ItemsListPDFDocument: React.FC<{
  products: Product[];
}> = ({ products }) => {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalProducts = products.length;
  const totalReorderItems = products.filter(product => product.reorder_level > 0).length;
  const uniqueCategories = new Set(products.map(product => product.category_name)).size;
  const uniqueSuppliers = new Set(products.map(product => product.supplier_name)).size;

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
        <Text style={styles.title}>PRODUCT INVENTORY REPORT</Text>

        {/* Report Information */}
        <View style={styles.reportInfo}>
          <Text style={styles.reportInfoText}>Report Generated: {reportDate}</Text>
          <Text style={styles.reportInfoText}>Total Products: {totalProducts}</Text>
        </View>

        {/* Products Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.productCode]}>Code</Text>
            <Text style={[styles.tableHeaderText, styles.productName]}>Product Name</Text>
            <Text style={[styles.tableHeaderText, styles.category]}>Category</Text>
            <Text style={[styles.tableHeaderText, styles.supplier]}>Supplier</Text>
            <Text style={[styles.tableHeaderText, styles.unitMeasure]}>Unit</Text>
            <Text style={[styles.tableHeaderText, styles.reorderLevel]}>Reorder Level</Text>
            <Text style={[styles.tableHeaderText, styles.storageLocation]}>Storage Location</Text>
          </View>

          {products.map((product, index) => (
            <View key={product.item_id} style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={[styles.tableCell, styles.productCode]}>{product.item_code}</Text>
              <Text style={[styles.tableCell, styles.productName]}>{product.item_name}</Text>
              <Text style={[styles.tableCell, styles.category]}>{product.category_name}</Text>
              <Text style={[styles.tableCell, styles.supplier]}>{product.supplier_name}</Text>
              <Text style={[styles.tableCell, styles.unitMeasure]}>{product.unit_of_measure}</Text>
              <Text style={[styles.tableCell, styles.reorderLevel]}>{product.reorder_level}</Text>
              <Text style={[styles.tableCell, styles.storageLocation]}>{product.storage_location}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Inventory Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Products:</Text>
            <Text style={styles.summaryValue}>{totalProducts}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Products with Reorder Level:</Text>
            <Text style={styles.summaryValue}>{totalReorderItems}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Unique Categories:</Text>
            <Text style={styles.summaryValue}>{uniqueCategories}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Unique Suppliers:</Text>
            <Text style={styles.summaryValue}>{uniqueSuppliers}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Adriano Dental Clinic - Inventory Management System</Text>
          <Text>This is a computer-generated product inventory report.</Text>
        </View>
      </Page>
    </Document>
  );
};

const ItemsListPDFGenerator: React.FC<ItemsListPDFGeneratorProps> = ({
  products,
  fileName,
}) => {
  const defaultFileName = `product-inventory-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<ItemsListPDFDocument products={products} />}
      fileName={fileName || defaultFileName}
      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'PDF')}
    </PDFDownloadLink>
  );
};

export default ItemsListPDFGenerator;