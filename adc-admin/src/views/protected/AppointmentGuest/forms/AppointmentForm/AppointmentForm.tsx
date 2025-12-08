import React, { useEffect, useState, useMemo } from 'react';
import {  
  Container,
  Typography,
  Box,
  Stack,
  FormControlLabel,
  Checkbox,
  Switch
} from '@mui/material';
import dayjs from 'dayjs';
import {Controller, useFormContext } from 'react-hook-form';
import Loader from 'components/loader';
import FormInput from 'components/hookFormControls/InputField';
import DropDownField from 'components/hookFormControls/DropDownField';
import useGet from 'services/hooks/useGet';
import RenderDaysDatePickerField from 'components/hookFormControls/RenderDaysDatePickerField';
import ErrorAlert from 'components/Dialog/ErrorAlert';
import FormCheckbox from 'components/hookFormControls/FormCheckBox';
import TimeSlotGenerator from 'components/hookFormControls/TimeSlotGenerator';
import { format } from 'date-fns';



interface GuestFields {
    firstName : string;
    lastName : string;
    mobileNumber: string;
    serviceId: number;
    appointmentDate: dayjs.Dayjs | null;
    appointmentTimeSlots: { startTime: string; endTime: string } | null;
    status: string;    
}

interface Internal {
  id : number;
  method: string;
  isSendSMS: boolean;
}

interface FormData {
    guestFields : GuestFields;    
    internal : Internal;
}

type DurationOption={
  id: number;
  description: string;
  duration: number;
}

interface WorkingHour {
  from_time: string; 
  to_time: string; 
}

// Helper function to convert WorkingHour format to TimeSlotGenerator format
const convertWorkingHourFormat = (workingHour: WorkingHour) => {
  const convertTimeFormat = (timeStr: string): string => {
    if (!timeStr) return '09:00';
    
    // Remove spaces and convert to lowercase for easier parsing
    const cleanTime = timeStr.trim().toLowerCase();
    
    // Check if it's already in 24-hour format (contains no AM/PM)
    if (!cleanTime.includes('am') && !cleanTime.includes('pm')) {
      // Assume it's already in HH:MM format, just ensure it's properly formatted
      const [hours, minutes] = cleanTime.split(':');
      return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
    }
    
    // Parse 12-hour format
    const timeMatch = cleanTime.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)/);
    if (!timeMatch) return '09:00'; // fallback
    
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridian = timeMatch[3];
    
    // Convert to 24-hour format
    if (meridian === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridian === 'am' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return {
    start: convertTimeFormat(workingHour.from_time),
    end: convertTimeFormat(workingHour.to_time)
  };
};

