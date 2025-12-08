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
  dataGrid: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 15,
  },
  dataCard: {
    flex: 1,
    padding: 15,
    borderRadius: 6,
    borderWidth: 1,
  },
  showedCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  noShowCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  dataCardTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  showedTitle: {
    color: '#1e40af',
  },
  noShowTitle: {
    color: '#991b1b',
  },
  dataCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  showedValue: {
    color: '#2563eb',
  },
  noShowValue: {
    color: '#dc2626',
  },
  dataCardPercent: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
  },
  rateAnalysis: {
    marginTop: 20,
    padding: 15,
    borderRadius: 6,
    borderWidth: 1,
  },
  goodRate: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  warningRate: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  poorRate: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  analysisTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  analysisText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
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

interface NoShowRatePDFTemplateProps {
  showTypes?: string[];
  showCounts?: number[];
  rangeType: string;
}

const NoShowRatePDFTemplate: React.FC<NoShowRatePDFTemplateProps> = ({
  showTypes = [],
  showCounts = [],
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

  // Calculate statistics
  const totalAppointments = showCounts.reduce((sum, count) => sum + count, 0);
  
  // Find showed and no-show counts
  const showedIndex = showTypes.findIndex(type => type.toLowerCase().includes('showed') || type.toLowerCase().includes('attended'));
  const noShowIndex = showTypes.findIndex(type => type.toLowerCase().includes('no') && type.toLowerCase().includes('show'));
  
  const showedCount = showedIndex >= 0 ? showCounts[showedIndex] : 0;
  const noShowCount = noShowIndex >= 0 ? showCounts[noShowIndex] : 0;
  
  const showedPercent = totalAppointments > 0 ? ((showedCount / totalAppointments) * 100).toFixed(1) : '0';
  const noShowPercent = totalAppointments > 0 ? ((noShowCount / totalAppointments) * 100).toFixed(1) : '0';
  
  // Analyze the no-show rate
  const noShowRate = parseFloat(noShowPercent);
  const getRateAnalysis = () => {
    if (noShowRate < 5) {
      return {
        status: 'Excellent',
        message: 'Your no-show rate is excellent. The clinic maintains strong patient commitment with very few missed appointments.',
        style: styles.goodRate
      };
    } else if (noShowRate < 10) {
      return {
        status: 'Good',
        message: 'Your no-show rate is within acceptable range. Continue monitoring and consider reminder strategies to maintain this level.',
        style: styles.goodRate
      };
    } else if (noShowRate < 20) {
      return {
        status: 'Needs Attention',
        message: 'Your no-show rate is moderate. Consider implementing appointment reminders, confirmation calls, or policies to reduce no-shows.',
        style: styles.warningRate
      };
    } else {
      return {
        status: 'Critical',
        message: 'Your no-show rate is high and significantly impacts clinic efficiency. Immediate action recommended: implement reminder systems, review booking policies, and consider deposit requirements.',
        style: styles.poorRate
      };
    }
  };

  const analysis = getRateAnalysis();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ADC Dental Clinic</Text>
          <Text style={styles.subtitle}>No-Show Rate Analysis Report</Text>
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
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Appointments:</Text>
            <Text style={styles.summaryValue}>{totalAppointments}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Attended Appointments:</Text>
            <Text style={styles.summaryValue}>{showedCount} ({showedPercent}%)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>No-Show Appointments:</Text>
            <Text style={styles.summaryValue}>{noShowCount} ({noShowPercent}%)</Text>
          </View>
        </View>

        {/* Data Cards */}
        <View style={styles.dataGrid}>
          <View style={[styles.dataCard, styles.showedCard]}>
            <Text style={[styles.dataCardTitle, styles.showedTitle]}>Patients Showed Up</Text>
            <Text style={[styles.dataCardValue, styles.showedValue]}>{showedCount}</Text>
            <Text style={styles.dataCardPercent}>{showedPercent}% of total</Text>
          </View>
          
          <View style={[styles.dataCard, styles.noShowCard]}>
            <Text style={[styles.dataCardTitle, styles.noShowTitle]}>No-Show</Text>
            <Text style={[styles.dataCardValue, styles.noShowValue]}>{noShowCount}</Text>
            <Text style={styles.dataCardPercent}>{noShowPercent}% of total</Text>
          </View>
        </View>

        {/* Rate Analysis */}
        <View style={[styles.rateAnalysis, analysis.style]}>
          <Text style={styles.analysisTitle}>Assessment: {analysis.status}</Text>
          <Text style={styles.analysisText}>{analysis.message}</Text>
        </View>

        {/* Chart Note */}
        <Text style={styles.chartNote}>
          Note: This report provides a detailed breakdown of appointment attendance. 
          For visual pie chart representation, please refer to the online dashboard.
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

export default NoShowRatePDFTemplate;
