import React, { useState } from "react";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, Button, IconButton, TextField, useTheme } from "@mui/material";
import Modal from "../modal";
import { FormProvider, useForm } from "react-hook-form";
import useApiCall from "services/hooks/useApiCall";
import AlertDialog from "components/Dialog/AlertDialog";
import DeleteConfirmationDialog from "components/Dialog/DeleteConfirmationDialog";
import SearchBar from "components/hookFormControls/SearchBar";
import ErrorAlert from "components/Dialog/ErrorAlert";
import AddIcon from '@mui/icons-material/Add';
import useLogActivity from "services/hooks/useLogActivity";


function endpointData(
    item: string,
    endpoint: string  
  ) {
    return { item, endpoint};
  }

  
  const endpointAdd = [
    endpointData('Access Privilege', 'role/add'),
    endpointData('Job', 'job/add'),  
    endpointData('Treatments', 'treatment/add'),
  ];


  const endpointUpdate = [
    endpointData('Access Privilege', 'role/update'),
    endpointData('Job', 'job/update'),  
    endpointData('Treatments', 'treatment/update'),
  ];


  const endpointDelete = [
    endpointData('Access Privilege', 'role/delete'),
    endpointData('Job', 'job/delete'),  
    endpointData('Treatments', 'treatment/delete'),
  ];


interface Item {
    id: number;
    description: string;
    duration: number;
  }

type Props = {
    item : string;
    data : any;    
    refetch: ()=>{};
}

export default function DataTable(props : Props) {
    let MODULE = 'ADC-ADMIN:Maintenance';
    const {item, data, refetch} = props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLabel, setModalLabel] = useState('');    
    const [currentItem, setCurrentItem] = useState<Item | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const theme = useTheme();
    const [errorAlertOpen, setErrorAlertOpen] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState("");
    
  //console.log('internalId', internalId)
  const handleError = (error: any) => {
    // Extract a user-friendly error message
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
};

