import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form"
import axios from 'axios';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, Button, IconButton, TablePagination, useTheme } from "@mui/material";
import Modal from "../Dental/modal";
import useGet from "services/hooks/useGet";
import Loader from "components/loader";
// import BasicInfoForm from "../forms/BasicInfo";
import dayjs from "dayjs";
import useApiCall from "services/hooks/useApiCall";
import DentalForm from "views/protected/Patient/forms/Dental";
import DeleteConfirmationDialog from "components/Dialog/DeleteConfirmationDialog";
import AlertDialog from "components/Dialog/AlertDialog";
import SearchBar from "components/hookFormControls/SearchBar";
import AddIcon from '@mui/icons-material/Add';
import ErrorAlert from "components/Dialog/ErrorAlert";
import useLogActivity from "services/hooks/useLogActivity";

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
  id: Number;
  tooth: Number; 
  treatment: Number; 
  date: Date;
  }

interface Props {
  Id?: number | null;
}

// interface Props {
//   updateUserID : (Id:number)=>void;
// }

const DentalTab: React.FC<Props> = ({Id}) => {
    // const {updateUserID} = props;
    let MODULE = 'ADC-ADMIN:Patient-Dental';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLabel, setModalLabel] = useState('');    
    const [currentItem, setCurrentItem] = useState<Item | null>(null);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

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

    //const [selected, setSelected] = React.useState<number | null>(null);
    //console.log('patientId', Id)
      const formMethods = useForm({
      mode: 'onChange',
      defaultValues: {
          dentalRecord: {
              patientId: Id,
              toothId: '',
              treatmentId: '',                      
          },        
          internal:{
            id: null,
            method:'',
            deleteId: -1            
          }                      
      }
  });

 
  const { getValues, watch, setValue, reset } = formMethods;

  const { apiCall, loading, error } = useApiCall();
  const { logActivity} = useLogActivity();

    const {data, refetch, isFetching, isFetched, isLoading} = useGet({
      endpoint: 'dental/getlist', 
      param: {id : Id},
      querykey: 'get-dental-list',
      onErrorCallback: handleError,
    });   
    
    console.log('patientId', Id);
       
    const openModal = (text: string, item?: Item) => {   
      const first = text;
      const method = first.split(" ")[0];
      if(method === 'Add'){
        reset();                       
      }else if(method === 'Edit' && item){        
        setValue('internal.id',(item.id as unknown as null))        
      }
        setValue('internal.method' , method);  
        setModalLabel(text);
        setCurrentItem(item || null);
        setIsModalOpen(true);        
    };
      
    const handleSubmitItem = async () => {
      
      const apiParam = {
        patientId: Id,
        toothId: getValues('dentalRecord.toothId'),
        treatmentId: getValues('dentalRecord.treatmentId'),                  
      };
      const _Id = Id;
        if (currentItem) {
          // Update existing item
          const endpoint = '/dental/update'
          
          try {                        
            const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id: currentItem.id,...apiParam});
            console.log('edit-response', response)
            if (response) {              
              await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Updated DentalID: ${response[0]} , with PatientID: ${_Id}`, endpoint: endpoint })});         
              triggerAlert('success', 'Successfully updated!');
              refetch();         
            }
          } catch (error) {
            console.error("Error updating item:", error);
            await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
          }
        } else {
        // Add new item          
        const endpoint = '/dental/add'
            try {
              //console.log('apiParam', apiParam)                         
              const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {...apiParam});         
              console.log('add-response', response)
              if (response) {
                await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Added DentalID: ${response[0]} , with PatientID: ${_Id}`, endpoint: endpoint })});                                              
                triggerAlert('success', 'Successfully added!');
                refetch();         
              }             
            } catch (error) {
                console.error("Error adding item:", error);
                await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
            }
        }        
        setIsModalOpen(false);
      };
    

      const handleConfirmDelete = async () => {
        let endpoint = '/dental/delete'
        let deleteId = getValues('internal.deleteId');  
        try {          
          const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id : deleteId});
          console.log('delete-response', response)
          //refetch();          

          if (response) {
            //console.log("Error deleting item:", errorCode);
            //handle foreign key violation with StatusCode 201
            if (response.errorCode === '00000') {
              console.log("Successfully deleting item:", response.errorCode);
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
          console.error("Error deleting item:", error);
          await logActivity({action: 'Delete', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
        }
        setIsDialogOpen(false);
      };

      const handleChangePage = (event: unknown, newPage: number) => {
        //console.log('newPage',newPage)        
        setPage(newPage);
        
      };

      const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      };
      

      const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value.toLowerCase());
      };

      useEffect(()=>{
        if (data) {
          console.log('dental-data', data)
        }
      },[data])

