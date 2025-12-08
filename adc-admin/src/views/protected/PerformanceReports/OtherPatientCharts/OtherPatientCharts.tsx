import React from 'react';
import { Card, Container, Paper, Stack } from '@mui/material';
import PatientPieChart from './PatientPieChart';
import PatientByGenderPieChart from './PatientByGenderPieChart';


const OtherPatientCharts: React.FC = () => {

  return (
    <Container sx={{width:'90%'}}>
    <Stack spacing={2} direction={'row'} sx={{ width: '100%', display:'flex' }}>              
      <PatientPieChart/>      
      <PatientByGenderPieChart />
    </Stack>
    </Container>
  );
};

export default OtherPatientCharts;
