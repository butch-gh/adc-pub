import React, { useEffect, useState, useMemo, memo, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form"
import axios from 'axios';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, Button, Chip, IconButton, TablePagination, TextField, useTheme } from "@mui/material";
import Modal from "../modal";
import useGet from "services/hooks/useGet";
import Loader from "components/loader";
import dayjs from "dayjs";
import { format, formatDistanceToNow } from 'date-fns';
import AppointmentForm from "../forms/AppointmentForm";
import DeleteConfirmationDialog from "components/Dialog/DeleteConfirmationDialog";
import AlertDialog from "components/Dialog/AlertDialog";
import SearchBar from "components/hookFormControls/SearchBar";
import AddIcon from '@mui/icons-material/Add';
import { ErrorBoundary } from "react-error-boundary";
import ErrorAlert from "components/Dialog/ErrorAlert";
import useApiCall from "services/hooks/useApiCall";
import useLogActivity from "services/hooks/useLogActivity";

function getTimeAMPM(timeRange: { startTime: string; endTime: string }): string {

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const convertToAMPM = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const startAMPM = convertToAMPM(timeRange.startTime);
  const endAMPM = convertToAMPM(timeRange.endTime);

  return `${startAMPM} - ${endAMPM}`;
}

interface Item {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
  service: string;
  appointment_date: Date;  
  code: string;
  status: string;
  updated_by: string;
}

interface Props {
  updateAppointmentID : (Id:number)=>void;
}

