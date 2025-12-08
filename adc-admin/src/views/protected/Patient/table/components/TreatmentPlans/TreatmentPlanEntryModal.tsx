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
  Autocomplete,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { TreatmentPlanEntryFormData, EntryStatus, Procedure, Dentist } from './types';
import useGet from 'services/hooks/useGet';
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';


interface SelectionOption {
  id: string | number;
  description: string;
}

interface Option {
  id: number;
  description: string;
  tooth_options: SelectionOption[];
}

interface ToothOption {
  description: string;
  id: number;
}

// interface SelectionOption {
//   description: string;
//   id: string;
// }

interface DentalRecordItem {
  id: number;
  treatment: string;
  groupType: string;
  tooth: string;
  patientId: number;  
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


interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TreatmentPlanEntryFormData) => void;
  initialData?: TreatmentPlanEntryFormData;
  title: string;
  readOnly?: boolean;
}

const TreatmentPlanEntryModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
  readOnly = false,
}) => {
  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TreatmentPlanEntryFormData>({
    defaultValues: {
      tooth_code: '',
      procedure_id: 0,
      group_type_id: 0,
      notes: '',
      estimated_cost: 0,
      dentist_id: undefined,
      status: 'Planned',
      performed_date: '',
      invoice_id: undefined,
    },
  });
  const theme = useTheme();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [teeth, setTeeth] = useState<any[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  //const [selectedTooth, setSelectedTooth] = useState<any | null>(null);
  const [selectedDentist, setSelectedDentist] = useState<Dentist | null>(null);


  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
    const [selectedGroupType, setSelectedGroupType] = useState<string>('');
    const [selectedToothSelect, setSelectedToothSelect] = useState<string>('');
    const [selectedTooth, setSelectedTooth] = useState<any | null>(null);
  

  // Fetch procedures
  const { data: proceduresData } = useGet({
    endpoint: 'treatment/getall',
    param: {},
    querykey: 'get-procedures-list',
  });

  // Fetch tooth/area options
  const { data: toothData} = useGet({
    endpoint: 'dental/getteethlist',
    param: {},
    querykey: 'get-teeth-list',
  });

  // Fetch dentists
  const { data: dentistsData } = useGet({
    endpoint: 'dentist/getall',
    param: {},
    querykey: 'get-dentists-list',
  });

  useEffect(() => {
    if (proceduresData) {
      //console.log('Fetched procedures data:', proceduresData);
      // Filter out procedures with missing IDs and ensure unique IDs
      const validProcedures = proceduresData.filter((proc: any) => 
        proc && (proc.id || proc.procedure_id || proc.service_id) && (proc.description || proc.name || proc.service_name)
      );
      setProcedures(validProcedures);
    }
  }, [proceduresData]);

  useEffect(() => {
    if (dentistsData) {
      setDentists(dentistsData);
    }
  }, [dentistsData]);

  useEffect(() => {
    if (toothData) {
      //console.log('Fetched teeth data:', toothData);
      setTeeth(toothData);
    }
  }, [toothData]);

  useEffect(() => {
    if (initialData) {
      // Format performed_date if it exists
      const formattedData = {
        ...initialData,
        performed_date: initialData.performed_date 
          ? dayjs(initialData.performed_date).format('YYYY-MM-DD')
          : '',
      };
      reset(formattedData);
      // Find and set selected procedure
      const proc = procedures.find(p => 
        (p.id || p.procedure_id || p.service_id) === initialData.procedure_id
      );
      if (proc) {
        setSelectedProcedure(proc);
      }
      // Find and set selected tooth
      const tooth = teeth.find(t => 
        String(t.teeth_number) === String(initialData.tooth_code)
      );
      if (tooth) {
        setSelectedTooth(tooth);
      }
      // Find and set selected dentist
      const dentist = dentists.find(d => 
        (d.dentist_id || d.id) === initialData.dentist_id
      );
      if (dentist) {
        setSelectedDentist(dentist);
      }
      // Set select states
      setSelectedTreatment(String(initialData.procedure_id));
      setSelectedGroupType(String(initialData.group_type_id));
      setSelectedToothSelect(initialData.tooth_code);
    } else {
      reset({
        tooth_code: '',
        procedure_id: 0,
        group_type_id: 0,
        notes: '',
        estimated_cost: 0,
        dentist_id: undefined,
        status: 'Planned',
        performed_date: '',
        invoice_id: undefined,
      });
      setSelectedProcedure(null);
      setSelectedTooth('');
      setSelectedDentist(null);
      setSelectedTreatment('');
      setSelectedGroupType('');
      setSelectedToothSelect('');
    }
  }, [initialData, reset, open, procedures, teeth, dentists]);

  const handleFormSubmit = (data: TreatmentPlanEntryFormData) => {
    onSubmit(data);
    onClose();
  };

  const entryStatuses: EntryStatus[] = ['Planned', 'On-Going', 'Performed', 'Cancelled', 'Invoiced'];

  const handleProcedureChange = (procedure: Procedure | null) => {
    setSelectedProcedure(procedure);
    if (procedure) {
      const procedureId = procedure.id || procedure.procedure_id || procedure.service_id || 0;
      setValue('procedure_id', procedureId);
      if (procedure.base_cost && !initialData) {
        setValue('estimated_cost', procedure.base_cost);
      }
    } else {
      setValue('procedure_id', 0);
    }
  };

  const handleToothChange = (tooth: any | null) => {
    setSelectedTooth(tooth);
    if (tooth) {
      const toothNumber = String(tooth.teeth_number || '');
      setValue('tooth_code', toothNumber);
    } else {
      setValue('tooth_code', '');
    }
  };

  const handleDentistChange = (dentist: Dentist | null) => {
    setSelectedDentist(dentist);
    if (dentist) {
      const dentistId = dentist.dentist_id || dentist.id;
      setValue('dentist_id', dentistId);
    } else {
      setValue('dentist_id', undefined);
    }
  };

const handleTreatmentChange = (value: string) => {
    setSelectedTreatment(value);
    setValue('procedure_id', Number(value) || 0);
    setSelectedGroupType('');
    setSelectedToothSelect('');
  };

  const handleGroupTypeChange = (value: string) => {
    setSelectedGroupType(value);
    setValue('group_type_id', Number(value) || 0);
    setSelectedToothSelect('');
  };

  const handleToothSelectChange = (value: string) => {
    setSelectedToothSelect(value);
    setValue('tooth_code', value);
  };


  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>


          <Box>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Controller
                name="procedure_id"
                control={control}
                rules={{ required: 'Treatment is required' }}
                render={({ fieldState }) => (
                  <TextField
                    label="Treatment"
                    select
                    fullWidth
                    value={selectedTreatment}
                    onChange={(e) => handleTreatmentChange(e.target.value)}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  >
                    <MenuItem value="">Select Treatment...</MenuItem>
                    {procedures.map((treatment: Procedure) => (
                      <MenuItem key={treatment.id} value={treatment.id}>
                        {treatment.description}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {selectedTreatment && (
                <Controller
                  name="group_type_id"
                  control={control}
                  rules={{ required: selectedTreatment ? 'Group Type is required' : false }}
                  render={({ fieldState }) => (
                    <TextField
                      label="Group Type"
                      select
                      fullWidth
                      value={selectedGroupType}
                      onChange={(e) => handleGroupTypeChange(e.target.value)}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    >
                      <MenuItem value="">Select Option...</MenuItem>
                      {(procedures.find((t: Procedure) => t.id === Number(selectedTreatment)) as any)
                        ?.tooth_options?.map((option: SelectionOption) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.description}
                        </MenuItem>
                        ))}
                    </TextField>
                  )}
                />
              )}

              {selectedGroupType && (
                <Controller
                  name="tooth_code"
                  control={control}
                  rules={{ required: selectedGroupType ? 'Tooth Selection is required' : false }}
                  render={({ fieldState }) => (
                    <TextField
                      label="Tooth Selection"
                      select
                      fullWidth
                      value={selectedToothSelect}
                      onChange={(e) => handleToothSelectChange(e.target.value)}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    >
                      <MenuItem value="">Select Tooth...</MenuItem>
                      {getTeethTypeOptions(Number(selectedGroupType)).map((tooth) => (
                        <MenuItem key={tooth.id} value={tooth.id}>
                          {tooth.description}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              )}
            </div>

          </Box>


            <Controller
              name="notes"
              control={control}
              rules={{ required: 'Notes are required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Notes"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder={readOnly ? '' : "Additional notes..."}
                  error={!!errors.notes}
                  helperText={errors.notes?.message}
                  InputProps={{ readOnly: readOnly }}
                />
              )}
            />

            <Controller
              name="estimated_cost"
              control={control}
              rules={{ 
                required: 'Estimated cost is required',
                min: { value: 0, message: 'Cost must be positive' }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Estimated Cost"
                  type="number"
                  fullWidth
                  error={!!errors.estimated_cost}
                  helperText={errors.estimated_cost?.message}
                  onWheel={(e) => e.currentTarget.blur()}
                  InputProps={{
                    startAdornment: <span style={{ marginRight: 8 }}>₱</span>,
                    readOnly: readOnly,
                  }}
                />
              )}
            />

            <Controller
              name="dentist_id"
              control={control}
              rules={{ required: 'Assigned Dentist is required' }}
              render={({ fieldState }) => (
                <Autocomplete
                  options={dentists}
                  getOptionLabel={(option) => option.full_name || option.name || 'Unknown Dentist'}
                  value={selectedDentist}
                  onChange={(_, newValue) => handleDentistChange(newValue)}
                  readOnly={readOnly}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned Dentist"
                      placeholder={readOnly ? '' : 'Search and select a dentist'}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        ...params.InputProps,
                        readOnly: readOnly,
                      }}
                    />
                  )}
                  isOptionEqualToValue={(option, value) => {
                    const optionId = option.dentist_id || option.id;
                    const valueId = value.dentist_id || value.id;
                    return optionId === valueId;
                  }}
                  getOptionKey={(option) => `dentist-${option.dentist_id || option.id}`}
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status is required' }}
              render={({ field }) => (
                <TextField
                  label="Status"
                  select={!readOnly && !!initialData}
                  fullWidth
                  value={field.value || ''}
                  onChange={(e) => {
                    console.log('Status selected:', e.target.value);
                    field.onChange(e.target.value);
                  }}
                  error={!!errors.status}
                  helperText={errors.status?.message}
                  disabled={readOnly || !initialData}
                >
                  {!readOnly && !!initialData && entryStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="performed_date"
              control={control}
              rules={{ required: 'Performed Date is required' }}
              render={({ field }) => {
                // Format the date value for the input (YYYY-MM-DD format required)
                const formattedValue = field.value 
                  ? (field.value.includes('T') 
                      ? dayjs(field.value).format('YYYY-MM-DD')
                      : field.value)
                  : '';

                return (
                  <TextField
                    label="Performed Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={formattedValue}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    inputRef={field.ref}
                    error={!!errors.performed_date}
                    helperText={errors.performed_date?.message}
                    InputProps={{ readOnly: readOnly }}
                  />
                );
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && (
            <Button type="submit" variant="contained" color="primary">
              Save Entry
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TreatmentPlanEntryModal;

