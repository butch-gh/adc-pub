import React, { useEffect, useState, useMemo } from 'react';
import {  
  Container,
  Typography,
  Box,
  Stack,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
  Divider,  
} from '@mui/material';
import dayjs from 'dayjs';
import {FormProvider, useForm, useFormContext } from 'react-hook-form';
import RadioGroupField from 'components/hookFormControls/RadioGroupFieldProps';
import DatePickerField from 'components/hookFormControls/DatePicker';
import FormInput from 'components/hookFormControls/InputField';
import DropDownField from 'components/hookFormControls/DropDownField';
import useGet from 'services/hooks/useGet';
import TimeSlotPicker from 'components/hookFormControls/TimeSlotPicker';
import StaticDatePickerField from 'components/hookFormControls/StaticDatePicker';
import RenderDaysDatePickerField from 'components/hookFormControls/RenderDaysDatePickerField';
import ErrorAlert from 'components/Dialog/ErrorAlert';
import Loader from 'components/loader';
import useGetPublic from 'services/hooks/useGetPublic';
import SaveIcon from '@mui/icons-material/Save';
import TimeSlotGenerator from 'components/hookFormControls/TimeSlotGenerator';



interface AppointmentFields {
    firstName : string;
    lastName : string;
    mobileNumber: string;
    treatmentId: number;
    appointmentDate: dayjs.Dayjs | null;
    appointmentTimeSlots: string[];
    appointmentStatusId: number;    
}

interface Internal {
  id : number;
  method: string;
}

interface FormData {
    appointmentFields : AppointmentFields;    
    internal : Internal;
}

type Option={
    id: number;
    description: string;
}

type TimeSlotOption = {
  code: string;  
}


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

// type DentistOption={
//     id: number;
//     description: string;
// }



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




type Props = {
    loading: boolean;
    onSubmit: ()=>void;
}

