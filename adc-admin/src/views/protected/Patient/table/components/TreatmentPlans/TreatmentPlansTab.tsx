import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Collapse,
  TablePagination,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Receipt as InvoiceIcon,
  Visibility as ViewIcon,
  AddCircleOutline as AddInvoiceIcon,
} from '@mui/icons-material';
import {
  TreatmentPlanHeader,
  TreatmentPlanEntry,
  TreatmentPlanFormData,
  TreatmentPlanEntryFormData,
  PlanStatus,
  EntryStatus,
} from './types';
import TreatmentPlanModal from './TreatmentPlanModal';
import TreatmentPlanEntryModal from './TreatmentPlanEntryModal';
import useGet from 'services/hooks/useGet';
import useApiCall from 'services/hooks/useApiCall';
import DeleteConfirmationDialog from 'components/Dialog/DeleteConfirmationDialog';
import ErrorAlert from 'components/Dialog/ErrorAlert';
import Loader from 'components/loader';
import dayjs from 'dayjs';

interface Props {
  Id: number | null;
}

interface ExpandedPlan {
  planId: number;
  open: boolean;
}

const TreatmentPlansTab: React.FC<Props> = ({ Id }) => {
  const theme = useTheme();
  const [plans, setPlans] = useState<TreatmentPlanHeader[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<number[]>([]);
  const [planEntries, setPlanEntries] = useState<{ [key: number]: TreatmentPlanEntry[] }>({});
  
  // Modals state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlanHeader | null>(null);
  const [editingEntry, setEditingEntry] = useState<TreatmentPlanEntry | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);
  
  // Delete dialogs
  const [deletePlanDialogOpen, setDeletePlanDialogOpen] = useState(false);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<number | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
  
  // Error handling
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const { apiCall, loading } = useApiCall();

  // Fetch treatment plans for patient
  const { data: plansData, refetch: refetchPlans, isFetching } = useGet({
    endpoint: 'treatment-plan-header/getall',
    param: { patient_id: Id },
    querykey: `get-treatment-plan-headers-${Id}`,
    onErrorCallback: handleError,
  });

  useEffect(() => {
    if (plansData) {
      setPlans(plansData);
    }
  }, [plansData]);

  function handleError(error: any) {
    const message = error?.response?.data?.message || 'An error occurred';
    setErrorMessage(message);
    setErrorAlertOpen(true);
  }

  const fetchPlanEntries = async (planId: number) => {
    try {
      const response = await apiCall(
        `${import.meta.env.VITE_API_URL}/appointment/treatment-plan-entry/getall`,
        { plan_id: planId }
      );
      setPlanEntries(prev => ({
        ...prev,
        [planId]: response || [],
      }));
    } catch (error) {
      handleError(error);
    }
  };

  const handleExpandPlan = async (planId: number) => {
    if (expandedPlans.includes(planId)) {
      setExpandedPlans(expandedPlans.filter(id => id !== planId));
    } else {
      setExpandedPlans([...expandedPlans, planId]);
      if (!planEntries[planId]) {
        await fetchPlanEntries(planId);
      }
    }
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setPlanModalOpen(true);
  };

  const handleEditPlan = (plan: TreatmentPlanHeader) => {
    setEditingPlan(plan);
    setPlanModalOpen(true);
  };

  const handlePlanSubmit = async (data: TreatmentPlanFormData) => {
    try {
      if (editingPlan && editingPlan.plan_id) {
        // Update existing plan
        await apiCall(
          `${import.meta.env.VITE_API_URL}/appointment/treatment-plan-header/update`,
          {
            id: editingPlan.plan_id,
            patient_id: Id,
            ...data,
          }
        );
      } else {
        // Create new plan
        await apiCall(
          `${import.meta.env.VITE_API_URL}/appointment/treatment-plan-header/add`,
          {
            patient_id: Id,
            ...data,
          }
        );
      }
      refetchPlans();
      setPlanModalOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleAddEntry = (planId: number) => {
    setCurrentPlanId(planId);
    setEditingEntry(null);
    setEntryModalOpen(true);
  };

  const handleEditEntry = (planId: number, entry: TreatmentPlanEntry) => {
    setCurrentPlanId(planId);
    setEditingEntry(entry);
    setEntryModalOpen(true);
  };

  const handleViewEntry = (planId: number, entry: TreatmentPlanEntry) => {
    setCurrentPlanId(planId);
    setEditingEntry(entry);
    setEntryModalOpen(true);
  };

  const handleEntrySubmit = async (data: TreatmentPlanEntryFormData) => {
    try {
      //console.log('Submitting entry data:', data);
      if (editingEntry && editingEntry.entry_id) {
        // Update existing entry
        await apiCall(
          `${import.meta.env.VITE_API_URL}/appointment/treatment-plan-entry/update`,
          {
            id: editingEntry.entry_id,
            plan_id: currentPlanId,
            ...data,
          }
        );
      } else {
        // Create new entry
        await apiCall(
          `${import.meta.env.VITE_API_URL}/appointment/treatment-plan-entry/add`,
          {
            plan_id: currentPlanId,
            ...data,
          }
        );
      }
      if (currentPlanId) {
        await fetchPlanEntries(currentPlanId);
      }
      refetchPlans(); // Refresh to update total costs
      setEntryModalOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeletePlan = (planId: number) => {
    setPlanToDelete(planId);
    setDeletePlanDialogOpen(true);
  };

  const handleDeletePlanConfirm = async () => {
    if (planToDelete) {
      try {
        await apiCall(
          `${import.meta.env.VITE_API_URL}/appointment/treatment-plan-header/delete`,
          { id: planToDelete }
        );
        refetchPlans();
        setDeletePlanDialogOpen(false);
        setPlanToDelete(null);
      } catch (error) {
        handleError(error);
      }
    }
  };

  const handleDeleteEntry = (entryId: number) => {
    setEntryToDelete(entryId);
    setDeleteEntryDialogOpen(true);
  };

  const handleDeleteEntryConfirm = async () => {
    if (entryToDelete) {
      try {
        await apiCall(
          `${import.meta.env.VITE_API_URL}/appointment/treatment-plan-entry/delete`,
          { id: entryToDelete }
        );
        // Refresh entries for expanded plans
        for (const planId of expandedPlans) {
          await fetchPlanEntries(planId);
        }
        refetchPlans();
        setDeleteEntryDialogOpen(false);
        setEntryToDelete(null);
      } catch (error) {
        handleError(error);
      }
    }
  };

  const getPlanStatusColor = (status: PlanStatus): 'success' | 'default' | 'error' => {
    switch (status) {
      case 'Active': return 'success';
      case 'Completed': return 'default';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const getEntryStatusColor = (status: EntryStatus): 'default' | 'primary' | 'success' | 'error' | 'warning' => {
    switch (status?.toLowerCase()) {
      case 'planned': return 'primary'; // Blue
      case 'on-going': return 'warning'; // Yellow/Orange      
      case 'performed': return 'success'; // Green
      case 'invoiced': return 'default'; // Red
      case 'cancelled': return 'error'; // Gray
      default: return 'primary'; // Default to blue for planned
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const visiblePlans = React.useMemo(
    () => plans.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, plans]
  );

  if (!Id) {
    return <Typography>No patient selected</Typography>;
  }

  if (isFetching && !plans.length) {
    return <Loader />;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Treatment Plans</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddPlan}
        >
          New Treatment Plan
        </Button>
      </Stack>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300] }} width={50} />
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300] }}>Plan Name</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300] }}>Status</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300] }}>Created On</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300] }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visiblePlans.length > 0 ? (
                visiblePlans.map((plan, index) => (
                  <React.Fragment key={plan.plan_id}>
                    <TableRow hover sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }} onClick={() => handleExpandPlan(plan.plan_id!)}>
                      <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleExpandPlan(plan.plan_id!)}
                        >
                          {expandedPlans.includes(plan.plan_id!) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default' }}>
                        <Typography fontWeight="medium">{plan.plan_name}</Typography>
                        {plan.diagnosis_summary && (
                          <Typography variant="body2" color="text.secondary">
                            {plan.diagnosis_summary}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default' }}>
                        <Chip
                          label={plan.status}
                          color={getPlanStatusColor(plan.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default' }}>
                        {plan.created_at ? dayjs(plan.created_at).format('MMM DD, YYYY') : 'N/A'}
                        {plan.created_by_name && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            By: {plan.created_by_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default' }} align="right">
                        {plan.status !== 'Completed' && (
                          <>
                            <IconButton
                              size="small"
                              onClick={e => { e.stopPropagation(); handleEditPlan(plan); }}
                              title="Edit Plan"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            {(!planEntries[plan.plan_id!] || planEntries[plan.plan_id!]?.length === 0) && (
                              <IconButton
                                size="small"
                                color="error"                                
                                onClick={e => { e.stopPropagation(); handleDeletePlan(plan.plan_id!); }}
                                title="Delete Plan"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                        <Collapse in={expandedPlans.includes(plan.plan_id!)} timeout="auto" unmountOnExit sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E !important' : '#616161 !important') : 'default' }}>
                          <Box sx={{ margin: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="subtitle2" gutterBottom>
                                Treatment Plan Entries
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleAddEntry(plan.plan_id!)}
                              >
                                Add Entry
                              </Button>
                            </Stack>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E !important' : theme.palette.grey[200] }}>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Tooth Code</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Procedure</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Notes</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Est. Cost</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Dentist</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Status</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Performed Date</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Invoice</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.mode === 'dark' ? '#ffffff !important' : 'inherit', backgroundColor: 'inherit' }}>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {planEntries[plan.plan_id!]?.length > 0 ? (
                                  planEntries[plan.plan_id!].map((entry, entryIndex) => (
                                    <TableRow key={entry.entry_id} sx={{ backgroundColor: theme.palette.mode === 'dark' ? (entryIndex % 2 === 0 ? '#4e4e4e !important' : '#616161 !important') : (entryIndex % 2 === 0 ? '#f5f5f5' : '#ffffff') }}>
                                      <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>{entry.group_type_id === 4 ? 'Tooth #' : ''}{entry.tooth_code || '—'}</TableCell>
                                      <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>{entry.procedure_name || `Procedure ${entry.procedure_id}`}</TableCell>
                                      <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>{entry.notes || '—'}</TableCell>
                                      <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>₱{Number(entry.estimated_cost).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                      <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>{entry.dentist_name || '—'}</TableCell>
                                      <TableCell>
                                        <Chip
                                          label={entry.status}
                                          color={getEntryStatusColor(entry.status)}
                                          size="small"
                                        />
                                      </TableCell>
                                      <TableCell sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>
                                        {entry.performed_date ? dayjs(entry.performed_date).format('YYYY-MM-DD') : '—'}
                                      </TableCell>
                                      <TableCell>
                                        {entry.invoice_code ? (
                                          <Button
                                            size="small"
                                            startIcon={<InvoiceIcon />}
                                            variant="outlined"
                                            color="secondary"
                                            onClick={() => {
                                              const token = localStorage.getItem('token');
                                              const invoiceUrl = `${import.meta.env.VITE_REDIRECT_BILLING_SITE_URL}/billing/invoices/${entry.invoice_id}`;
                                              const urlWithToken = token ? `${invoiceUrl}?token=${encodeURIComponent(token)}` : invoiceUrl;
                                              window.open(urlWithToken, '_blank');
                                            }}
                                            sx={{ textTransform: 'none' }}
                                          >
                                            {entry.invoice_code}
                                          </Button>
                                        ) : (
                                          <Button
                                            size="small"
                                            startIcon={<AddInvoiceIcon />}
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => {
                                              const token = localStorage.getItem('token');
                                              const invoiceUrl = `${import.meta.env.VITE_REDIRECT_BILLING_SITE_URL}/billing/invoices/create/${Id}`;
                                              const urlWithToken = token ? `${invoiceUrl}?token=${encodeURIComponent(token)}` : invoiceUrl;
                                              window.open(urlWithToken, '_blank');
                                            }}
                                            sx={{ textTransform: 'none' }}
                                          >
                                            Create Invoice
                                          </Button>
                                        )}
                                      </TableCell>
                                      <TableCell align="right">
                                        {entry.status?.toLowerCase() === 'invoiced' ? (
                                          <IconButton
                                            size="small"
                                            onClick={() => handleViewEntry(plan.plan_id!, entry)}
                                            title="View Entry"
                                            color="primary"
                                          >
                                            <ViewIcon fontSize="small" />
                                          </IconButton>
                                        ) : (
                                          <>
                                            <IconButton
                                              size="small"
                                              onClick={() => handleEditEntry(plan.plan_id!, entry)}
                                              title="Edit Entry"
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() => handleDeleteEntry(entry.entry_id!)}
                                              title="Delete Entry"
                                            >
                                              <DeleteIcon fontSize="small" />
                                            </IconButton>
                                          </>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#3E3E3E !important' : '#ffffff !important' }}>
                                    <TableCell colSpan={9} align="center">
                                      No entries yet. Click "Add Entry" to add procedures.
                                    </TableCell>
                                  </TableRow>
                                )}
                                {planEntries[plan.plan_id!]?.length > 0 && (
                                  <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#2A2A2A !important' : '#e8f5e9 !important', fontWeight: 'bold' }}>
                                    <TableCell colSpan={3} align="right">
                                      <Typography variant="subtitle2" fontWeight="bold">
                                        Total Estimated:
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="subtitle2" fontWeight="bold">
                                        ₱{planEntries[plan.plan_id!]
                                          .reduce((sum, entry) => sum + Number(entry.estimated_cost), 0)
                                          .toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </Typography>
                                    </TableCell>
                                    <TableCell colSpan={5} />
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No treatment plans found. Click "New Treatment Plan" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={plans.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Plan Modal */}
      <TreatmentPlanModal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSubmit={handlePlanSubmit}
        initialData={editingPlan ? {
          plan_name: editingPlan.plan_name,
          diagnosis_summary: editingPlan.diagnosis_summary,
          status: editingPlan.status,
        } : undefined}
        title={editingPlan ? 'Edit Treatment Plan' : 'New Treatment Plan'}
      />

      {/* Entry Modal */}
      <TreatmentPlanEntryModal
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSubmit={handleEntrySubmit}
        initialData={editingEntry ? {
          tooth_code: editingEntry.tooth_code,
          procedure_id: editingEntry.procedure_id,
          group_type_id: editingEntry.group_type_id,
          notes: editingEntry.notes,
          estimated_cost: editingEntry.estimated_cost,
          dentist_id: editingEntry.dentist_id,
          status: editingEntry.status,
          performed_date: editingEntry.performed_date,
          invoice_id: editingEntry.invoice_id,
        } : undefined}
        title={editingEntry?.status?.toLowerCase() === 'invoiced' ? 'View Entry' : (editingEntry ? 'Edit Entry' : 'Add Entry')}
        readOnly={editingEntry?.status?.toLowerCase() === 'invoiced'}
      />

      {/* Delete Plan Dialog */}
      <DeleteConfirmationDialog
        open={deletePlanDialogOpen}
        onClose={() => setDeletePlanDialogOpen(false)}
        onConfirm={handleDeletePlanConfirm}
        itemName="treatment plan"
      />

      {/* Delete Entry Dialog */}
      <DeleteConfirmationDialog
        open={deleteEntryDialogOpen}
        onClose={() => setDeleteEntryDialogOpen(false)}
        onConfirm={handleDeleteEntryConfirm}
        itemName="treatment plan entry"
      />

      {/* Error Alert */}
      <ErrorAlert
        open={errorAlertOpen}
        onClose={() => setErrorAlertOpen(false)}
        message={errorMessage}
      />
    </Box>
  );
};

export default TreatmentPlansTab;