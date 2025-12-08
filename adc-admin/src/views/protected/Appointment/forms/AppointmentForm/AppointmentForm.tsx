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
import Loader from '../../../../../components/loader';
import RadioGroupField from 'components/hookFormControls/RadioGroupFieldProps';
import DatePickerField from 'components/hookFormControls/DatePicker';
import FormInput from 'components/hookFormControls/InputField';
import DropDownField from 'components/hookFormControls/DropDownField';
import useGet from 'services/hooks/useGet';
import TimeSlotPicker from 'components/hookFormControls/TimeSlotPicker';
import StaticDatePickerField from 'components/hookFormControls/StaticDatePicker';
import RenderDaysDatePickerField from 'components/hookFormControls/RenderDaysDatePickerField';
import ErrorAlert from 'components/Dialog/ErrorAlert';
import FormCheckbox from 'components/hookFormControls/FormCheckBox';
import TimeSlotPickerFlexi from 'components/hookFormControls/TimeSlotPickerFlexi';
import { json } from 'stream/consumers';
import { Console } from 'console';
import { a } from '@react-spring/web';
import TimeSlotGenerator from 'components/hookFormControls/TimeSlotGenerator';



interface AppointmentFields {
    patientId : number;
    dentistId : number;
    treatmentId: number;
    appointmentDate: dayjs.Dayjs | null;
    appointmentTimeSlots: { startTime: string; endTime: string } | null;
    appointmentStatusId: number;    
}

interface Internal {
  id : number;
  method: string;
  isSendSMS: boolean;
}

interface FormData {
    appointmentFields : AppointmentFields;    
    internal : Internal;
}

type Option={
    id: number;
    description: string;
    duration: number;
}

type DurationOption={
  id: number;
  description: string;
  duration: number;
}

type TimeSlotOption = {
  code: string[];  
}


// type DentistOption={
//     id: number;
//     description: string;
// }

interface WorkingHour {
  from_time: string; 
  to_time: string; 
}

