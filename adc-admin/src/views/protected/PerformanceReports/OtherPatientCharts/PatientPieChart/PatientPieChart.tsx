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
import { Card, CardHeader, CardContent, Typography, FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import useGet from 'services/hooks/useGet';

// Register necessary components of Chart.js
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale);

type RangeData={
  transaction_type :  string[],
  transac_count : number[]
}

const PatientPieChart: React.FC = () => {
  //const [timeRange, setTimeRange] = useState('Last 7 days');
  const [rangeType, setRangeType] = useState('7DAYS');
  const [rangeResult, setRangeResult] = useState<RangeData>()

  const { data } = useGet({
    endpoint: "performance/get-patients-returning",
    param: {rangeType: rangeType},
    querykey: "get-patients-returning-data",
  });


  useEffect(()=>{
    if (data) {
      console.log('get-patients-returning', data)
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
    labels: rangeResult?.transaction_type ?? [],
    datasets: [
      {
        data: rangeResult?.transac_count ?? 0, // Dynamic data
        backgroundColor: ['#9061f9', '#16bdca'],
        hoverOffset: 4,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const, 
        align: 'start' as const, 
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
        top: 20, 
      },
    },
  };
  
  

  // Handle dropdown change
  const handleTimeRangeChange = (event: SelectChangeEvent<string>) => {
    setRangeType(event.target.value as string);
  };

  return (
    <Card sx={{ flex: 1, width: '100%'}}>
      <CardHeader
        title="Patients"
        action={
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
        }
      />
      <CardContent>
        <Pie data={noShowData} options={pieOptions} />
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', marginTop: 2 }}>
          A breakdown of new and returning patients for the {rangeType}.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default PatientPieChart;