const DataTable = (props:Props) => {
  let MODULE = 'ADC-ADMIN:AppointmentGuest';
  const {updateAppointmentID} = props;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLabel, setModalLabel] = useState('');    
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');    
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const { apiCall, loading, error, errorCode } = useApiCall();
  const { logActivity} = useLogActivity();

  const formMethods = useForm({
    mode: 'onChange',
    defaultValues: {
      guestFields: {
        firstName : '',
        lastName : '',
        mobileNumber: '',
        serviceId: '',
        appointmentDate: null,
        appointmentTimeSlots: [],
        status: 'pending',
        updatedBy: '',
      },      
      internal:{
        id: 0,
        method:'',
        deleteId: -1,
        isSendSMS: false,
        occupiedSlots: [],
      }                      
    }
  });

 
  const { getValues, watch, setValue, reset } = formMethods;
  
  // Move watch outside of render cycle - only call once
  const sentSMS = watch('internal.isSendSMS');


  const {data, refetch, isFetching, isFetched} = useGet({
    endpoint: 'guest/getall', 
    param: {},
    querykey: 'get-guest-appointment-list',
    onErrorCallback: handleError,
  });   
    
       
  const openModal = (text: string, item?: Item) => {   
    const first = text;
    const method = first.split(" ")[0];
    if(method === 'Add'){
      reset({
        guestFields: {
          firstName : '',
          lastName : '',
          mobileNumber: '',
          serviceId: '',
          appointmentDate: null,
          appointmentTimeSlots: [],
          status: 'pending',
          updatedBy: '',
        },      
        internal:{
          id: 0,
          method:'',
          deleteId: -1,
          isSendSMS: false,
          occupiedSlots: [],
        }
      });                       
    }else if(method === 'Edit' && item){        
      setValue('internal.id',item.id)      
    }
      setValue('internal.method' , method);  
      setModalLabel(text);
      setCurrentItem(item || null);
      setIsModalOpen(true);        
  };
      
  const handleSubmitItem = async () => {
    console.log('Submitting item...');      
    const adate = getValues('guestFields.appointmentDate');
    const appointmentDate = adate ? dayjs(adate).format('YYYY-MM-DD') : '';
    const apiParam = {
      firstName: getValues('guestFields.firstName'),
      lastName: getValues('guestFields.lastName'),
      mobileNumber: getValues('guestFields.mobileNumber'),                
      serviceId: getValues('guestFields.serviceId'),
      appointmentDate: appointmentDate,      
      appointmentTimeSlot: JSON.stringify(getValues('guestFields.appointmentTimeSlots')),
      status: getValues('guestFields.status'),
      updatedBy: getValues('guestFields.updatedBy'),      
    };

    if (currentItem) {
      // Update existing item
      const endpoint = '/guest/update'
      const Id = getValues('internal.id');
      try {                                
        const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id: Id,...apiParam},
        (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);}
      );        
              if (response) {                            
              await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Updated item ID: ${Id}`, endpoint: endpoint })});         
              triggerAlert('success', 'Successfully updated!');
              
              if (sentSMS) {              
                const timeRange = getTimeAMPM(JSON.parse(apiParam.appointmentTimeSlot));            
                const sched = format(new Date(apiParam.appointmentDate), 'EEE, d MMMM yyyy') +' ' + ' - ' + timeRange;        
                let spiel = '';
              
                if (apiParam.status === 'confirmed') {
                  spiel = `Your appointment has been created. Please arrive at our clinic on or before your scheduled time at ${sched}. Thank you.`
                }else if (apiParam.status === 'cancelled') {
                  spiel = `We regret to inform you that your appointment scheduled for ${sched} has been canceled due to conflict of time. Please contact our clinic to reschedule at your earliest convenience. We apologize for any inconvenience caused. Thank you.`; 
                }
              
                const mobileNo = apiParam.mobileNumber;
                const guestName = `${apiParam.firstName} ${apiParam.lastName}`;
                const apiSMSParam = {
                  to: "63" + mobileNo,          
                  message: `Good day, ${guestName}. ${spiel}`
                };
              
                if (spiel) {              
                  const smsresponse = await apiCall(`${import.meta.env.VITE_API_URL}/appointment/sms/send`, {...apiSMSParam});              
                  if (smsresponse) {              
                    await logActivity({action: 'Send', module: 'ADC-ADMIN:SMS', details: JSON.stringify({ status: 'success', detail: `Send SMS to: ${mobileNo}`, endpoint: endpoint })});         
                  } else {
                    await logActivity({action: 'Send', module: 'ADC-ADMIN:SMS', details: JSON.stringify({ status: 'failed', detail: `Send SMS to: ${mobileNo}`, endpoint: endpoint })});         
                  }    
                }   
              }
                          
              refetch();
            }
      } catch (error) {
        await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
      }
    } else {
    // Add new item
      const endpoint = '/guest/insert'          
      try {           
         const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {...apiParam},
        (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);});         
         
              if (response) {                
                const guestName = `${apiParam.firstName} ${apiParam.lastName}`;
                await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Add guest appointment for: ${guestName}`, endpoint: endpoint })});          
                triggerAlert('success', 'Successfully added!');
                
                if (sentSMS) {
                  const timeRange = getTimeAMPM(JSON.parse(apiParam.appointmentTimeSlot));
                  const sched = format(new Date(apiParam.appointmentDate), 'EEE, d MMMM yyyy') +' ' + ' - ' + timeRange;        
                  let spiel = `Your request has been confirmed. Please arrive at our clinic on or before your scheduled time at ${sched}. Thank you.`
                  
                  const mobileNo = apiParam.mobileNumber;
                  const apiSMSParam = {
                    to: "63" + mobileNo,          
                    message: `Good day, ${guestName}. ${spiel}`
                  };
                  
                  const smsresponse = await apiCall(`${import.meta.env.VITE_API_URL}/appointment/sms/send`, {...apiSMSParam});                  
                    if (smsresponse) {                    
                    await logActivity({action: 'Send', module: 'ADC-ADMIN:SMS', details: JSON.stringify({ status: 'success', detail: `Send SMS to: ${mobileNo}`, endpoint: endpoint })});         
                    } else {
                    await logActivity({action: 'Send', module: 'ADC-ADMIN:SMS', details: JSON.stringify({ status: 'failed', detail: `Send SMS to: ${mobileNo}`, endpoint: endpoint })});         
                    }                                  
                }
                refetch();
                
              }       
      } catch (error) {
          await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
      }
    }        
    setIsModalOpen(false);
    // Ensure refetch happens after modal closes
    setTimeout(() => refetch(), 100);
  };
    
  const handleConfirmDelete = async () => {
    let endpoint = '/guest/delete'
    let deleteId = getValues('internal.deleteId');
    try {          
      const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id : deleteId},
      (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);});
      
      if (response) {
        if (response.errorCode === '00000') {
          await logActivity({action: 'Delete', 
            module: MODULE, 
            details: JSON.stringify({ status: 'success', detail: `deleted item ID: ${deleteId}`, endpoint: endpoint})});
            triggerAlert('success', 'Successfully deleted!');
            refetch();
        }
        else if (response.errorCode === '23503') {          
          await logActivity({action: 'Delete', 
            module: MODULE, 
            details: JSON.stringify({ status: 'failed', detail: 'ResponseCode: ' + response.errorCode + `- trying to delete item ID: ${deleteId} that is already in use.`, endpoint: endpoint })});                            
            triggerAlert('error', 'Unable to delete, item is already in use!');
            setIsAlertOpen(true);
        }  
      }

    } catch (error) {
      await logActivity({action: 'Delete', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
    }

    setIsDialogOpen(false);
    // Ensure refetch happens after dialog closes
    setTimeout(() => refetch(), 100);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);    
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle Search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value.toLowerCase());    
  };

  // Memoize filtered data to prevent constant recalculation and re-renders
  const filteredData = useMemo(() => {
    if (!data) return [];
    
    return data.filter((row: any) =>
      (row.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.mobile_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.service || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      dayjs(row.appointment_date).format('YYYY-MM-DD').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

      // Memoize empty rows calculation to prevent unnecessary re-renders
      const emptyDataRows = useMemo(() => {
        return page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredData.length) : 0;
      }, [page, rowsPerPage, filteredData.length]);
      
        const visibleDataRows = React.useMemo(
          () =>
            
            [...filteredData || []]
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
          [page, rowsPerPage, filteredData]

        );

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected;    
    updateAppointmentID(id);
  };

  // Memoize getStatusColor function to prevent recreation on every render
  const getStatusColor = useMemo(() => {
    return (status: string) => {
      switch (status.toLowerCase()) {
        case 'confirmed':
          return 'info'; // blue
        case 'canceled':
        case 'cancelled':
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
    };
  }, []);

  // Memoize callback functions to prevent recreation on every render
  const handleAddAppointment = useCallback(() => openModal('Add Guest Appointment'), [reset]);
  
  // Create stable callback factories
  const createEditHandler = useCallback((row: any) => () => openModal('Edit Guest Appointment', row), [setValue]);
  
  const createDeleteHandler = useCallback((id: number) => () => handleOpenDialog(id), [setValue]);

  const handleModalClose = useCallback(() => setIsModalOpen(false), []);
  

  // Compute if the modal submit should be disabled (for past appointments in edit mode)
  const isSubmitDisabled = useMemo(() => {
    if (!currentItem) return false; // Not in edit mode
    const appointmentDate = dayjs(currentItem.appointment_date);
    return appointmentDate.isBefore(dayjs(), 'day');
  }, [currentItem]);

  // Trigger popup explicitly
  const triggerAlert = (newSeverity: 'error' | 'warning' | 'info' | 'success', newMessage: string) => {
    setAlertSeverity(newSeverity);
    setAlertMessage(newMessage);
    setIsAlertOpen(true);
  };

    const handleCloseAlertDialog = () => {
      setIsAlertOpen(false);
    };

  const handleOpenDialog = (Id: number) => {
    setValue('internal.deleteId', Id)
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };


  // useEffect(() => {
  //     console.log('Fetching state changed:', isFetching);
  // }, [isFetching]);

  
  return (
    <>    
    <ErrorBoundary fallback={<>Something went wrong</>}>
      <FormProvider {...formMethods}>
        <Paper sx={{ mb: 2, p: 2, backgroundColor: theme.palette.background.paper }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Button variant="contained" startIcon={<AddIcon/>} onClick={handleAddAppointment}>Add Guest Appointment</Button>
          <SearchBar onSearch={handleSearch} />
          </Box>
          {
            (!data && isFetching) ? <Loader /> :
          <>
          
          <TableContainer component={Paper} >
            <Table sx={{ minWidth: 800 }} aria-label="simple table" size="small">
              <TableHead>
              <TableRow>
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">First Name</TableCell>
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Last Name</TableCell>
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Mobile Number</TableCell>
                  {/* <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Service</TableCell>                   */}
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Appointment Date</TableCell>
                  {/* <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Appointment Time Slot</TableCell> */}
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Approved By</TableCell>
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Status</TableCell>
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="left">Date Submitted</TableCell>
                  <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }} align="right">Action</TableCell>            
              </TableRow>
              </TableHead>
              <TableBody>
                {
                  
                  visibleDataRows.map((row: any, index : number) => {
                    return(
                    <TableRow
                    key={`${index}`}                  
                    hover
                    onClick={(event) => handleClick(event, row.id)}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>                  
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.first_name}</TableCell>
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.last_name}</TableCell>
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.mobile_number}</TableCell>
                    {/* <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.service_id}</TableCell>                     */}
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{dayjs(row.appointment_date).format('YYYY-MM-DD')}</TableCell>
                    {/* <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.appointment_time_slot}</TableCell>                     */}
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.updated_by}</TableCell>
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">
                      <Chip
                        label={row.status}
                        color={getStatusColor(row.status)}
                        variant="outlined"
                        sx={{
                          textTransform: 'capitalize',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{dayjs(row.date_submitted).format('YYYY-MM-DD')}</TableCell>
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="right">                  

                    <Box display={'flex'} justifyContent={'right'} alignItems={'right'} gap={2}>
                        <IconButton color="inherit" edge="start" onClick={createEditHandler(row)} >
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 0 24 24" width="32px" fill={'#0fb491'}> 
                        <path d="M0 0h24v24H0V0z" fill="none"/>
                        <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                        </svg>                      
                        </IconButton>

                        <IconButton color="inherit" edge="start" onClick={createDeleteHandler(row.id)} >                                            
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill={'#0fb491'}>
                        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                        </svg>
                        </IconButton>
                      </Box>
                    </TableCell>              
                    </TableRow>                
                    )
                  })
                  
                }
                {emptyDataRows > 0 && (
                  <TableRow
                    style={{
                      height: (33) * emptyDataRows,
                    }}
                  >
                    <TableCell colSpan={9} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
            <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredData?.length || 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          </>
        }
          
          <Modal 
            isOpen={isModalOpen} 
            onClose={handleModalClose} 
            labelType={modalLabel}        
            onSubmit={handleSubmitItem}
            isSubmitDisabled={isSubmitDisabled}>
              <Box>            
                  <AppointmentForm></AppointmentForm>
              </Box>
          </Modal>
        </Paper>        
      </FormProvider>        

      <AlertDialog          
        open={isAlertOpen}
        message={alertMessage}
        severity={alertSeverity}
        position="center-top"        
        duration={6000}
        onClose={handleCloseAlertDialog}
      />


    <DeleteConfirmationDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
      />      
      </ErrorBoundary>    

      <ErrorAlert
        open={errorAlertOpen}
        message={errorAlertMessage}
        onClose={handleCloseAlert}
        />
    </>
  );
}

export default memo(DataTable);
