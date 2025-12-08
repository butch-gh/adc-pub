import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Procedure, EntryStatus } from '../../table/components/TreatmentPlans/types';
import useGet from 'services/hooks/useGet';
import useApiCall from 'services/hooks/useApiCall';

interface TreatmentPlanFormData {
  service_id: number | null;
  tooth_or_area: number | null;
  notes: string;
  estimated_amount: number | null;
  status: EntryStatus;
}

interface Service {
  id: number;
  description: string;
}

interface Tooth {
  id: number;
  description?: string;
  name?: string;
}

interface TreatmentPlanFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TreatmentPlanFormData) => void;
  initialData?: Partial<TreatmentPlanFormData>;
  title: string;
}

const TreatmentPlanForm: React.FC<TreatmentPlanFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<TreatmentPlanFormData>({
    defaultValues: {
      service_id: null,
      tooth_or_area: null,
      notes: '',
      estimated_amount: null,
      status: 'Planned',
      ...initialData,
    },
  });

  const [services, setServices] = useState<Service[]>([]);
  const [teeth, setTeeth] = useState<Tooth[]>([]);

  // Fetch services (treatments)
  const { data: servicesData, isFetching: servicesLoading } = useGet({
    endpoint: 'service/getall',
    param: {},
    querykey: 'get-services-list',
  });

  // Fetch teeth/area options
  const { data: teethData, isFetching: teethLoading } = useGet({
    endpoint: 'dental/getteethlist',
    param: {},
    querykey: 'get-teeth-list',
  });

  useEffect(() => {
    if (servicesData) {
      setServices(servicesData);
    }
  }, [servicesData]);

  useEffect(() => {
    if (teethData) {
      setTeeth(teethData);
    }
  }, [teethData]);

  useEffect(() => {
    if (open && initialData) {
      reset(initialData);
    } else if (open) {
      reset({
        service_id: null,
        tooth_or_area: null,
        notes: '',
        estimated_amount: null,
        status: 'Planned',
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = (data: TreatmentPlanFormData) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Controller
            name="service_id"
            control={control}
            rules={{ required: 'Service is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Service"
                fullWidth
                margin="normal"
                error={!!errors.service_id}
                helperText={errors.service_id?.message}
                disabled={servicesLoading}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              >
                {servicesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} />
                    Loading services...
                  </MenuItem>
                ) : (
                  services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.description}
                    </MenuItem>
                  ))
                )}
              </TextField>
            )}
          />

          <Controller
            name="tooth_or_area"
            control={control}
            rules={{ required: 'Tooth/Area is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Tooth/Area"
                fullWidth
                margin="normal"
                error={!!errors.tooth_or_area}
                helperText={errors.tooth_or_area?.message}
                disabled={teethLoading}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              >
                {teethLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} />
                    Loading teeth...
                  </MenuItem>
                ) : (
                  teeth.map((tooth) => (
                    <MenuItem key={tooth.id} value={tooth.id}>
                      {tooth.description || tooth.name || `Tooth ${tooth.id}`}
                    </MenuItem>
                  ))
                )}
              </TextField>
            )}
          />

          <Controller
            name="estimated_amount"
            control={control}
            rules={{
              min: { value: 0, message: 'Amount must be positive' }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Estimated Amount"
                type="number"
                fullWidth
                margin="normal"
                error={!!errors.estimated_amount}
                helperText={errors.estimated_amount?.message}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notes"
                multiline
                rows={3}
                fullWidth
                margin="normal"
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Status"
                fullWidth
                margin="normal"
                value={field.value || 'Planned'}
              >
                <MenuItem value="Planned">Planned</MenuItem>
                <MenuItem value="Ongoing">Ongoing</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(handleFormSubmit)} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TreatmentPlanForm;