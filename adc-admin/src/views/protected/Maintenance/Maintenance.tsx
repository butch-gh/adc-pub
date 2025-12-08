import React from "react";
import "./Maintenance.css";
import { StyledEngineProvider } from '@mui/material/styles';
import { Box, Typography, Paper, List, ListItem } from '@mui/material';
import SidebarFormTabs from "./tabs/SidebarFormTabs";
import { ErrorBoundary } from "react-error-boundary";


const Maintenance: React.FC = () => {
  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
      <Box gap={1}>         
        <Box>
            <SidebarFormTabs></SidebarFormTabs>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default Maintenance;

