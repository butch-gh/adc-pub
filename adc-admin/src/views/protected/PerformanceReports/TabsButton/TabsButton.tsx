import React, { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ScheduleIcon from '@mui/icons-material/Timeline';
import PersonPinIcon from '@mui/icons-material/Person2';
import { Box, Paper, Stack } from '@mui/material';
import AppointmentCharts from '../AppointmentCharts';
import NoShowRatePieChart from '../OtherCharts';
import OtherCharts from '../OtherCharts/OtherCharts';
import PatientsGraphChart from '../PatientsGraphChart';
import OtherPatientCharts from '../OtherPatientCharts';
// import BasicInfoTab from '../table/components/BasicInfo';
// import AppointmentTab from '../table/components/Appointment';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{backgroundColor: 'transparent'}}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}


export default function TabsButton() {

  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper sx={{ padding: 2, backgroundColor:'transparent', border: 'none' }} elevation={0}>
      <Box sx={{ borderBottom: 0, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="tabs"
          indicatorColor="primary"
          textColor="inherit"
          centered          
        >
          <Tab
            icon={<ScheduleIcon />}
            iconPosition="start"
            label="Appointment Reports"
            {...a11yProps(0)}
            sx={{
              borderRadius: 2,
              marginX: 2,
              padding: '12px 24px',
              minWidth: 220,
              textTransform: 'none',
              fontSize: '24px',
              backgroundColor: value === 0 ? 'primary.main' : 'transparent',
              color: value === 0 ? 'white' : 'text.primary',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
            }}
          />
          <Tab
            icon={<PersonPinIcon />}
            iconPosition="start"
            label="Patients Reports"
            {...a11yProps(1)}
            sx={{
              borderRadius: 2,
              marginX: 2,
              padding: '12px 24px',
              minWidth: 220,
              textTransform: 'none',
              fontSize: '24px',
              backgroundColor: value === 1 ? 'primary.main' : 'transparent',
              color: value === 1 ? 'white' : 'text.primary',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
            }}
          />
        </Tabs>
      </Box>
      
        <>
          <CustomTabPanel value={value} index={0}>            
          <AppointmentCharts />
            <OtherCharts />
            
          </CustomTabPanel>

          <CustomTabPanel value={value} index={1}>
          <PatientsGraphChart />
            <OtherPatientCharts />
            
          </CustomTabPanel>
        </>
      
    </Paper>
  );
}
