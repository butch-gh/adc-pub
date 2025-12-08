import React from 'react';
import PieChart from './PieChart';
import { Card, Container, Paper, Stack } from '@mui/material';
import AppointmentTypeBarChart from './AppointmentTypeBarChart/AppointmentTypeBarChart';


const OtherCharts: React.FC = () => {

  return (
    <Container sx={{width:'90%'}}>
      <Stack spacing={2} direction={'row'} sx={{ width: '100%' }}>      
        <PieChart/>
        <AppointmentTypeBarChart />
      </Stack>
    </Container>
  );
};

export default OtherCharts;
