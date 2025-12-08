import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { TreatmentPlanFormData, PlanStatus } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TreatmentPlanFormData) => void;
  initialData?: TreatmentPlanFormData;
  title: string;
}

const TreatmentPlanModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<TreatmentPlanFormData>({
    defaultValues: {
      plan_name: '',
      diagnosis_summary: '',
      status: 'Active',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        plan_name: '',
        diagnosis_summary: '',
        status: 'Active',
      });
    }
  }, [initialData, reset, open]);

  const handleFormSubmit = (data: TreatmentPlanFormData) => {
    onSubmit(data);
    onClose();
  };

  const planStatuses: PlanStatus[] = ['Active', 'Cancelled'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="plan_name"
              control={control}
              rules={{ required: 'Plan name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Plan Name"
                  fullWidth
                  error={!!errors.plan_name}
                  helperText={errors.plan_name?.message}
                />
              )}
            />

            <Controller
              name="diagnosis_summary"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Diagnosis Summary"
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Enter diagnosis details..."
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Status"
                  select
                  fullWidth
                  error={!!errors.status}
                  helperText={errors.status?.message}
                  InputProps={{
                    readOnly: title === 'New Treatment Plan',
                  }}
                  disabled={title === 'New Treatment Plan'}
                >
                  {planStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TreatmentPlanModal;
