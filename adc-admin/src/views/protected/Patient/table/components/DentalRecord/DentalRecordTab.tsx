import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Box, Button, IconButton, TablePagination, useTheme } from "@mui/material";
import useGet from "services/hooks/useGet";
import Loader from "components/loader";
import useApiCall from "services/hooks/useApiCall";
import DeleteConfirmationDialog from "components/Dialog/DeleteConfirmationDialog";
import AlertDialog from "components/Dialog/AlertDialog";
import SearchBar from "components/hookFormControls/SearchBar";
import AddIcon from '@mui/icons-material/Add';
import ErrorAlert from "components/Dialog/ErrorAlert";
import useLogActivity from "services/hooks/useLogActivity";
import DentalRecordAddEditModal from './DentalRecordAddEditModal';
import { Visibility } from "@mui/icons-material";

interface TreatmentOption {
  description: string;
  id: string;
  selection: number;
}

interface ToothOption {
  description: string;
  id: number;
}

interface SelectionOption {
  description: string;
  id: string;
}

interface DentalRecordItem {
  id: number;
  treatment: string;
  groupType: string;
  tooth: string;
  procedure_type?: string;
  patientId: number;
  created_at: string;  
}

const FULL_MOUTH_OPTIONS: SelectionOption[] = [
  { description: "Full Mouth", id: "full_mouth" }
];

const ARCH_OPTIONS: SelectionOption[] = [
  { description: "Upper Arch (Maxillary)", id: "upper_arch" },
  { description: "Lower Arch (Mandibular)", id: "lower_arch" }
];

const QUADRANT_OPTIONS: SelectionOption[] = [
  { description: "Upper Right Quadrant", id: "quadrant_1" },
  { description: "Upper Left Quadrant", id: "quadrant_2" },
  { description: "Lower Left Quadrant", id: "quadrant_3" },
  { description: "Lower Right Quadrant", id: "quadrant_4" }
];

const TEETH: SelectionOption[] = Array.from({ length: 32 }, (_, i) => ({ description: `Tooth ${i + 1}`, id: String(i + 1) }));

type Option={
  id: number;
  description: string;
  tooth_options: ToothOption[];
  created_at?: string;
}

interface Props {
  Id?: number | null;
}