interface TimeInterval {  
  code: string; 
  description: string; 
  isAvailable: boolean; 
  slot: number
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

// Helper function to convert time slots array to startTime/endTime object
const convertSlotsToTimeRange = (slots: string[]): { startTime: string; endTime: string } | null => {
  if (!slots || slots.length === 0) return null;
  
  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (timeStr: string): string => {
    const cleanTime = timeStr.trim().toLowerCase();
    if (!cleanTime.includes('am') && !cleanTime.includes('pm')) {
      return cleanTime; // Already in 24-hour format
    }
    
    const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
    if (!timeMatch) return '09:00';
    
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const meridian = timeMatch[3];
    
    if (meridian === 'pm' && hours !== 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  // Sort slots and convert to 24-hour format
  const converted24HourSlots = slots.map(convertTo24Hour).sort();
  
  return {
    startTime: converted24HourSlots[0],
    endTime: converted24HourSlots[converted24HourSlots.length - 1]
  };
};

const generateTimeIntervals = (startTime: string, endTime: string): TimeInterval[] => {
  const intervals: TimeInterval[] = [];
  
  // Helper function to parse time into a Date object
  const parseTime = (timeStr: string): Date => {
    const [time, meridian] = timeStr.split(/(AM|PM)/);
    let [hours, minutes] = time.split(":").map(Number);
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return new Date(2025, 0, 1, hours, minutes);
  };

  let currentTime = parseTime(startTime);
  const endTimeObj = parseTime(endTime);

  while (currentTime <= endTimeObj) {
    const nextTime = new Date(currentTime);
    nextTime.setMinutes(nextTime.getMinutes() + 30);

    // Stop loop once we exceed the ending time
    if (nextTime > endTimeObj) break;

    intervals.push({
      code: currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) + '-' + nextTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      description: currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) + '-' + nextTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      isAvailable: true,
      slot: intervals.length + 1,
    });

    currentTime = nextTime;
  }

  return intervals;
};

const AppointmentForm: React.FC = () => {    
    const [timeSlotOption, setTimeSlotOption] = useState<TimeSlotOption[]>([]);
    const [patientOption, setPatientOption] = useState<Option[]>([]);
    const [dentistOption, setDentistOption] = useState<Option[]>([]);
    const [treatmentOption, setTreatmentOption] = useState<DurationOption[]>([]);
    const [statusOption, setStatusOption] = useState<Option[]>([]);
    const [daysAppointment, setDaysAppointment] = useState<string[]>([]);
    const [DentistWorkingHour, setDentistWorkingHour] = useState<TimeInterval[]>([]);
    const [WorkingHour, setWorkingHour] = useState<WorkingHour>({ from_time: "", to_time: "" });
    const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
    const [appointmentSlots, setAppointmentSlots] = useState<string[]>([]);
    const [errorAlertOpen, setErrorAlertOpen] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState("");
    const [duration, setDuration] = useState(0);
    const [defaultTime, setDefaultTime] = useState<any>(null);
    const [showOccupied, setShowOccupied] = useState(true);
    const [isRefetchingSlots, setIsRefetchingSlots] = useState(false);

    const { control, formState: { errors }, getValues, setValue, trigger, watch, resetField } = useFormContext<FormData>();

    // Consolidate all watch calls into a single watch to prevent multiple subscriptions
    const watchedValues = watch([
      'internal.id',
      'appointmentFields.appointmentDate',
      'appointmentFields.dentistId',
      'appointmentFields.treatmentId',
      'appointmentFields.appointmentTimeSlots'
    ]);

    // Destructure watched values with memoization to prevent unnecessary re-renders
    const [internalId, selectedAppointmentDate, selectedDentist, treatmentId, appointmentTimeSlots] = watchedValues; 

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
    endpoint: 'appointment/get', 
    param: {p_id : internalId},
    querykey:'get-appointment-item',
    onErrorCallback: handleError,
  });

  const {data: dataTimeSlots, isFetching: isFetchingTimeSlots, refetch } = useGet({
    endpoint: 'appointment/getslots', 
    param: {appointmentDate : selectedAppointmentDate? dayjs(selectedAppointmentDate).format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD')},
    querykey:'get-appointment-slots'
  });

  const {data: patientData, isFetching: patientIsFetching } = useGet({
    endpoint: 'patient/getall', 
    param: {},
    querykey:'get-patient-list'
  });
  
  const {data: dentistData, isFetching: dentistIsFetching } = useGet({
    endpoint: 'dentist/getlist', 
    param: {},
    querykey:'get-dentist-list'
  });

  // const {data: treatmentData, isFetching: treatmentIsFetching } = useGet({
  //   endpoint: 'treatment/getall', 
  //   param: {},
  //   querykey:'get-treatment-list'
  // });


  const {data: treatmentData, isFetching: treatmentIsFetching } = useGet({
    endpoint: 'service/getall', 
    param: {},
    querykey:'get-service-list'
  });

  const {data: statusData, isFetching: statusIsFetching } = useGet({
    endpoint: 'appointment/getstat', 
    param: {},
    querykey:'get-status-list'
  });

  const {data: daysData, isFetching: daysIsFetching } = useGet({
    endpoint: 'appointment/getdays', 
    param: {},
    querykey:'get-appointmentdays-list'
  });

  // Memoize selected dentist to prevent unnecessary re-renders
  const memoizedSelectedDentist = useMemo(() => {
    return selectedDentist || 0;
  }, [selectedDentist]);

  // Memoize appointment date string to prevent unnecessary re-renders
  const memoizedAppointmentDateString = useMemo(() => {
    return selectedAppointmentDate ? dayjs(selectedAppointmentDate).format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD');
  }, [selectedAppointmentDate]);

  const memoizedApiParams = useMemo(() => ({
    workingHour: {
      id: memoizedSelectedDentist, 
      appointmentDate: memoizedAppointmentDateString
    },
    occupiedSlots: {
      date: memoizedAppointmentDateString, 
      dentistId: memoizedSelectedDentist
    }
  }), [memoizedSelectedDentist, memoizedAppointmentDateString]);

  const {data: workingHourData, isFetching: workingHourIsFetching } = useGet({
    endpoint: 'dentist/getWorkingHour', 
    param: memoizedApiParams.workingHour,
    querykey:'get-dentist-workinghour'
  });

  
  const {data: OccupiedSlotsData, isFetching: OccupiedSlotsIsFetching, refetch: refetchOccupiedSlots } = useGet({
    endpoint: 'appointment/getOccupiedSlots', 
    param: memoizedApiParams.occupiedSlots,
    querykey:'get-occupiedslots'
  });

  useEffect(()=>{
    if (patientData) {
        setPatientOption(patientData)        
    }
  },[patientData])

  useEffect(()=>{
    if (dentistData) {
      console.log('dentistData', dentistData);
        setDentistOption(dentistData)        
    }
  },[dentistData])

  useEffect(()=>{
    if (treatmentData) {      
        setTreatmentOption(treatmentData)        
    }
  },[treatmentData])

  useEffect(()=>{
    if (statusData) {
      setStatusOption(statusData)        
    }
  },[statusData])


  useEffect(()=>{
    if (daysData) {
      const _appointment = daysData.map((item:any) =>dayjs(item.appointment_days).format('YYYY-MM-DD'));
      setDaysAppointment(_appointment)        
      
    }
  },[daysData])


  useEffect(()=>{
    if (workingHourData) {
      setWorkingHour(workingHourData)
      console.log('workingHourData', workingHourData);
      console.log('converted working hours:', convertWorkingHourFormat(workingHourData));
    }
  },[workingHourData])

  useEffect(() => {
    if (memoizedSelectedDentist && selectedAppointmentDate) { 
      // Generate fixed time intervals from 9:00 AM to 5:00 PM
      const timeIntervals = generateTimeIntervals('9:00 AM', '5:00 PM');
      setDentistWorkingHour(timeIntervals);
    }
  }, [memoizedSelectedDentist, selectedAppointmentDate]);

  useEffect(() => {    
    if (DentistWorkingHour.length > 0) {
      //FilterOccupiedSlots();  
    }    
  }, [DentistWorkingHour]); // Add internalId to dependencies to recalculate on edit mode


  // useEffect(() => {    
  //   if (internalId && OccupiedSlotsData) {
  //     console.log('selectedAppointmentDate', selectedAppointmentDate)
  //     console.log('INTERNAL ID', internalId)
  //     console.log('OccupiedSlotsData', OccupiedSlotsData)
  //     //FilterOccupiedSlots();  
  //   }    
  // }, [internalId, selectedAppointmentDate, OccupiedSlotsData]); // Add internalId to dependencies to recalculate on edit mode


  useEffect(()=>{
    if (data) { 
      console.log('Fetched appointment data:', data);     
      resetField('internal.isSendSMS')
      setValue('appointmentFields.patientId', data.patient_id);
      setValue('appointmentFields.dentistId', data.dentist_id);
      setValue('appointmentFields.treatmentId', data.service_id);      
      setValue('appointmentFields.appointmentDate', dayjs(data.appointment_date.toString())); 
      setValue('appointmentFields.appointmentTimeSlots', JSON.parse(data.code)); 
      setValue('appointmentFields.appointmentStatusId', data.status_id);
      setDefaultTime(JSON.parse(data.code));            
    }
  },[data])

  // Set showOccupied to true for both editing and new modes (show occupied slots by default)
  useEffect(() => {
    if (internalId) {
      setShowOccupied(true);
    } else {
      // For new appointments, show occupied slots by default
      setShowOccupied(true);
    }
  }, [internalId]);

  // Refetch occupied slots when date or dentist changes (combined to prevent double refetch)
  useEffect(() => {
    if (selectedAppointmentDate && selectedDentist) {
      // console.log('Date/Dentist changed, refetching occupied slots for:', {
      //   date: dayjs(selectedAppointmentDate).format('YYYY-MM-DD'),
      //   dentist: selectedDentist
      // });
      
      // Clear the selected time slots when date/dentist changes (unless we're in edit mode)
      if (!internalId) {
        resetField('appointmentFields.appointmentTimeSlots', { defaultValue: null });
        setDefaultTime(null);
      }
      
      // Set refetching flag and trigger refetch
      setIsRefetchingSlots(true);
      refetchOccupiedSlots().finally(() => {
        // Small delay to ensure data is ready before clearing the flag
        setTimeout(() => setIsRefetchingSlots(false), 100);
      });
    }
  }, [selectedAppointmentDate, selectedDentist, refetchOccupiedSlots, internalId,  resetField]);

  // Remove redundant useEffect that was causing re-renders
  // selectedDentist is now handled directly through memoizedSelectedDentist


  // Memoize treatment selection to prevent unnecessary re-renders
  const selectedTreatment = useMemo(() => {
    return treatmentId ? treatmentOption.find((item) => item.id === treatmentId) : null;
  }, [treatmentId, treatmentOption]);

  useEffect(() => {
    if (selectedTreatment) {            
      setDuration(selectedTreatment.duration || 0);
      // Only reset time slots for new appointments, not when editing existing ones
      if (!internalId) {
        setValue('appointmentFields.appointmentTimeSlots', null); // Reset time slots when treatment changes
      }
      refetchOccupiedSlots();
      console.log('Duration set to:', selectedTreatment.duration, 'from original:', selectedTreatment.duration);
    }
  }, [selectedTreatment, setValue, refetchOccupiedSlots, internalId]);

useEffect(() => {
  if (appointmentTimeSlots) {
    //setAppointmentSlots(appointmentTimeSlots)
    console.log('appointmentTimeSlots updated:', appointmentTimeSlots);
  }
}, [appointmentTimeSlots]);
// useEffect(() => {
//   if (selectedAppointmentDate) {
//     //console.log('selectedAppointmentDate', selectedAppointmentDate)    
//     //FilterOccupiedSlots();
//   }
// }, [selectedAppointmentDate]);

  useEffect(() => {
  // Initialize form values with defaults to avoid uncontrolled/controlled switches
  if (!internalId) { // Only set defaults for new appointments
    setValue('appointmentFields.appointmentDate', dayjs());
    //setValue('appointmentFields.appointmentTimeSlots', []);
    //setValue('internal.isSendSMS', false);
  }
}, []);



  
  // Memoize bookings data to prevent unnecessary re-renders
  const memoizedBookings = useMemo(() => {
    if (!OccupiedSlotsData) return [];
    
    console.log('Recalculating memoized bookings from OccupiedSlotsData:', OccupiedSlotsData);
    
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

  // Memoize working hours to prevent unnecessary re-renders
  // const memoizedWorkingHours = useMemo(() => {
  //   return WorkingHour.from_time && WorkingHour.to_time 
  //     ? convertWorkingHourFormat(WorkingHour) 
  //     : { start: '09:00', end: '17:00' };
  // }, [WorkingHour.from_time, WorkingHour.to_time]);

  // Memoize service duration to prevent unnecessary re-renders
  // const memoizedServiceDuration = useMemo(() => {
  //   console.log('Recalculating service duration:', duration);
  //   return Number(duration) || 15;
  // }, [duration]);

  // Memoize dropdown options to prevent re-creation on every render
  const memoizedPatientOptions = useMemo(() => {
    return patientOption.map((o: any) => ({
      id: o.id, 
      description: o.full_name
    }));
  }, [patientOption]);

  const memoizedDentistOptions = useMemo(() => {
    return dentistOption.map((o: any) => ({
      id: o.id, 
      description: o.full_name
    }));
  }, [dentistOption]);

  const memoizedTreatmentOptions = useMemo(() => {
    return treatmentOption.map((o: any) => ({
      id: o.id, 
      description: `${o.description} - (${o.duration.toString()} mins duration)`
    }));
  }, [treatmentOption]);

  const memoizedStatusOptions = useMemo(() => {
    return statusOption.map((o: any) => ({
      id: o.id, 
      description: o.description
    }));
  }, [statusOption]);

  // Memoize TimeSlotGenerator props to prevent re-rendering
  // const memoizedTimeSlotProps = useMemo(() => ({
  //   bufferTime: 0,
  //   multiple: false,
  //   rules: { required: 'Please select at least one time slot' },
  //   fieldName: "appointmentFields.appointmentTimeSlots" as const,
  //   label: "Available Time Slots (Alternative)"
  // }), []);

  const memoizedFieldErrors = useMemo(() => {
    return errors?.appointmentFields?.appointmentTimeSlots;
  }, [errors?.appointmentFields?.appointmentTimeSlots]);

//console.log('appointmentDate', getValues('appointmentFields.appointmentDate'), dayjs().format('YYYY-MM-DD'))
//console.log('DentistWorkingHour', DentistWorkingHour)
//console.log('OccupiedSlots', occupiedSlots)
//console.log('treatmentOption', treatmentOption)
//console.log('[FETCH]', memoizedBookings);
  return (
    
        <Container sx={{width:'800px'}}>
          {
            (isFetching && patientIsFetching && dentistIsFetching && treatmentIsFetching && isFetchingTimeSlots && statusIsFetching ) ? <Loader/> :
          <Box mt={0}>
             <Typography variant="h6" component="h1" gutterBottom>
                    Appointment
                  </Typography>
                  

                  <DropDownField
                    name="appointmentFields.patientId"
                    label="Select Patient"
                    control={control}
                    options={memoizedPatientOptions}
                    defaultValue=""
                    isDisabled={Boolean(internalId) || isReadOnly} // Disable in edit mode or when appointment is in the past
                  />

                  <DropDownField
                    name="appointmentFields.dentistId"
                    label="Select Dentist"
                    control={control}
                    options={memoizedDentistOptions}
                    defaultValue=""
                    isDisabled={isReadOnly}
                  />
            


            <DropDownField
              name="appointmentFields.treatmentId"
              label="Select Treatment"
              control={control}
              options={memoizedTreatmentOptions}
              defaultValue=""
              isDisabled={isReadOnly}
            />


            {/* <DatePickerField
                name="appointmentFields.appointmentDate"
                control={control}
                label="Appointment Date"            
                errors={errors}
                onChange={handleDateChange}
              /> */}
            <Typography variant="h6" gutterBottom sx={{mt:2}}>
                    Select Appointment Slots
            </Typography>
            <Stack direction="row" gap={2} sx={{marginLeft:0, marginRight:0, mt:2}} >          
                <Stack direction="column" spacing={1}>
                <RenderDaysDatePickerField
                  name="appointmentFields.appointmentDate"
                  control={control}
                  label="Select a Date"
                  errors={errors}
                  appointmentDays={daysAppointment}
                  isTextBoxDisabled
                  isDisabled={isReadOnly}
                  //defaultValue={dayjs()} // Set the default value to the current date
                />
                {/* <StaticDatePickerField
                  name="appointmentFields.appointmentDate"
                  control={control}
                  label="Appointment Date"
                  errors={errors}
                  requiredMessage="Please select a date"
                  isDisabled={false}
                  isTextBoxDisabled
                /> */}
                </Stack>
                {/* <Stack direction="column" spacing={1} display={'flex'} justifyContent={'start'} alignContent={'center'}>
                  <Box>
                  {DentistWorkingHour.length > 0 ? (
                    <TimeSlotPickerFlexi
                      name="appointmentFields.appointmentTimeSlots"
                      label="Available Time Slots"
                      control={control}
                      options={DentistWorkingHour}
                      durationInMinutes={duration || 0} // this will auto-select slots based on duration in minutes
                      treatmentCode={getValues('appointmentFields.treatmentId')?.toString() || ''}
                      patientId={getValues('appointmentFields.patientId')?.toString() || ''}
                      occupiedSlots={occupiedSlots || []} // Ensure this is always an array
                      selectedDate={getValues('appointmentFields.appointmentDate')?.toDate() || null}
                      rules={{ required: 'Please select at least one available time slot' }}
                      errors={errors}
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary" component="div">
                      No available time slots for the selected dentist.
                    </Typography>
                  )}
                  </Box>
                </Stack> */}
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
                  key={!isRefetchingSlots && selectedAppointmentDate ? dayjs(selectedAppointmentDate).format('YYYY-MM-DD') : 'loading'}
                  name={"appointmentFields.appointmentTimeSlots"}
                  control={control}
                  label={"Available Time Slots (Alternative)"}
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
                  currentSlots={data ? JSON.parse(data.code) : null}
                  slotRange={15}
                  selectedDate={selectedAppointmentDate ? dayjs(selectedAppointmentDate).toDate() : null}
                  originalAppointmentDate={data ? dayjs(data.appointment_date).toDate() : null}
                />
                </Box>
              </Stack>
                  
              </Stack>

              <DropDownField
                name="appointmentFields.appointmentStatusId"
                label="Select Status"
                control={control}
                options={memoizedStatusOptions}
                isDisabled={Boolean(internalId) ? isReadOnly : true}
                //defaultValue=""            
              />

              <FormCheckbox
                name="internal.isSendSMS"
                label="Sent Notification to the patient."
                control={control}
              />

              {/* <Controller
                name="internal.isSendSMS"
                control={control}
                //defaultValue={false}                
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} />}
                    label="Sent Notification to the patient."
                  />
                )}
              /> */}


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
