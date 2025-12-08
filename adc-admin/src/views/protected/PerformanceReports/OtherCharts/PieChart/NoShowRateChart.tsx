import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Card, CardHeader, CardContent, Typography, FormControl, MenuItem, Select, SelectChangeEvent, Button, CircularProgress, Box } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import useGet from 'services/hooks/useGet';
import { pdf } from '@react-pdf/renderer';
import NoShowRatePDFTemplate from './NoShowRatePDFTemplate';

// Register necessary components of Chart.js
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale);
type RangeData={
  show_type :  string[],
  show_count : number[]
}

const NoShowRateChart: React.FC = () => {
  //const [timeRange, setTimeRange] = useState('Last 7 days');
  const [rangeType, setRangeType] = useState('7DAYS');
  const [rangeResult, setRangeResult] = useState<RangeData>()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data } = useGet({
    endpoint: "performance/get-noshow-rate",
    param: {rangeType: rangeType},
    querykey: "get-noshow-rate-data",
  });


  useEffect(()=>{
    if (data) {
      console.log('get-noshow-rate', data)
      setRangeResult(data);
    }
  },[data])

  // Data mapping based on time range
  const dataByTimeRange: { [key: string]: number[] } = {
    'Last 7 days': [5, 95],
    'Last 30 days': [10, 90],
    'Last 60 months': [600, 5400],
    'Last 12 months': [120, 880],
  };

  // Prepare data for the Pie chart
  const noShowData = {
    labels: rangeResult?.show_type ?? [],
    datasets: [
      {
        data: rangeResult?.show_count ?? 0, // Dynamic data
        backgroundColor: ['#FF6384', '#36A2EB'],
        hoverOffset: 4,
      },
    ],
  };

  // Chart options
  // const pieOptions = {
  //   responsive: true,
  //   plugins: {
  //     legend: {
  //       position: 'top' as const,
  //     },
  //     tooltip: {
  //       callbacks: {
  //         label: function (tooltipItem: any) {
  //           return `${tooltipItem.label}: ${tooltipItem.raw}`;
  //         },
  //       },
  //     },
  //   },
  // };

  const pieOptions = {
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
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            return `${tooltipItem.label}: ${tooltipItem.raw}`;
          },
        },
      },
    },
    layout: {
      padding: {
        top: 20, // Add padding at the top for spacing
      },
    },
  };
  
  

  // Handle dropdown change
  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setRangeType(event.target.value as string);
  };

  const handleGeneratePDF = async () => {
    if (!rangeResult?.show_type || !rangeResult?.show_count) {
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const blob = await pdf(
        <NoShowRatePDFTemplate
          showTypes={rangeResult.show_type}
          showCounts={rangeResult.show_count}
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
      link.download = `no-show-rate-${periodLabel}-${dateStr}.pdf`;
      
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
        title="No-Show Rate"
        action={
          <Box display="flex" gap={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={isGeneratingPDF ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF || !rangeResult?.show_type || rangeResult.show_type.length === 0}
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
        <Pie data={noShowData} options={pieOptions} />
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', marginTop: 2 }}>
          A breakdown of appointments where patients didn't show up {rangeType}.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default NoShowRateChart;
