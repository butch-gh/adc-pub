import React, {useState} from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import HealingIcon from '@mui/icons-material/HealingTwoTone';
import HealthAndSafeTyIcon from '@mui/icons-material/HealthAndSafetyTwoTone';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import BillingIcon from '@mui/icons-material/ListAltTwoTone';
import ScheduleIcon from '@mui/icons-material/ScheduleTwoTone';
import { Box, Paper } from '@mui/material';
import BasicInfoTab from '../table/components/BasicInfo';
import Medical from '../table/components/Medical';
import AppointmentTab from '../table/components/Appointment';
import DentalTab from '../table/components/Dental';
import TreatmentPlansTab from '../table/components/TreatmentPlans';
import DentalRecordTab from '../table/components/DentalRecord';
// import Appointment from '../table/components/CheckboxGroup';
// import DropdownGroup from '../table/components/DropdownGroup';
// import DropDown from '../table/components/Dropdown/DropDown';

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
    <Paper sx={{  }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="Patient Tabs">
        <Tab icon={<PersonPinIcon />} iconPosition="start" label="Profile" {...a11yProps(0)}/>
        <Tab icon={<HealingIcon />} iconPosition="start" label="Medical" {...a11yProps(1)}/>
        <Tab icon={<HealthAndSafeTyIcon />} iconPosition="start" label="Dental" {...a11yProps(2)}/>
        {/* <Tab icon={<PersonPinIcon />} iconPosition="start" label="Prescription" {...a11yProps(3)}/> */}
        <Tab icon={<ScheduleIcon />} iconPosition="start" label="Appointment History" {...a11yProps(3)}/>
        <Tab icon={<BillingIcon />} iconPosition="start" label="Treatment Plans" {...a11yProps(4)}/>
        {/* <Tab icon={<PersonPinIcon />} iconPosition="start" label="Test New Form Controls" {...a11yProps(5)}/> */}
        </Tabs>
      </Box>
      {
        patientID &&
        <>
          <CustomTabPanel value={value} index={0}>        
            <BasicInfoTab Id={patientID}></BasicInfoTab>
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
          <Medical PatientId={patientID}></Medical>
          </CustomTabPanel>
          <CustomTabPanel value={value} index={2}>
            <DentalRecordTab Id={patientID}></DentalRecordTab>
          </CustomTabPanel>
          {/* <CustomTabPanel value={value} index={3}>
            Prescription
          </CustomTabPanel> */}
          <CustomTabPanel value={value} index={3}>
            <AppointmentTab Id={patientID}></AppointmentTab>
          </CustomTabPanel>
          <CustomTabPanel value={value} index={4}>
            <TreatmentPlansTab Id={patientID}></TreatmentPlansTab>
          </CustomTabPanel>
        </>
      }
    </Paper>
  );
}
