import React, {useState} from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PhoneIcon from '@mui/icons-material/Phone';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import ScheduleIcon from '@mui/icons-material/ScheduleTwoTone';
import { Box, Paper } from '@mui/material';
// import BasicInfoTab from '../table/components/BasicInfo';
// import Medical from '../table/components/Medical';
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

interface Props {
  patientID : number | null;
}

export default function FormTabs(props : Props) {
  const { patientID } = props;
  const [value, setValue] = useState(0);


  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper sx={{ }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
        <Tab icon={<ScheduleIcon />} iconPosition="start" label="Today's Appointment" {...a11yProps(0)}/>
        <Tab icon={<ScheduleIcon />} iconPosition="start" label="Tomorrow's Appointment" {...a11yProps(1)}/>
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>        
        Today's Appointment
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        Tomorrow's Appointment
      </CustomTabPanel>
    </Paper>
  );
}