const handleCloseAlert = () => {
  setErrorAlertOpen(false);
};


    const formMethods = useForm({
      mode: 'onChange',
      defaultValues: {
        formFields: {
          name : '',          
          accessPermissions: ['AP0'],
          selectedLevel: '',
          duration: 0,          
        },      
        internal:{
          id: null,
          method:'',
          deleteId: -1,            
        }                      
      }
    });

    const { getValues, watch, setValue, reset, trigger } = formMethods;

    const openModal = (text: string, item?: Item) => {
      setModalLabel(text);
      setCurrentItem(item || null);
      setIsModalOpen(true);      
    };

    
    const { apiCall, loading, error, errorCode } = useApiCall();
    const { logActivity} = useLogActivity();

    const handleSaveItem = async (_item: Item) => {
        //console.log('handleSaveItem', _item, item)        
        let apiParam = {};
        if (item === 'Access Privilege') {
          apiParam = {          
            selectedLevel: getValues('formFields.selectedLevel'),
            description: getValues('formFields.name'),            
            accessPermissions: JSON.stringify(getValues('formFields.accessPermissions')),                          
          };  
        }else if (item === 'Treatments') {
          apiParam = {                   
            description: getValues('formFields.name'),            
            duration: getValues('formFields.duration'),                          
          };  
        }else {
          apiParam = {          
            description: getValues('formFields.name'),            
          };
        }
        let _MODULE = MODULE +'-'+ item.replace(/\s+/g, "");
        
        if (currentItem) {
          // Update existing item
          const endpoint = '/' + endpointUpdate.find((e)=>e.item === item)?.endpoint        
          try {
            const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id : _item.id, ...apiParam},
              (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);}
            );
            if (response) {
              //console.log('result', response)            
              await logActivity({action: 'Update', module: _MODULE, details: JSON.stringify({ status: 'success', detail: `Updated item ID: ${_item.id}`, endpoint: endpoint })});         
              triggerAlert('success', 'Successfully updated!');                     
              refetch();
              
            }                          
          } catch (error) {
            //console.error("Error updating item:", error);
            await logActivity({action: 'Update', module: _MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
          }
        } else {
        // Add new item
        const endpoint = '/' + endpointAdd.find((e)=>e.item === item)?.endpoint
            try {                
                const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {...apiParam},
                (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);}
              );
              //console.log('trace-response', response)
              if (response) {
                await logActivity({action: 'Add', module: _MODULE, details: JSON.stringify({ status: 'success', detail: `Added item ID: ${response[0]}`, endpoint: endpoint })});          
                triggerAlert('success', 'Successfully added!');                
                refetch();
                
              }                       
                
            } catch (error) {
                //console.error("Error adding item:", error);
                await logActivity({action: 'Add', module: _MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
            }
        }        
        setIsModalOpen(false);
      };
    
      const handleConfirmDelete = async () => {
        const endpoint = '/' + endpointDelete.find((e)=>e.item === item)?.endpoint;
        let deleteId = getValues('internal.deleteId');
        let _MODULE = MODULE +'-'+ item.replace(/\s+/g, "");
        try {          
          const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id : deleteId},
          (err) => {setErrorAlertMessage( err.response?.data?.message || 'Something went wrong.'); setErrorAlertOpen(true);}
        );          
          if (response) {            
            //handle foreign key violation with StatusCode 201
            if (response.errorCode === '00000') {
              //console.log("Successfully deleting item:", response.errorCode);                                          
              await logActivity({action: 'Delete', 
                module: _MODULE, 
                details: JSON.stringify({ status: 'success', detail: `deleted item ID: ${deleteId}`, endpoint: endpoint})});              
                triggerAlert('success', 'Successfully deleted!');              
                refetch();
            }
            else if (response.errorCode === '23503') {
              //console.log("Error deleting item:", response.errorCode);
                           
              await logActivity({action: 'Delete', 
                module: _MODULE, 
                details: JSON.stringify({ status: 'failed', detail: 'ResponseCode: ' + response.errorCode + `- trying to delete item ID: ${deleteId} that is already in use.`, endpoint: endpoint })});                            
                triggerAlert('error', 'Unable to delete, item is already in use!');              
                setIsAlertOpen(true); 
            }  
          }
          
          
        } catch (err) {
          //console.error("Error:", err);
          await logActivity({action: 'Delete', module: _MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
        }

        setIsDialogOpen(false); 
      };

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

    // Handle Search
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value.toLowerCase());
    };

    // Filtered data based on search query
    const filteredData = data?.filter((row: Item) =>
        row.description.toLowerCase().includes(searchQuery)
    ) || data;

  return (
    <>        
      

        {/* <Button onClick={() => openModal('Add New Item')}>Add New Item</Button> */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Button variant="contained" onClick={() => openModal('Add new')} startIcon={<AddIcon/>}>Add New Item</Button>
                <SearchBar onSearch={handleSearch} />
        </Box>
        <TableContainer component={Paper}>
        <Table sx={{ minWidth: 800, width: '100%' }} aria-label="simple table">
            <TableHead>
            <TableRow>
                <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Name</TableCell>
                {item === 'Treatments' && (
                  <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Duration</TableCell>
                )}
                <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="right">Action</TableCell>            
            </TableRow>
            </TableHead>
            <TableBody>
            {filteredData && filteredData.map((row: any, index : number) => (
                <TableRow
                key={`${row.id}+${row.description}`}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >                
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.description}</TableCell>
                {item === 'Treatments' && (
                  <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.duration || 'N/A'}</TableCell>
                )}
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="right">
                  <Box display={'flex'} justifyContent={'right'} alignItems={'right'} gap={2}>
                      <IconButton color="inherit" edge="start" onClick={() => openModal(`Edit`, row)} >
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
            ))}
            </TableBody>
        </Table>
        </TableContainer>
      <FormProvider {...formMethods}>
        <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        labelType={modalLabel} 
        item={currentItem}
        onSave={handleSaveItem}
        componentType={item}
        />        
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