const DentalRecordTab: React.FC<Props> = ({Id}) => {
  let MODULE = 'ADC-ADMIN:Patient-DentalRecord';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<DentalRecordItem | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");

  const [dentalRecords, setDentalRecords] = useState<DentalRecordItem[]>([]);
  const [treatmentOptions, setTreatmentOptions] = useState<Option[]>([]);

  
  const handleError = (error: any) => {
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };

  const handleCloseAlert = () => {
    setErrorAlertOpen(false);
  };

  const theme = useTheme();

  // Get teeth type options based on treatment
  const getTeethTypeOptions = (selectedGroupType: number): SelectionOption[] => {
    // const treatment = TREATMENTS.find(t => t.id === selectedTreatment);
    // if (!treatment) return [];

    switch (selectedGroupType) {
      case 1:
        return FULL_MOUTH_OPTIONS;
      case 2:
        return ARCH_OPTIONS;      
      case 3:
        return QUADRANT_OPTIONS;
      case 4:
        return TEETH;
      default:
        return [];
    }
  };

  const formMethods = useForm({
    mode: 'onChange',
    defaultValues: {
      dentalRecord: {
        treatment: '',
        groupType: '',
        tooth: '',
        patientId: Id,
      },
      internal: {
        id: null,
        method: '',
        deleteId: -1
      }
    }
  });

  const { getValues, watch, setValue, reset } = formMethods;

  const { apiCall, loading, error } = useApiCall();
  const { logActivity } = useLogActivity();

  const { data: dentalData, refetch, isFetching, isFetched, isLoading } = useGet({
    endpoint: 'dental/getlist',
    param: { id: Id },
    querykey: `get-dental-record-list-${Id}`,
    onErrorCallback: handleError,
  });

  const {data: treatmentData, isFetching: treatmentIsFetching } = useGet({
    endpoint: 'treatment/getall', 
    param: {},
    querykey:'get-treatment-list',
    onErrorCallback: handleError,
  });


  useEffect(()=>{ 
      if (dentalData) {
          //console.log('dental-data', dentalData)
          // transform dentalData to match DentalRecordItem interface
            interface DentalDataItem {
            id: number;
            patient_id: number;
            treatment_id: number;
            group_type_id: number;
            tooth_code: string;
            procedure_type?: string;
            created_at: string;
            updated_at: string;
            }

            const transformedData: DentalRecordItem[] = (dentalData as DentalDataItem[]).map((item: DentalDataItem): DentalRecordItem => ({
            id: item.id,
            treatment: String(item.treatment_id),
            groupType: String(item.group_type_id),
            tooth: item.tooth_code,
            procedure_type: item.procedure_type,
            patientId: item.patient_id,
            created_at: item.created_at,
            }));
          setDentalRecords(transformedData);
      }
    },[dentalData])

    useEffect(()=>{
      if (treatmentData) {
          //console.log('treatment-data', treatmentData)
          setTreatmentOptions(treatmentData)        
      }
    },[treatmentData])

    // Clear records when Id changes to prevent showing stale data
    useEffect(() => {
      if (Id) {
        //setDentalRecords([]);
      }
    }, [Id]);




  //console.log('patientId', Id);

  // Trigger popup explicitly
  const triggerAlert = (newSeverity: 'error' | 'warning' | 'info' | 'success', newMessage: string) => {
    setAlertSeverity(newSeverity);
    setAlertMessage(newMessage);
    setIsAlertOpen(true);
  };

  const openModal = (mode: 'add' | 'edit', item?: DentalRecordItem) => {
    setModalMode(mode);
    setCurrentItem(item || null);
    setIsModalOpen(true);
  };

  const handleSubmitItem = async (values: { treatment: string; groupType: string; tooth: string }) => {
    const apiParam = {
      patientId: Id,
      treatmentId: Number(values.treatment),
      groupTypeId: Number(values.groupType),
      toothCode: values.tooth,
    };
    console.log('apiParam', apiParam)
    const _Id = Id;
    if (currentItem) {
      // Update existing item
      const endpoint = '/dental/update'

      try {
        const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, { id: currentItem.id, ...apiParam });
        console.log('edit-response', response)
        if (response) {
          await logActivity({ action: 'Update', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Updated DentalRecordID: ${response[0]} , with PatientID: ${_Id}`, endpoint: endpoint }) });
          triggerAlert('success', 'Successfully updated!');
          refetch();
        }
      } catch (error) {
        console.error("Error updating item:", error);
        await logActivity({ action: 'Update', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint }) });
      }
    } else {
      // Add new item
      const endpoint = '/dental/add'
      try {
        const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, { ...apiParam });
        console.log('add-response', response)
        if (response) {
          await logActivity({ action: 'Add', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Added DentalRecordID: ${response[0]} , with PatientID: ${_Id}`, endpoint: endpoint }) });
          triggerAlert('success', 'Successfully added!');
          refetch();
        }
      } catch (error) {
        console.error("Error adding item:", error);
        await logActivity({ action: 'Add', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint }) });
      }
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    let endpoint = '/dental/delete'
    let deleteId = getValues('internal.deleteId');
    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, { id: deleteId });
      console.log('delete-response', response)

      if (response) {
        if (response.errorCode === '00000') {
          console.log("Successfully deleting item:", response.errorCode);
          await logActivity({
            action: 'Delete',
            module: MODULE,
            details: JSON.stringify({ status: 'success', detail: `deleted item ID: ${deleteId}`, endpoint: endpoint })
          });
          triggerAlert('success', 'Successfully deleted!');
          refetch();

        }
        else if (response.errorCode === '23503') {
          await logActivity({
            action: 'Delete',
            module: MODULE,
            details: JSON.stringify({ status: 'failed', detail: 'ResponseCode: ' + response.errorCode + `- trying to delete item ID: ${deleteId} that is already in use.`, endpoint: endpoint })
          });
          triggerAlert('error', 'Unable to delete, item is already in use!');
          setIsAlertOpen(true);
        }
      }

    } catch (error) {
      console.error("Error deleting item:", error);
      await logActivity({ action: 'Delete', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint }) });
    }
    setIsDialogOpen(false);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value.toLowerCase());
  };

  const handleOpenDialog = (Id: number) => {
    setValue('internal.deleteId', Id);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleCloseAlertDialog = () => {
    setIsAlertOpen(false);
  };

  return (
    <>
      <FormProvider {...formMethods}>
        <Paper sx={{ width: '100%', mb: 2 }}>

          {/*  */}
          <Paper sx={{ margin: 1, padding: 2, backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#F5F5F5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Dental Records</h3>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openModal('add')}
              >
                Add Record
              </Button>
            </Box>

            {/* Records List */}
            {dentalRecords.length > 0 && (
              <div>
                <TableContainer component={Paper} sx={{ marginTop: 1 }}>
                  <Table sx={{ minWidth: 650 }} aria-label="records table" size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Treatment</TableCell>
                        <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Group Type</TableCell>
                        <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Tooth Type</TableCell>
                        <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Procedure Type</TableCell>
                        <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Date Created</TableCell>
                        <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dentalRecords.map((record, index) => {
                        const treatment = treatmentOptions.find(t => t.id === Number(record.treatment));                        
                        const treatmentLabel = treatment?.description;                                                
                        const procedureTypeLabel = record.procedure_type === 'with-plan' ? 'With Plan' : 'Without Plan';
                        const createdAt = new Date(record.created_at);
                        const groupTypeLabel = treatment?.tooth_options.find(o => o.id === Number(record.groupType))?.description;
                        const teethTypeLabel = getTeethTypeOptions(Number(record.groupType)).find(o => o.id === record.tooth)?.description

                        return (
                          <TableRow
                            key={index}
                            hover
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{treatmentLabel}</TableCell>
                            <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{groupTypeLabel}</TableCell>
                            <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{teethTypeLabel}</TableCell>
                            <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{procedureTypeLabel}</TableCell>
                            <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{createdAt.toLocaleDateString()}</TableCell>
                            <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="right">
                              <Box display={'flex'} justifyContent={'right'} alignItems={'right'} gap={2} sx={{ visibility: record.procedure_type == 'with-plan' ? 'hidden': 'visible' }}>
                                <IconButton color="inherit" edge="start" onClick={() => openModal('edit', record)} >
                                  <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 0 24 24" width="32px" fill={'#0fb491'}>
                                    <path d="M0 0h24v24H0V0z" fill="none"/>
                                    <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                                  </svg>
                                </IconButton>

                                <IconButton color="inherit" edge="start" onClick={() => handleOpenDialog(record.id)} >
                                  <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill={'#0fb491'}>
                                    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                  </svg>
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </Paper>

          <DentalRecordAddEditModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            mode={modalMode}
            item={currentItem}
            onSubmit={handleSubmitItem}
            treatmentOptions={treatmentOptions}
            getTeethTypeOptions={getTeethTypeOptions}
          />
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

      <ErrorAlert
        open={errorAlertOpen}
        message={errorAlertMessage}
        onClose={handleCloseAlert}
      />
    </>
  );
}

export default DentalRecordTab;