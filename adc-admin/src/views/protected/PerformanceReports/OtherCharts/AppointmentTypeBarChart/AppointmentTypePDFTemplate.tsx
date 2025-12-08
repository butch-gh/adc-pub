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
  },
  tableHeaderType: {
    flex: 2,
  },
  tableHeaderCount: {
    flex: 1,
    textAlign: 'right',
  },
  tableHeaderPercent: {
    flex: 1,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
  },
  tableCellType: {
    flex: 2,
  },
  tableCellCount: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  tableCellPercent: {
    flex: 1,
    textAlign: 'right',
    color: '#6b7280',
  },
  colorBox: {
    width: 12,
    height: 12,
    marginRight: 8,
    borderRadius: 2,
  },
  typeWithColor: {
    flexDirection: 'row',
    alignItems: 'center',
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

interface AppointmentTypePDFTemplateProps {
  treatmentTypes?: string[];
  typeCounts?: number[];
  rangeType: string;
}

const AppointmentTypePDFTemplate: React.FC<AppointmentTypePDFTemplateProps> = ({
  treatmentTypes = [],
  typeCounts = [],
  rangeType,
}) => {
  // Get period label based on range type
  const getPeriodLabel = () => {
    switch (rangeType) {
      case '7DAYS': return 'Last 7 Days';
      case '30DAYS': return 'Last 30 Days';
      case '6MONTHS': return 'Last 6 Months';
      case '12MONTHS': return 'Last 12 Months';
      default: return 'Custom Period';
    }
  };

  // Chart colors matching the original chart
  const colors = ['#FFCE56', '#4BC0C0', '#FF6384', '#36A2EB', '#c2c3c4'];

  // Calculate statistics
  const totalAppointments = typeCounts.reduce((sum, count) => sum + count, 0);
  const avgPerType = typeCounts.length > 0 ? (totalAppointments / typeCounts.length).toFixed(1) : '0';
  
  // Find most popular type
  const maxCount = typeCounts.length > 0 ? Math.max(...typeCounts) : 0;
  const maxIndex = typeCounts.indexOf(maxCount);
  const mostPopularType = treatmentTypes[maxIndex] || 'N/A';

  // Find least popular type
  const minCount = typeCounts.length > 0 ? Math.min(...typeCounts) : 0;
  const minIndex = typeCounts.indexOf(minCount);
  const leastPopularType = treatmentTypes[minIndex] || 'N/A';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ADC Dental Clinic</Text>
          <Text style={styles.subtitle}>Appointment Type Distribution Report</Text>
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
            <Text style={styles.summaryLabel}>Total Appointments:</Text>
            <Text style={styles.summaryValue}>{totalAppointments}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Number of Appointment Types:</Text>
            <Text style={styles.summaryValue}>{treatmentTypes.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average per Type:</Text>
            <Text style={styles.summaryValue}>{avgPerType}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Most Popular Type:</Text>
            <Text style={styles.summaryValue}>{mostPopularType} ({maxCount} appointments)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Least Popular Type:</Text>
            <Text style={styles.summaryValue}>{leastPopularType} ({minCount} appointments)</Text>
          </View>
        </View>

        {/* Appointment Type Distribution Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Type Breakdown</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableHeaderType]}>Appointment Type</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderCount]}>Count</Text>
              <Text style={[styles.tableHeaderText, styles.tableHeaderPercent]}>% of Total</Text>
            </View>
            
            {/* Table Rows */}
            {treatmentTypes.map((type, index) => (
              <View 
                key={index} 
                style={[
                  styles.tableRow, 
                  index % 2 === 0 ? styles.tableRowEven : {}
                ]}
              >
                <View style={[styles.typeWithColor, styles.tableCellType]}>
                  <View style={[styles.colorBox, { backgroundColor: colors[index % colors.length] }]} />
                  <Text style={styles.tableCell}>{type}</Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellCount]}>
                  {typeCounts[index]}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellPercent]}>
                  {totalAppointments > 0 
                    ? ((typeCounts[index] / totalAppointments) * 100).toFixed(1) 
                    : '0'
                  }%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Chart Note */}
        <Text style={styles.chartNote}>
          Note: This report provides a detailed breakdown of appointment types. 
          For visual bar chart representation, please refer to the online dashboard.
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

export default AppointmentTypePDFTemplate;