// date
// tooth_number
// quadrant
// quadrant_name
// tooth_type
// procedure
      const filteredData = data?.filter((row: any) =>
        dayjs(row.date).format('YYYY-MM-DD').toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.tooth_number.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.quadrant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.tooth_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.procedure.toLowerCase().includes(searchQuery.toLowerCase())
        
      );

      const emptyDataRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredData.length) : 0;
      
      const visibleDataRows = React.useMemo(
        () =>
          
          [...filteredData || []]
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [page, rowsPerPage, filteredData]

      );

      // const emptyDataRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - data.length) : 0;
      
      //   const visibleDataRows = React.useMemo(
      //     () =>
            
      //       [...data || []]
      //         .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
      //     [page, rowsPerPage, data]

      //   );

      // Trigger popup explicitly
      const triggerAlert = (newSeverity: 'error' | 'warning' | 'info' | 'success', newMessage: string) => {
        setAlertSeverity(newSeverity);
        setAlertMessage(newMessage);
        setIsAlertOpen(true);
  
        // Ensure consistent visibility, even if `refetch` triggers a re-render
        //setTimeout(() => setIsAlertOpen(false), 6000);
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



  return (
    <>     
        <FormProvider {...formMethods}>
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>            
            <Button variant="contained" startIcon={<AddIcon/>} onClick={() => openModal('Add New Dental Record')}>Add Dental Record</Button>
            <SearchBar onSearch={handleSearch} />
          </Box>
          {
            (!data && isFetching) ? <Loader /> :
            <>
              
              <TableContainer component={Paper} sx={{margin: 1}}>
              <Table sx={{ minWidth: 800 }} aria-label="simple table" size="small">
                  <TableHead>
                  <TableRow>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}}>Id</TableCell>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Date</TableCell>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Tooth No.</TableCell>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Quadrant</TableCell>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Quadrant Name</TableCell>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Tooth Type</TableCell>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Procedure</TableCell>
                      <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="right">Action</TableCell>            
                  </TableRow>
                  </TableHead>
                  <TableBody>
                  {visibleDataRows.length > 0 ? (
                    visibleDataRows.map((row: any, index: number) => (
                      <TableRow
                        key={`${row.id}`}                  
                        hover
                        //onClick={(event) => handleClick(event, row.id)}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>                  
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.id}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{dayjs(row.date).format('YYYY-MM-DD')}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.tooth_number}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.quadrant}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.quadrant_name}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.tooth_type}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.procedure}</TableCell>
                        <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="right">                  
                        {/* <Button variant="outlined" color="primary" onClick={() => openModal('Edit Item', row)} sx={{ marginRight: 1 }}>Edit</Button>
                        <Button variant="contained" color="error" onClick={() => handleDeleteItem(row.id)}>Delete</Button>           */}
                          <Box display={'flex'} justifyContent={'right'} alignItems={'right'} gap={2}>
                          <IconButton color="inherit" edge="start" onClick={() => openModal('Edit Item', row)} >
                          <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 0 24 24" width="32px" fill={'#0fb491'}> 
                          <path d="M0 0h24v24H0V0z" fill="none"/>
                          <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                          </svg>                      
                          </IconButton>

                          <IconButton color="inherit" edge="start" onClick={() => handleOpenDialog(row.id)} >                                            
                          <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill={'#0fb491'}>
                          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                          </svg>
                          </IconButton>
                        </Box>

                        </TableCell>              
                        </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                  {emptyDataRows > 0 && (
                      <TableRow
                        style={{
                          height: (33) * emptyDataRows,
                        }}
                      >
                        <TableCell colSpan={6} />
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
          onClose={() => setIsModalOpen(false)} 
          labelType={modalLabel} 
          item={currentItem}        
          onSubmit={handleSubmitItem}>          
              <DentalForm></DentalForm>
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
        //itemName="" 
      />           

      <ErrorAlert
        open={errorAlertOpen}
        message={errorAlertMessage}
        onClose={handleCloseAlert}
        />  
    </>
  );
}

export default DentalTab;