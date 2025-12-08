import React, { useState } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import AccessibilityIcon from "@mui/icons-material/Accessibility";
import PaymentIcon from "@mui/icons-material/Payment";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import WorkIcon from "@mui/icons-material/Work";
import { Box, Paper } from "@mui/material";
import AccessPrivilege from "../components/AccessPrivilege";
import Job from "../components/Job";
import PaymentMethod from "../components/PaymentMethod";
import Treatment from "../components/Treatment";

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
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}


export default function SidebarFormTabs() {  
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper
      sx={{
        display: "flex",
        height: "100vh",
        border: 1,
        borderColor: "divider",
      }}
    >
      <Tabs
        orientation="vertical"
        value={value}
        onChange={handleChange}
        aria-label="Sidebar Tabs"
        sx={{
          borderRight: 1,
          borderColor: "divider",
          minWidth: "200px",          
        }}
      >
        <Tab
          icon={<AccessibilityIcon />}
          iconPosition="start"
          label="Access Privilege"
          sx={{justifyContent:'left'}}
          {...a11yProps(0)}
        />
        <Tab
          icon={<WorkIcon />}
          iconPosition="start"
          label="Job"
          sx={{justifyContent:'left'}}
          {...a11yProps(1)}
        />
        {/* <Tab
          icon={<PaymentIcon />}
          iconPosition="start"
          label="Payment Method"
          sx={{justifyContent:'left'}}
          {...a11yProps(2)}
        /> */}
        {/* <Tab
          icon={<HealthAndSafetyIcon />}
          iconPosition="start"
          label="Treatment"
          sx={{justifyContent:'left'}}
          {...a11yProps(2)}
        /> */}
      </Tabs>      
        <Box sx={{ flexGrow: 1 }}>
          <CustomTabPanel value={value} index={0}>            
            <AccessPrivilege></AccessPrivilege>
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            <Job></Job>
          </CustomTabPanel>
          {/* <CustomTabPanel value={value} index={2}>
            <PaymentMethod></PaymentMethod>
          </CustomTabPanel> */}
          {/* <CustomTabPanel value={value} index={2}>
            <Treatment></Treatment>
          </CustomTabPanel> */}
        </Box>      
    </Paper>
  );
}
