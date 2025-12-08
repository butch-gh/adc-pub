import React, { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "./table";
import "./Patient.css"
import FormTabs from "./tabs";
import { ErrorBoundary } from "react-error-boundary";

const Patient: React.FC = () => {
    // Step 1: Create a state to hold the global ID
    const [globalID, setGlobalID] = useState<number | null>(null);

    // Step 2: Define a function to update the ID
    const patientID = (id:number) => {
        setGlobalID(id);
    };
  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
        <Box gap={1}>    
            <Box>            
                <DataTable updatePatientID={patientID}></DataTable>                         
            </Box>
            <Box>
                <FormTabs patientID={globalID}></FormTabs>
            </Box>
        </Box>
    </ErrorBoundary>
    );
};

export default Patient;