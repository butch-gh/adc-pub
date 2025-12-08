import React, { useEffect, useState } from "react";
import { Typography, Box, Tabs, Tab} from "@mui/material";

import useGet from "services/hooks/useGet";
import { ErrorBoundary } from "react-error-boundary";
import PatientsGraph from "./PatientsGraph/PatientsGraph";
import ErrorAlert from "components/Dialog/ErrorAlert";

type ChartOptions = {    
    months : string[];
    entries : number[];
}

interface RangeData {
  range : Array<string>;
  patients : Array<number>;
}

const PatientsGraphChart: React.FC = () => {

  const [selectedTab, setSelectedTab] = useState(0);
  const [chartOptions, setChartOptions] = useState<ChartOptions>();  
  const [rangeData, setRangeData] = useState<RangeData>();
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");

  const handleError = (error: any) => {  
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };

  const handleCloseAlert = () => {
  setErrorAlertOpen(false);
  };

  const { data } = useGet({
    endpoint: "performance/get-patients",
    param: {num : selectedTab},
    querykey: "get-patients-data",
    onErrorCallback: handleError,
  });

  useEffect(() => {
    if (data) {
      setRangeData(data);
      //console.log("data", data);
    }
  }, [data]);

  useEffect(() => {
    if (rangeData) {      
      const range_month = JSON.parse(rangeData.range?.toString() ?? '[]'); 
      const entries_month = JSON.parse(rangeData.patients?.toString() ?? '[]');      
      setChartOptions({months: range_month, entries: entries_month});      
    }    
  }, [rangeData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
      <Box padding={3}>
        <Box marginTop={4}>
            <Typography variant="h6" gutterBottom>
                Patients
            </Typography>
            <Tabs value={selectedTab} onChange={handleTabChange}>
            <Tab label="12 Months" />
            <Tab label="6 Months" />
            <Tab label="30 Days" />
            <Tab label="7 Days" />
            </Tabs>
            <Box marginTop={2}>
                <PatientsGraph months={chartOptions?.months} entries={chartOptions?.entries} />
            </Box>
        </Box>
      </Box>
      <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />       
    </ErrorBoundary>
  );
};

export default PatientsGraphChart;