const AppointmentForm: React.FC = () => {    
    const [serviceOption, setServiceOption] = useState<DurationOption[]>([]);
    const [statusOptions, setStatusOptions] = useState<{id: string, description: string}[]>([]);
    const [daysAppointment, setDaysAppointment] = useState<string[]>([]);
    const [WorkingHour, setWorkingHour] = useState<WorkingHour>({ from_time: "9:00 AM", to_time: "5:00 PM" });
    const [errorAlertOpen, setErrorAlertOpen] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState("");
    const [duration, setDuration] = useState(0);
    const [defaultTime, setDefaultTime] = useState<any>(null);
    const [showOccupied, setShowOccupied] = useState(true);

    const { control, formState, formState: { errors }, getValues, setValue, trigger, watch, resetField, reset } = useFormContext<FormData>();

    // Consolidate all watch calls into a single watch to prevent multiple subscriptions
    const watchedValues = watch([
      'internal.id',
      'guestFields.appointmentDate',
      'guestFields.serviceId',
      'guestFields.appointmentTimeSlots',
      'guestFields.status'
    ]);

    // Destructure watched values with memoization to prevent unnecessary re-renders
    const [internalId, selectedAppointmentDate, serviceId, appointmentTimeSlots, guestStatus] = watchedValues; 

    // Determine if form should be readonly (edit mode with past appointment date)
    const isReadOnly = useMemo(() => {
      return Boolean(internalId) && selectedAppointmentDate !== null && dayjs(selectedAppointmentDate).isBefore(dayjs(), 'day');
    }, [internalId, selectedAppointmentDate]); 


  const handleError = (error: any) => {
    // Extract a user-friendly error message
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
};

const handleCloseAlert = () => {
  setErrorAlertOpen(false);
};

  const {data, isFetching, refetch: refetchData } = useGet({
    endpoint: 'guest/get', 
    param: {p_id : internalId},
    querykey:'get-guest-appointment-item',
    onErrorCallback: handleError,
  });


  const {data: serviceData, isFetching: serviceIsFetching } = useGet({
    endpoint: 'service/getall', 
    param: {},
    querykey:'get-service-list'
  });

  const {data: daysData, isFetching: daysIsFetching } = useGet({
    endpoint: 'appointment/getdays', 
    param: {},
    querykey:'get-appointmentdays-list'
  });

  // Memoize appointment date string to prevent unnecessary re-renders
  const memoizedAppointmentDateString = useMemo(() => {
    return selectedAppointmentDate ? dayjs(selectedAppointmentDate).format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD');
  }, [selectedAppointmentDate]);

  const memoizedApiParams = useMemo(() => ({
    occupiedSlots: {
      date: memoizedAppointmentDateString
    }
  }), [memoizedAppointmentDateString]);

  
  const {data: OccupiedSlotsData, isFetching: OccupiedSlotsIsFetching, refetch: refetchOccupiedSlots } = useGet({
    endpoint: 'guest/getOccupiedSlots', 
    param: memoizedApiParams.occupiedSlots,
    querykey:'get-guest-occupiedslots'
  });

  useEffect(()=>{
    if (serviceData) {      
        setServiceOption(serviceData)        
    }
  },[serviceData])


  useEffect(()=>{
    if (daysData) {
      const _appointment = daysData.map((item:any) =>dayjs(item.appointment_days).format('YYYY-MM-DD'));
      setDaysAppointment(_appointment)        
      
    }
  },[daysData])


  useEffect(()=>{
    if (data) {         
      // Use reset to properly set default values for dirty tracking
      reset({
        guestFields: {
          firstName: data.first_name,
          lastName: data.last_name,
          mobileNumber: data.mobile_number,
          serviceId: data.service_id,
          appointmentDate: dayjs(data.appointment_date.toString()),
          appointmentTimeSlots: JSON.parse(data.appointment_time_slot),
          status: data.status
        },
        internal: {
          id: data.id,
          method: 'update',
          isSendSMS: false
        }
      }, { keepDirtyValues: false });
      setDefaultTime(JSON.parse(data.appointment_time_slot));            
    }
  },[data, reset])

  // Set showOccupied to true for both editing and new modes (show occupied slots by default)
  useEffect(() => {
    if (internalId) {
      setShowOccupied(true);
    } else {
      // For new appointments, show occupied slots by default
      setShowOccupied(true);
    }
  }, [internalId]);

  // Refetch occupied slots and clear selected time slots when appointment date changes
  useEffect(() => {
    if (!selectedAppointmentDate) return;

    const isEditMode = Boolean(internalId && data?.appointment_date);
    let isSameAsOriginalDate = false;

    if (isEditMode && data?.appointment_date) {
      isSameAsOriginalDate = dayjs(selectedAppointmentDate).isSame(
        dayjs(data.appointment_date),
        'day'
      );
    }

    if (!isEditMode || !isSameAsOriginalDate) {
      // Only clear when creating a new appointment or when the user actually changed the date
      resetField('guestFields.appointmentTimeSlots', { defaultValue: null });
      setDefaultTime(null);
    }

    refetchOccupiedSlots();
  }, [selectedAppointmentDate, internalId, data?.appointment_date, refetchOccupiedSlots, resetField]);


  // Memoize service selection to prevent unnecessary re-renders
  const selectedService = useMemo(() => {
    return serviceId ? serviceOption.find((item) => item.id === serviceId) : null;
  }, [serviceId, serviceOption]);

  useEffect(() => {
    if (selectedService) {            
      setDuration(selectedService.duration || 0);
      // Only reset time slots for new appointments, not when editing existing ones
      if (!internalId) {
        //setValue('guestFields.appointmentTimeSlots', null); // Reset time slots when service changes
      }
      refetchOccupiedSlots();
      
    }
  }, [selectedService, setValue, refetchOccupiedSlots, internalId]);

// useEffect(() => {
//   if (appointmentTimeSlots) {
//     console.log('appointmentTimeSlots updated:', appointmentTimeSlots);
//   }
// }, [appointmentTimeSlots]);

  useEffect(() => {
  // Initialize form values with defaults to avoid uncontrolled/controlled switches
  if (!internalId) { // Only set defaults for new appointments
    setValue('guestFields.appointmentDate', dayjs());
  }
}, []);

  // Initialize status options
  useEffect(() => {
    setStatusOptions([
      { id: 'pending', description: 'Pending' },
      { id: 'confirmed', description: 'Confirmed' },
      { id: 'cancelled', description: 'Cancelled' },
      { id: 'missed', description: 'Missed' },
      { id: 'treated', description: 'Treated' }
    ]);
  }, []);

  
  // Memoize bookings data to prevent unnecessary re-renders
  const memoizedBookings = useMemo(() => {
    if (!OccupiedSlotsData) return [];
    
    return OccupiedSlotsData.map((item: any) => {
      try {
        const parsed = JSON.parse(item.slot_code);
        // Convert backend format {startTime: "11:00", endTime: "11:15"} to bookings format
        if (parsed && typeof parsed === 'object' && parsed.startTime && parsed.endTime) {
          return {
            start: parsed.startTime,
            end: parsed.endTime
          };
        }
        // Handle legacy format if needed
        return { start: '09:00', end: '09:15' };
      } catch (e) {
        console.error('Error parsing slot_code for bookings:', e);
        return { start: '09:00', end: '09:15' };
      }
    });
  }, [OccupiedSlotsData]);

  // Memoize dropdown options to prevent re-creation on every render
  const memoizedServiceOptions = useMemo(() => {
    return serviceOption.map((o: any) => ({
      id: o.id, 
      description: `${o.description} - (${o.duration.toString()} mins duration)`
    }));
  }, [serviceOption]);

  const memoizedStatusOptions = useMemo(() => {
    return statusOptions.map((o: any) => ({
      id: o.id, 
      description: o.description
    }));
  }, [statusOptions]);

  const memoizedFieldErrors = useMemo(() => {
    return errors?.guestFields?.appointmentTimeSlots;
  }, [errors?.guestFields?.appointmentTimeSlots]);

  
  return (
    
        <Container sx={{width:'800px'}}>
          {
            (isFetching && serviceIsFetching && daysIsFetching ) ? <Loader/> :
          <Box mt={0}>
             <Typography variant="h6" component="h1" gutterBottom>
                    Guest Appointment
                  </Typography>
                  
                  <FormInput
                    name="guestFields.firstName"
                    label="First Name"
                    control={control}
                    errors={errors.guestFields?.firstName}
                    rules={{ required: 'First name is required' }}
                    isDisabled={isReadOnly}
                  />

                  <FormInput
                    name="guestFields.lastName"
                    label="Last Name"
                    control={control}
                    errors={errors.guestFields?.lastName}
                    rules={{ required: 'Last name is required' }}
                    isDisabled={isReadOnly}
                  />

                  <FormInput
                    name="guestFields.mobileNumber"
                    label="Mobile Number"
                    control={control}
                    errors={errors.guestFields?.mobileNumber}
                    rules={{ 
                      required: 'Mobile number is required',
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: 'Please enter a valid 10-digit mobile number'
                      }
                    }}
                    isDisabled={isReadOnly}
                  />


            <DropDownField
              name="guestFields.serviceId"
              label="Select Service"
              control={control}
              options={memoizedServiceOptions}
              defaultValue=""
              isDisabled={isReadOnly}
            />

            <Typography variant="h6" gutterBottom sx={{mt:2}}>
                    Select Appointment Slots
            </Typography>
            <Stack direction="row" gap={2} sx={{marginLeft:0, marginRight:0, mt:2}} >          
                <Stack direction="column" spacing={1}>
                <RenderDaysDatePickerField
                  name="guestFields.appointmentDate"
                  control={control}
                  label="Select a Date"
                  errors={errors}
                  appointmentDays={daysAppointment}
                  isTextBoxDisabled
                  isDisabled={isReadOnly}
                />
                </Stack>
              <Stack direction="column" spacing={1} display={'flex'} justifyContent={'start'} alignContent={'center'}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showOccupied}
                        onChange={(e) => setShowOccupied(e.target.checked)}
                        color="primary"
                        disabled={isReadOnly}
                      />
                    }
                    label="Show occupied slots"
                  />
                </Box>
                <Box sx={{ 
                  pointerEvents: isReadOnly ? 'none' : 'auto', 
                  opacity: isReadOnly ? 0.5 : 1,
                  transition: 'opacity 0.2s'
                }}>
                <TimeSlotGenerator
                  key={selectedAppointmentDate ? dayjs(selectedAppointmentDate).format('YYYY-MM-DD') : 'no-date'}
                  name={"guestFields.appointmentTimeSlots"}
                  control={control}
                  label={"Available Time Slots"}
                  serviceDuration={Number(duration) || 15}
                  bufferTime={0}
                  workingHours={WorkingHour.from_time && WorkingHour.to_time 
                                ? convertWorkingHourFormat(WorkingHour) 
                                : null}
                  bookings={memoizedBookings}
                  errors={errors}
                  rules={{ required: 'Please select at least one time slot' }}
                  multiple={true}
                  defaultValue={defaultTime}
                  showOccupied={showOccupied}
                  currentSlots={data ? JSON.parse(data.appointment_time_slot) : null}
                  slotRange={15}
                  selectedDate={selectedAppointmentDate ? dayjs(selectedAppointmentDate).toDate() : null}
                  originalAppointmentDate={data ? dayjs(data.appointment_date).toDate() : null}
                />
                </Box>
              </Stack>
                  
              </Stack>

              <DropDownField
                name="guestFields.status"
                label="Select Status"
                control={control}
                options={memoizedStatusOptions}
                isDisabled={Boolean(internalId) ? isReadOnly : true}
              />

              <FormCheckbox
                name="internal.isSendSMS"
                label="Send notification to the guest."
                control={control}
              />


          </Box>
          
        }
            <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />
      </Container>

  );
};

export default AppointmentForm;
