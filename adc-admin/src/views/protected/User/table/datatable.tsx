import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form"
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, Button, Checkbox, IconButton, TablePagination, TextField, useTheme } from "@mui/material";
import Modal from "../modal";
import BasicInfoForm from "../forms/BasicInfo";
import useGet from "../../../../services/hooks/useGet";
import Loader from "../../../../components/loader";
import dayjs from "dayjs";
import useApiCall from "../../../../services/hooks/useApiCall";
import DeleteConfirmationDialog from "components/Dialog/DeleteConfirmationDialog";
import AlertDialog from "components/Dialog/AlertDialog";
import SearchBar from "components/hookFormControls/SearchBar";
import AddIcon from '@mui/icons-material/Add';
import ErrorAlert from "components/Dialog/ErrorAlert";
import useLogActivity from "services/hooks/useLogActivity";


interface Item {
    id: number;
    full_name: string;
    job: string;
    role: string;
  }

interface Props {
  updateUserID : (Id:number)=>void;
}

const DataTable = (props:Props) => {
    let MODULE = 'ADC-ADMIN:User';
    const {updateUserID} = props;
    
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
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  
  const handleError = (error: any) => {
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };
  
  const handleCloseAlert = () => {
  setErrorAlertOpen(false);
  };

    const theme = useTheme();

      const formMethods = useForm({
      mode: 'onChange',
      defaultValues: {
          basicInfo: {
              firstName: '',
              lastName: '',
              mI: '',
              birthDate: null,
              sex: {},
              selectedJob: '',
              daysOnDuty: [],                
          },
          contactInfo:{
              address: '',
              email: '',
              contactNo:'',
          },
          accessPrivilege:{
            selectedRole: '',
        },         
          internal:{
            id: null,
            method:'',
            deleteId: -1,            
          }                      
      }
  });

 
  const { getValues, watch, setValue, reset } = formMethods;

  const { apiCall, loading, error } = useApiCall();
  const { logActivity} = useLogActivity();

    const {data, refetch, isFetching, isFetched, isLoading} = useGet({
      endpoint: 'user/getall', 
      param: {},
      querykey: 'get-user-listall',
      onErrorCallback: handleError,
    });   
    
       
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
        
      const bdate = getValues('basicInfo.birthDate');
      const birthDate = bdate ? dayjs(bdate).format('YYYY-MM-DD') : '';
      const apiParam = {
        firstName: getValues('basicInfo.firstName'),
        lastName: getValues('basicInfo.lastName'),
        mI: getValues('basicInfo.mI'),                
        birthDate: birthDate,
        sex: getValues('basicInfo.sex')==='male'? 'M':'F',
        job: getValues('basicInfo.selectedJob'),
        daysOnDuty: JSON.stringify(getValues('basicInfo.daysOnDuty')),
        address: getValues('contactInfo.address'),
        email: getValues('contactInfo.email'),
        contactNo: getValues('contactInfo.contactNo'),
        role: getValues('accessPrivilege.selectedRole'),
        status: 1,
      };

        if (currentItem) {
          // Update existing item
          const endpoint = '/user/update'
          const Id = getValues('internal.id');
          try {                        
            const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id: Id,...apiParam},
            (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);});
            //console.log('edit-response', response)
            if (response) {              
              await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Updated item ID: ${Id}`, endpoint: endpoint })});         
              triggerAlert('success', 'Successfully updated!');
              refetch();         
            }
          } catch (error) {
            //console.error("Error updating item:", error);
            await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
          }
        } else {
        // Add new item
          const endpoint = '/security/register'          
            try {
              //console.log('apiParam', apiParam)                         
              const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {...apiParam},
                (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);});         
              //console.log('add-response', response)
              if (response) {                
                await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Added item ID: ${response[0]}`, endpoint: endpoint })});          
                triggerAlert('success', 'Successfully added!');
                refetch();         
              }
              
            } catch (error) {
                //console.error("Error adding item:", error);
                await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
            }
        }        
        setIsModalOpen(false);
      };
    
      const handleConfirmDelete = async () => {
        let endpoint = '/user/delete'
        let deleteId = getValues('internal.deleteId');        
        try {          
          const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment/user/delete`, {id : deleteId},
          (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);});
          //console.log('delete-response', response)
          //refetch();          

          if (response) {
            //console.log("Error deleting item:", errorCode);
            //handle foreign key violation with StatusCode 201
            if (response.errorCode === '00000') {
              //console.log("Successfully deleting item:", response.errorCode);                                          
              await logActivity({action: 'Delete', 
                module: MODULE, 
                details: JSON.stringify({ status: 'success', detail: `deleted item ID: ${deleteId}`, endpoint: endpoint})});
                triggerAlert('success', 'Successfully deleted!');              
                refetch();
            }
            else if (response.errorCode === '23503') {
              //console.log("Error deleting item:", response.errorCode);              
              await logActivity({action: 'Delete', 
                module: MODULE, 
                details: JSON.stringify({ status: 'failed', detail: 'ResponseCode: ' + response.errorCode + `- trying to delete item ID: ${deleteId} that is already in use.`, endpoint: endpoint })});                            
                triggerAlert('error', 'Unable to delete, item is already in use!');              
                setIsAlertOpen(true);                
            }  
          }

        } catch (error) {
          //console.error("Error deleting item:", error);
          await logActivity({action: 'Delete', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
        }
        setIsDialogOpen(false);
      };

      const handleChangePage = (event: unknown, newPage: number) => {
        console.log('newPage',newPage)        
        setPage(newPage);
        
      };

      const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      };
      
      // Filtered data based on search query
      const filteredData = data?.filter((row: Item) =>
        row.full_name.toLowerCase().includes(searchQuery) ||
        row.job.toLowerCase().includes(searchQuery)
      ) || data;

      const emptyDataRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredData.length) : 0;
      
        const visibleDataRows = React.useMemo(
          () =>
            
            [...filteredData || []]
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
          [page, rowsPerPage, filteredData]

        );
        
      const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
        const selectedIndex = selected;
        //console.log('newSelected', id)

        updateUserID(id);
        setSelectedRowId(id);
      };


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

    // Handle Search
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value.toLowerCase());
    };

    const tableBackgroundColor = theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.background.paper;
  const tableTextColor = theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.primary;
      // console.log('datatable:data-isFetching-isLoading', data, isFetching, isLoading)
      // console.log('datatable:visibleDataRows-isLoading', visibleDataRows, isFetching, isLoading)
  return (
    <> 
      <FormProvider {...formMethods}>
  <Paper sx={{ mb: 2, p: 2, backgroundColor: theme.palette.background.paper }}> {/* Added padding for Paper */}
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>        
          <Button variant="contained" startIcon={<AddIcon/>} onClick={() => openModal('Add New User')}>Add User</Button>
          <SearchBar onSearch={handleSearch} />
    </Box>
    {
      (!data && isFetching) ? <Loader /> :
      <>   
        <TableContainer  >
          <Table sx={{ width: '100%' }} aria-label="simple table" size="small">
            <TableHead>
              <TableRow>
              <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }}>Select</TableCell>
                {/* <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} >Id</TableCell> */}
                <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Name</TableCell>
                <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Job</TableCell>
                <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                visibleDataRows.map((row: any, index: number) => (
                  <TableRow
                    key={`${row.id}`}
                    hover
                    onClick={(event) => handleClick(event, row.id)}
                    sx={{                      
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }, // Hover effect
                    }}
                  >
                    <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', 
                      color: theme.palette.text.primary,
                      }} padding="checkbox">
                      <Checkbox                        
                        checked={selectedRowId === row.id}
                        onChange={() => setSelectedRowId(row.id)}
                        inputProps={{ 'aria-labelledby': `checkbox-${row.id}` }}
                        sx={{
                          color: theme.palette.mode === 'dark' ? '#0fb491' : '#000000',
                          '&.Mui-checked': {
                            color: '#0fb491',
                          },
                        }}
                      />
                    </TableCell>  
                    {/* <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.id}</TableCell> */}
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.full_name}</TableCell>
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.job}</TableCell>
                    <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="right">
                    
                      <Box display={'flex'} justifyContent={'right'} alignItems={'right'} gap={2}>
                        <IconButton color="inherit" edge="start" onClick={() => openModal('Edit Item', row)} >
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 0 24 24" width="32px" fill={'#0fb491'}> 
                        <path d="M0 0h24v24H0V0z" fill="none"/>
                        <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                        </svg>                      
                        </IconButton>
                        { row.role !== 'Superadmin' &&
                          <IconButton color="inherit" edge="start" onClick={() => handleOpenDialog(row.id)} >                                            
                          <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill={'#0fb491'}>
                          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                          </svg>
                          </IconButton>
                        }
                        
                      </Box>
                     
                    </TableCell>
                  </TableRow>
                ))
              }
              {emptyDataRows > 0 && (
                <TableRow
                  style={{
                    height: (33) * emptyDataRows,
                    backgroundColor: tableBackgroundColor,
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
      //item={currentItem}
      onSubmit={handleSubmitItem}
    >
      <BasicInfoForm></BasicInfoForm>
    </Modal>
  </Paper>
</FormProvider>

    <AlertDialog          
        open={isAlertOpen}
        message={alertMessage}
        severity={alertSeverity}
        position="center-top"        
        duration={6000} // 5 seconds duration before auto-close
        onClose={handleCloseAlertDialog}
      />


    <DeleteConfirmationDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        //itemName="Test Item" // Optional: Replace with the actual item name
      />

      <ErrorAlert
        open={errorAlertOpen}
        message={errorAlertMessage}
        onClose={handleCloseAlert}
        /> 

    </>
  );
}

export default DataTable;