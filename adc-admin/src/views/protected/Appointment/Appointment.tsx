import React, { useState, useCallback, useEffect } from "react";
import { Box } from "@mui/material";
import DataTable from "./table";
import "./Appointment.css"
import FormTabs from "./tabs";
import { ErrorBoundary } from "react-error-boundary";
import { use } from "echarts";

const Appointment: React.FC = () => {

    const [globalID, setGlobalID] = useState<number | null>(null);

    const AppointmentID = useCallback((id:number) => {    
        setGlobalID(id);
    }, []);
    
    return (
    // <ErrorBoundary fallback={<>Something went wrong</>}>
        <Box gap={1}>    
            <Box>            
                <DataTable updateAppointmentID={AppointmentID}></DataTable>                         
            </Box>
            {/* <Box>
                <FormTabs patientID={globalID}></FormTabs>
            </Box> */}
        </Box>
    // </ErrorBoundary>
    );
};

export default Appointment;