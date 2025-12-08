import { Box, Divider, Stack, Typography } from '@mui/material'
import React, { Fragment, useState } from 'react'
import DataTable from '../../table'
import Loader from 'components/loader'
import useGet from 'services/hooks/useGet';
import ErrorAlert from 'components/Dialog/ErrorAlert';


function endpointData(
  item: string,
  endpoint: string  
) {
  return { item, endpoint};
}

const endpoint = [
  endpointData('Access Privilege', 'role/get'),
  endpointData('Job', 'job/get'),
  endpointData('Payment Method', 'paymentMethod/get'),
  endpointData('Specialties', 'specialty/get'),    
  endpointData('Treatments', 'treatment/getall'),
];

const Treatment = () => {
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

  const {data, refetch, isFetching} = useGet({
    endpoint: 'treatment/getall', 
    param: {},
    querykey: 'get-treatment-list',
    onErrorCallback: handleError,
});

  return (
    <Fragment>
      <Stack gap={3}>
      <Typography variant='h5'>Treatment</Typography>
      <Divider/>
        <Box>
            { isFetching ? <Loader/> :
            <DataTable data={data} item={'Treatments'} refetch={refetch}></DataTable>
            }
        </Box>
      </Stack>
        <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />        
    </Fragment>
    
  )
}

export default Treatment