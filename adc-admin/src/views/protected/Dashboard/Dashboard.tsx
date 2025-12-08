import React, { useEffect, useState } from "react";
import { Typography, Box, Tabs, Tab} from "@mui/material";
import { useAuth } from '@repo/auth';
import BookingTrendChart from "./BookingTrendChart";
import StatsCard from "./StatsCard";
import AppointmentCard from "./AppointmentCard";
import useGet from "services/hooks/useGet";
import { ErrorBoundary } from "react-error-boundary";
import ErrorAlert from "components/Dialog/ErrorAlert";

type ChartOptions = {    
    months : string[];
    bookings : number[];
}

interface RangeData {
  range : Array<string>;
  bookings : Array<number>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);
  const [chartOptions, setChartOptions] = useState<ChartOptions>();  
  const [rangeData, setRangeData] = useState<RangeData>();
  const [userFullName, setUserFullName] = useState('');
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

  const {data:  userData} = useGet({
    endpoint: 'user/getinfo', 
    param: {},
    querykey: 'get-user-info',
    onErrorCallback: handleError,
  });

  const { data } = useGet({
    endpoint: "dashboard/getbooking",
    param: {num : selectedTab},
    querykey: "get-booking-data",
    onErrorCallback: handleError,
  });

  useEffect(() => {
    if (userData) {
      setUserFullName(userData.first_name)      
    }
  }, [userData]);

  useEffect(() => {
    if (data) {
      setRangeData(data);
      //console.log("data", data);
    }
  }, [data]);

  useEffect(() => {
    if (rangeData) {
      //console.log('rangeData', rangeData)
      
      const range_month = JSON.parse(rangeData.range?.toString() ?? '[]'); 
      const bookings_month = JSON.parse(rangeData.bookings?.toString() ?? '[]');
      
      setChartOptions({months: range_month, bookings: bookings_month});
      
      // Use the user from useAuth instead of decoding token manually
      if (user) {
        // The username can be used directly from the auth context
        // If you need userFullName, you can get it from userData
      }
    }
    
  }, [rangeData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
      <Box padding={3}>
        <Typography variant="h5" gutterBottom>
          Hey <b>{userFullName}</b> - here's what's happening with your clinic today
        </Typography>

        {/* Stats Section */}
        <StatsCard />

        {/* Booking Trend Section */}
        <Box marginTop={4}>
        <Typography variant="h6" gutterBottom>
          Booking Trend
        </Typography>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label="12 Months" />
          <Tab label="6 Months" />
          <Tab label="30 Days" />
          <Tab label="7 Days" />
        </Tabs>
        <Box marginTop={2}>
        <BookingTrendChart months={chartOptions?.months} bookings={chartOptions?.bookings} />
        </Box>
      </Box>

        {/* Appointments Section */}      
          <AppointmentCard />
      </Box>
      <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />  
    </ErrorBoundary>

  );
};

export default Dashboard;



