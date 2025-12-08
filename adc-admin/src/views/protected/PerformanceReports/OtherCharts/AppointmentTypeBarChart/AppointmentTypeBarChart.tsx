import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Stack, Card, CardHeader, CardContent, Typography, FormControl, MenuItem, Select, SelectChangeEvent, Button, CircularProgress, Box } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import useGet from 'services/hooks/useGet';
import { pdf } from '@react-pdf/renderer';
import AppointmentTypePDFTemplate from './AppointmentTypePDFTemplate';

// Register necessary components of Chart.js
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement);

type RangeData={
  treatment_type :  string[],
  type_count : number[]
}

const AppointmentTypeBarChart: React.FC = () => {
  const [rangeType, setTimeRange] = useState('7DAYS');
  const [rangeResult, setRangeResult] = useState<RangeData>()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data } = useGet({
    endpoint: "performance/get-appointment-type",
    param: {rangeType: rangeType},
    querykey: "get-appointment-type-data",
  });


  useEffect(()=>{
    if (data) {
      console.log('get-appointment-type', data)
      setRangeResult(data);
    }
  },[data])

  // Data mapping based on time range
  // const dataByTimeRange: { [key: string]: number[] } = {
  //   'Last 7 days': [20, 15, 30, 5, 12],
  //   'Last 30 days': [80, 50, 40, 20, 30],
  //   'Last 6 months': [2400, 1800, 1200, 1600, 300],
  //   'Last 12 months': [960, 720, 480, 240, 620],
  // };

  // Labels and dynamic dataset for the chart
  const appointmentTypeData = {
    labels: rangeResult?.treatment_type,
    datasets: [
      {
        label: 'Appointment Counts',
        //data: dataByTimeRange[rangeType],
        data: rangeResult?.type_count,
        backgroundColor: ['#FFCE56', '#4BC0C0', '#FF6384', '#36A2EB', '#c2c3c4'],
        //backgroundColor: '#4BC0C0',
        borderWidth: 1,
      },
    ],
  };

  // Options for Bar Chart
  const barOptions = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top' as const, // Explicitly type "top" as const
            align: 'start' as const, // Explicitly type "start" as const
            labels: {
              boxWidth: 20,
              padding: 10,
            },
          },
    },
    indexAxis: 'y' as const, // Makes the bar chart horizontal
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  // Handle dropdown change with SelectChangeEvent type
  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setTimeRange(event.target.value as string);
  };

  const handleGeneratePDF = async () => {
    if (!rangeResult?.treatment_type || !rangeResult?.type_count) {
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const blob = await pdf(
        <AppointmentTypePDFTemplate
          treatmentTypes={rangeResult.treatment_type}
          typeCounts={rangeResult.type_count}
          rangeType={rangeType}
        />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with period and date
      const periodLabels: { [key: string]: string } = {
        '7DAYS': '7-days',
        '30DAYS': '30-days',
        '6MONTHS': '6-months',
        '12MONTHS': '12-months'
      };
      const periodLabel = periodLabels[rangeType] || 'custom';
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `appointment-type-${periodLabel}-${dateStr}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Card sx={{ flex: 1, width: '100%' }}>
      <CardHeader
        title="Appointment Type"
        action={
          <Box display="flex" gap={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={isGeneratingPDF ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF || !rangeResult?.treatment_type || rangeResult.treatment_type.length === 0}
              sx={{
                textTransform: 'none',
                paddingX: 2,
                paddingY: 0.5,
              }}
            >
              {isGeneratingPDF ? 'Generating...' : 'PDF'}
            </Button>
            <FormControl size="small" variant="outlined">
              <Select
                value={rangeType}
                onChange={handleTimeRangeChange}
                sx={{
                  border: 'none',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                }}
              >
                <MenuItem value="7DAYS">Last 7 days</MenuItem>
                <MenuItem value="30DAYS">Last 30 days</MenuItem>
                <MenuItem value="6MONTHS">Last 6 months</MenuItem>
                <MenuItem value="12MONTHS">Last 12 months</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
      />
      <CardContent>
        <Bar data={appointmentTypeData} options={barOptions} />
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', marginTop: 2 }}>
          A comparison of counts for different types of appointments ({rangeType}).
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AppointmentTypeBarChart;
