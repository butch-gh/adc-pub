import React, { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "./table";
import "./Dentist.css"
import FormTabs from "./tabs"
import { ErrorBoundary } from "react-error-boundary";

const Dentist: React.FC = () => {

    const [globalID, setGlobalID] = useState<number | null>(null);

    const dentistID = (id:number) => {
        setGlobalID(id);
    };
  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
        <Box gap={1}>    
            <Box>            
                <DataTable updateDentistID={dentistID}></DataTable>                         
            </Box>
            <Box>
                <FormTabs dentistID={globalID}></FormTabs>
            </Box>
        </Box>
    </ErrorBoundary>
    );
};

export default Dentist;