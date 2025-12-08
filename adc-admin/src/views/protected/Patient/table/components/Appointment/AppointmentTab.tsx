import { useForm, FormProvider } from "react-hook-form"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {useFormContext } from 'react-hook-form';
import useGet from 'services/hooks/useGet';
import Loader from 'components/loader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, Button, Chip, TablePagination, useTheme } from "@mui/material";
import ErrorAlert from "components/Dialog/ErrorAlert";
// import AppointmentTab from ".";

const apiCall = async (endpoint: string, param: any) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(endpoint, param, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

interface Item {
  id: number;
  dentist: string;
  treatment: number;
  date_submitted: Date;
  appointment_date: Date;
  time: String; 
  status: string;
}

interface Props {
  Id: number | null;
}

const AppointmentTab: React.FC<Props> = ({Id}) => {

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<number | null>(null);
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
  const theme = useTheme();

  //console.log(Id);

  const {data, isFetching } = useGet({
    endpoint: 'appointment/getAllRecord', 
    param: {id : Id},
    querykey:'get-userappointment-list',
    onErrorCallback: handleError,
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    //.log('newPage',newPage)        
    setPage(newPage);
    
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
      
  const emptyDataRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - data.length) : 0;
    
  const visibleDataRows = React.useMemo(
    () =>
      
      [...data || []]
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
      [page, rowsPerPage, data]
  );

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    setSelected(id);
    console.log("Selected appointment ID:", id); // Debugging log
  };

  // const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
  //   const selectedIndex = selected;

  //   //console.log('newSelected', id)    
  //   Props(id);
  // };

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'info'; // blue
      case 'canceled':
        return 'default'; // Gray
      case 'pending':
        return 'warning'; // Orange
      case 'missed':
        return 'error'; // Red
      case 'treated':
        return 'success'; // Green
      default:
        return 'default'; // Fallback color, Gray
    }
  }


  return (
    <>
      <Paper sx={{ width: "100%", mb: 2 }}>
        {
        (!data && isFetching) ? (
          <Loader />
        ) : (
          <>
            <TableContainer component={Paper} sx={{ margin: 1 }}>
              <Table sx={{ minWidth: 800 }} aria-label="simple table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Treatment</TableCell>
                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Appointment Date</TableCell>
                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Time</TableCell>
                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Status</TableCell>
                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Dentist</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleDataRows.length > 0 ? (
                    visibleDataRows.map((row: Item, index: number) => (
                      <TableRow
                        key={`appointment-${row.id}-${index}`}
                        hover
                        onClick={(event) => handleClick(event, row.id)}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.treatment}</TableCell>                    
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{dayjs(row.appointment_date).format('YYYY-MM-DD')}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.time}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">
                          <Chip
                            label={row.status}
                            color={getStatusColor(row.status)}
                            variant="outlined"
                            sx={{
                              textTransform: "capitalize",
                              fontWeight: "bold",
                              borderRadius: "8px",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.dentist}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No appointments found.
                      </TableCell>
                    </TableRow>
                  )}
                  {emptyDataRows > 0 && (
                    <TableRow
                      style={{
                        height: 33 * emptyDataRows,
                      }}
                    >
                      <TableCell colSpan={8} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={data?.length || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>

      <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />       
    </>
  );
};

export default AppointmentTab;
