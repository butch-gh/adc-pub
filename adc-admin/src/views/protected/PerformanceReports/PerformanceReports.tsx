import React, { useEffect, useState } from "react";
import { Typography, Box} from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import AppointmentCharts from "./AppointmentCharts";
import TabsButton from "./TabsButton";

const PerformanceReports: React.FC = () => {

  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
      <Box padding={3}>
        <Typography variant="h5" gutterBottom>
          Performance Reports
        </Typography>

        <TabsButton />

      </Box>
    </ErrorBoundary>
  );
};

export default PerformanceReports;