const AppointmentForm: React.FC<Props> = ({onSubmit, loading}) => {
    const [timeSlotOption, setTimeSlotOption] = useState<TimeSlotOption[]>([]);    
    const [treatmentOption, setTreatmentOption] = useState<Option[]>([]);    
    const [daysAppointment, setDaysAppointment] = useState<string[]>([]);
    
    const [DentistWorkingHour, setDentistWorkingHour] = useState<TimeInterval[]>([]);
    const [WorkingHour, setWorkingHour] = useState<WorkingHour>({ from_time: "", to_time: "" });
    const [duration, setDuration] = useState(0);
    const [defaultTime, setDefaultTime] = useState<any>(null);
    const [showOccupied, setShowOccupied] = useState(true);
    //const { control, formState: { errors }, getValues, setValue, trigger, watch } = useFormContext<FormData>();
    //const internalId = watch('internal.id');
    
    const [errorAlertOpen, setErrorAlertOpen] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState("");


    const { control, handleSubmit ,formState: { errors }, getValues, setValue, trigger, watch } = useFormContext<FormData>();

      
      const selectedAppointmentDate = watch('appointmentFields.appointmentDate');
  const selectedTreatmentId = watch('appointmentFields.treatmentId');
  
  // Memoize the appointment date string to avoid unnecessary re-renders
  const memoizedAppointmentDateString = useMemo(() => {
    return selectedAppointmentDate ? dayjs(selectedAppointmentDate).format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD');
  }, [selectedAppointmentDate]);

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

  const {data: treatmentData, isFetching: treatmentIsFetching } = useGetPublic({
    endpoint: 'treatment-public/getall', 
    param: {},
    querykey:'get-treatment-list'
  });


  const {data: daysData, isFetching: daysIsFetching } = useGetPublic({
    endpoint: 'appointment-guest/getdays', 
    param: {},
    querykey:'get-appointmentdays-list'
  });


  // const {data: dataTimeSlots, isFetching: isFetchingTimeSlots, refetch } = useGetPublic({
  //   endpoint: 'appointment-guest/getslots', 
  //   param: {appointmentDate : selectedAppointmentDate? dayjs(selectedAppointmentDate).format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD')},
  //   querykey:'get-appointment-slots'
  // });

  useEffect(()=>{
    if (treatmentData) {
        console.log('treatmentData', treatmentData)
        setTreatmentOption(treatmentData)        
    }
  },[treatmentData])

  // Get selected treatment duration
  const selectedTreatmentDuration = useMemo(() => {
    if (!selectedTreatmentId || !treatmentData) return 15; // default duration
    
    const selectedTreatment = treatmentData.find((treatment: any) => treatment.id === selectedTreatmentId);
    return selectedTreatment ? parseInt(selectedTreatment.duration) : 15;
  }, [selectedTreatmentId, treatmentData]);

  // Clear time slots when treatment changes
  useEffect(() => {
    if (selectedTreatmentId) {
      setValue('appointmentFields.appointmentTimeSlots', []);
    }
  }, [selectedTreatmentId, setValue]);

  // Set default date on form load
  useEffect(() => {
    if (daysAppointment.length > 0 && !selectedAppointmentDate) {
      // Find the next available appointment date (today or later)
      const today = dayjs().format('YYYY-MM-DD');
      const availableDate = daysAppointment.find(date => date >= today) || daysAppointment[0];
      
      if (availableDate) {
        setValue('appointmentFields.appointmentDate', dayjs(availableDate));
      }
    }
  }, [daysAppointment, selectedAppointmentDate, setValue]);

  // Set tomorrow's date as default immediately on form load
  useEffect(() => {
    if (!selectedAppointmentDate) {
      setValue('appointmentFields.appointmentDate', dayjs().add(1, 'day'));
    }
  }, [selectedAppointmentDate, setValue]);

  useEffect(()=>{
    if (daysData) {
      //console.log('daysData', daysData.map((d:any)=>{return {d.appointment_days}}))
      const _appointment = daysData.map((item:any) =>dayjs(item.appointment_days).format('YYYY-MM-DD'));
      //console.log('daysData', _appointment)
      setDaysAppointment(_appointment)        
      
    }
  },[daysData])

  // const {data: workingHourData, isFetching: workingHourIsFetching } = useGet({
  //   endpoint: 'dentist/getWorkingHour', 
  //   param: memoizedApiParams.workingHour,
  //   querykey:'get-dentist-workinghour'
  // });

  
  const {data: OccupiedSlotsData, isFetching: OccupiedSlotsIsFetching, refetch: refetchOccupiedSlots } = useGetPublic({
    endpoint: 'appointment-guest/getOccupiedGuestSlots', 
    param: { date: memoizedAppointmentDateString },
    querykey:'get-occupiedslots-public'
  });


  // Memoize bookings data to prevent unnecessary re-renders
    const memoizedBookings = useMemo(() => {
      if (!OccupiedSlotsData) return [];
      console.log('OccupiedSlotsData', OccupiedSlotsData);
      //console.log('Recalculating memoized bookings from OccupiedSlotsData:', OccupiedSlotsData);
      
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
 

  return (
    
        <Container sx={{width:'auto', paddingY: 4}}>
          {
            (!treatmentData && !treatmentIsFetching) ? <Loader/> :
            //(isFetching && patientIsFetching && dentistIsFetching && treatmentIsFetching && isFetchingTimeSlots && statusIsFetching ) ? <Loader/> :
            <>
            <Typography variant="h4" sx={{marginBottom: 5}} gutterBottom>
                Schedule an Appointment
            </Typography>
            <Divider sx={{marginBottom: 5}}/>
            <Stack direction={'row'} gap={8}>
                <Box>
                    <Typography variant="h6">
                            Basic Information
                    </Typography>
                    <FormInput
                        name="appointmentFields.firstName"
                        control={control}
                        label="First Name"
                        rules={{
                            required: 'First Name is required',
                            pattern: {
                                value: /^[A-Za-z\s]+$/,
                                message: 'First Name can only contain letters and spaces'
                            }
                        }}
                        errors={errors.appointmentFields?.firstName}
                    />


                    <FormInput
                        name="appointmentFields.lastName"
                        control={control}
                        label="Last Name"
                        rules={{
                            required: 'Last Name is required',
                            pattern: {
                                value: /^[A-Za-z\s]+$/,
                                message: 'Last Name can only contain letters and spaces'
                            }
                        }}
                        errors={errors.appointmentFields?.lastName}
                    />
                    <FormInput
                          name="appointmentFields.mobileNumber"
                          control={control}
                          label="Contact No."
                          errors={errors?.appointmentFields?.mobileNumber}
                          rules={{
                              required: 'Contact No. is required', // Ensure the field is not empty
                              pattern: {
                                  value: /^[1-9]\d{9}$/, // Ensures a 10-digit number starting with 1-9
                                  message: 'Contact No. must be a 10-digit number without a leading zero',
                              },
                          }}
                      />
                    <DropDownField
                        name="appointmentFields.treatmentId"
                        label="Select Treatment"
                        control={control}
                        options={treatmentOption.map((o:any)=>{
                            return {id: o.id, description: `${o.description} - (${o.duration.toString()} mins duration)`  }
                        })}
                        defaultValue=""            
                        />
                </Box>
                
                <Box>

                    <Typography variant="h6">
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
                        />

                        </Stack>
                        <Stack direction="column" spacing={1} display={'flex'} justifyContent={'start'} alignContent={'center'}>
                        <Box>
                        <TimeSlotGenerator
                          name={"appointmentFields.appointmentTimeSlots"}
                          control={control}
                          label={"Available Time Slots"}
                          serviceDuration={selectedTreatmentDuration}
                          bufferTime={0}
                          workingHours={WorkingHour.from_time && WorkingHour.to_time 
                                        ? convertWorkingHourFormat(WorkingHour) 
                                        : { start: '09:00', end: '17:00' }}
                          bookings={memoizedBookings}
                          errors={errors}
                          rules={{ required: 'Please select at least one time slot' }}
                          multiple={true}
                          defaultValue={defaultTime}
                          showOccupied={showOccupied}
                          currentSlots={null}
                          slotRange={15}
                          selectedDate={selectedAppointmentDate ? dayjs(selectedAppointmentDate).toDate() : null}
                        />



                        {/* <TimeSlotPicker
                            name="appointmentFields.appointmentTimeSlots"
                            label="Available Time Slots"
                            control={control}
                            options={[
                            { code: '09:00 AM', description: '09:00 AM', isAvailable: true, hour: 9 },
                            { code: '10:00 AM', description: '10:00 AM', isAvailable: true, hour: 10 },
                            { code: '11:00 AM', description: '11:00 AM', isAvailable: true, hour: 11 },
                            { code: '12:00 PM', description: '12:00 PM', isAvailable: true, hour: 12 },
                            { code: '01:00 PM', description: '01:00 PM', isAvailable: true, hour: 13 },
                            { code: '02:00 PM', description: '02:00 PM', isAvailable: true, hour: 14 },
                            { code: '03:00 PM', description: '03:00 PM', isAvailable: true, hour: 15 },
                            { code: '04:00 PM', description: '04:00 PM', isAvailable: true, hour: 16 },
                            ].map((o) => {
                            // Assume `appointmentDate` is a Dayjs object
                            const appointmentDate = getValues('appointmentFields.appointmentDate');
                            if (!appointmentDate) {
                                //console.error("Invalid or missing 'appointmentFields.appointmentDate'");
                                return { ...o, isAvailable: false, time: '' };
                            }

                            // Convert Dayjs object to a native Date
                            const date = dayjs(appointmentDate).toDate();
                            date.setHours(o.hour, 0, 0, 0); // Set hour, minute, second, and millisecond
                                
                            return {
                                code: o.code,
                                description: o.description,
                                time: date.toISOString(), // Convert to ISO string for the `time` property
                                isAvailable: !(
                                dataTimeSlots ?? []
                                )
                                .filter(
                                    (slot: any) => slot.code !== getValues('appointmentFields.appointmentTimeSlots')[0]
                                )
                                .map((c: any) => c.code)
                                .includes(o.code),
                            };
                            })}
                            rules={{ required: 'Please select at least one available time slot' }}
                            errors={errors}
                            editMode={true}
                        /> */}
                        </Box>    
                        </Stack>
                    </Stack>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{
                        mt: 2,
                        padding: '12px',
                        fontSize: '16px',
                        borderRadius: 2,
                        textTransform: 'none',
                        '&:hover': {
                            backgroundColor: '#1976d2',
                        }
                        }}
                        disabled={loading} // Disable button while loading
                        onClick={handleSubmit(onSubmit)}
                        >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
                    </Button>
                </Box>
            </Stack>
        </>
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