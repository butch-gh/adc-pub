import React, { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "./table";
import "./User.css"
import FormTabs from "./tabs"
import { ErrorBoundary } from "react-error-boundary";

const User: React.FC = () => {

    const [globalID, setGlobalID] = useState<number | null>(null);

    const userID = (id:number) => {
        setGlobalID(id);
    };
  return (
    <ErrorBoundary fallback={<>Something went wrong</>}>
        <Box gap={1}>    
            <Box>            
                <DataTable updateUserID={userID}></DataTable>                         
            </Box>
            <Box>
                <FormTabs userID={globalID}></FormTabs>
            </Box>
        </Box>
    </ErrorBoundary>
    );
};

export default User;