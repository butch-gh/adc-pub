import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateGenerated: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 5,
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  summaryBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
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
    color: '#1e40af',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  chartNote: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
});

interface BookingTrendPDFTemplateProps {
  months?: string[];
  bookings?: number[];
  selectedTab: number;
}

const BookingTrendPDFTemplate: React.FC<BookingTrendPDFTemplateProps> = ({
  months = [],
  bookings = [],
  selectedTab,
}) => {
  // Get period label based on selected tab
  const getPeriodLabel = () => {
    switch (selectedTab) {
      case 0: return '12 Months';
      case 1: return '6 Months';
      case 2: return '30 Days';
      case 3: return '7 Days';
      default: return 'Custom Period';
    }
  };

  // Calculate statistics
  const totalBookings = bookings.reduce((sum, count) => sum + count, 0);
  const avgBookings = bookings.length > 0 ? (totalBookings / bookings.length).toFixed(1) : '0';
  const maxBookings = bookings.length > 0 ? Math.max(...bookings) : 0;
  const minBookings = bookings.length > 0 ? Math.min(...bookings) : 0;
  
  // Find peak period
  const peakIndex = bookings.indexOf(maxBookings);
  const peakPeriod = months[peakIndex] || 'N/A';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ADC Dental Clinic</Text>
          <Text style={styles.subtitle}>Booking Trend Report</Text>
          <Text style={styles.dateGenerated}>
            Generated on: {new Date().toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {/* Report Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Period: {getPeriodLabel()}</Text>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Summary Statistics</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Bookings:</Text>
            <Text style={styles.summaryValue}>{totalBookings}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Bookings per Period:</Text>
            <Text style={styles.summaryValue}>{avgBookings}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Peak Period:</Text>
            <Text style={styles.summaryValue}>{peakPeriod} ({maxBookings} bookings)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Lowest Period:</Text>
            <Text style={styles.summaryValue}>{minBookings} bookings</Text>
          </View>
        </View>

        {/* Booking Data Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Period</Text>
              <Text style={styles.tableHeaderText}>Bookings</Text>
              <Text style={styles.tableHeaderText}>% of Total</Text>
            </View>
            
            {/* Table Rows */}
            {months.map((month, index) => (
              <View 
                key={index} 
                style={[
                  styles.tableRow, 
                  index % 2 === 0 ? styles.tableRowEven : {}
                ]}
              >
                <Text style={styles.tableCell}>{month}</Text>
                <Text style={styles.tableCell}>{bookings[index]}</Text>
                <Text style={styles.tableCell}>
                  {totalBookings > 0 
                    ? ((bookings[index] / totalBookings) * 100).toFixed(1) 
                    : '0'
                  }%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Chart Note */}
        <Text style={styles.chartNote}>
          Note: This report provides a tabular view of the booking trend data. 
          For visual chart representation, please refer to the online dashboard.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ADC Dental Clinic - Performance Report | Confidential
          </Text>
          <Text style={styles.footerText}>
            Page 1 of 1
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default BookingTrendPDFTemplate;
