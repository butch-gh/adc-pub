import React, { useEffect, useState } from "react";
import { Typography, Box, Tabs, Tab, Button, CircularProgress } from "@mui/material";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BookingTrendChart from "./BookingTrendChart";
import BookingTrendPDFTemplate from "./BookingTrendPDFTemplate";
import useGet from "services/hooks/useGet";
import { ErrorBoundary } from "react-error-boundary";
import ErrorAlert from "components/Dialog/ErrorAlert";
import { pdf } from '@react-pdf/renderer';

type ChartOptions = {    
    months : string[];
    bookings : number[];
}

interface RangeData {
  range : Array<string>;
  bookings : Array<number>;
}

const AppointmentCharts: React.FC = () => {

  const [selectedTab, setSelectedTab] = useState(0);
  const [chartOptions, setChartOptions] = useState<ChartOptions>();  
  const [rangeData, setRangeData] = useState<RangeData>();
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleError = (error: any) => {  
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };

  const handleCloseAlert = () => {
  setErrorAlertOpen(false);
  };

  const { data } = useGet({
    endpoint: "dashboard/getbooking",
    param: {num : selectedTab},
    querykey: "get-booking-data",
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
      const bookings_month = JSON.parse(rangeData.bookings?.toString() ?? '[]');      
      setChartOptions({months: range_month, bookings: bookings_month});      
    }    
  }, [rangeData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleGeneratePDF = async () => {
    if (!chartOptions?.months || !chartOptions?.bookings) {
      setErrorAlertMessage("No data available to generate PDF");
      setErrorAlertOpen(true);
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const blob = await pdf(
        <BookingTrendPDFTemplate
          months={chartOptions.months}
          bookings={chartOptions.bookings}
          selectedTab={selectedTab}
        />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with period and date
      const periodLabels = ['12-months', '6-months', '30-days', '7-days'];
      const periodLabel = periodLabels[selectedTab] || 'custom';
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `booking-trend-${periodLabel}-${dateStr}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setErrorAlertMessage("Failed to generate PDF. Please try again.");
      setErrorAlertOpen(true);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
      <Box padding={3}>
        <Box marginTop={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
              <Typography variant="h6">
                Booking Trend
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={isGeneratingPDF ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF || !chartOptions?.months || chartOptions.months.length === 0}
                sx={{
                  textTransform: 'none',
                  paddingX: 3,
                  paddingY: 1,
                }}
              >
                {isGeneratingPDF ? 'Generating...' : 'Generate PDF Report'}
              </Button>
            </Box>
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
      </Box>
      <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />   
    </ErrorBoundary>
  );
};

export default AppointmentCharts;



