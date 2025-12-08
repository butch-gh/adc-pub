import React, { useEffect, useState } from 'react';
import {  
  Container,
  Typography,
  Box,  
} from '@mui/material';
import dayjs from 'dayjs';
import {useFormContext } from 'react-hook-form';
import Loader from 'components/loader';
import useGet from 'services/hooks/useGet';
import CheckBoxGroupField from 'components/hookFormControls/CheckBoxGroupField';
import DatePickerField from 'components/hookFormControls/DatePicker';
import DropDownField from 'components/hookFormControls/DropDownField';
import FormInput from 'components/hookFormControls/InputField';
import RadioGroupField from 'components/hookFormControls/RadioGroupFieldProps';
import ErrorAlert from 'components/Dialog/ErrorAlert';
import TimeScheduleForm from 'components/hookFormControls/TimeScheduleForm';
//import useGet from '@hooks/useGet';

type ScheduleData = {
  [key: string]: { from: string; to: string };
};

interface Scheduletimes {
  schedule: { [key: string]: boolean };
  times: ScheduleData;
}

interface BasicInfo {
  firstName : string;
  lastName : string;
  mI: string;
  birthDate: dayjs.Dayjs | null;
  age: number;
  sex: string;
  timeSched: string[];
}

interface ContactInfo {
  address : string;
  email : string;
  contactNo: string;    
}

interface Internal {
  id : number;
  method: string;
}

interface FormData {
  basicInfo : BasicInfo;
  contactInfo : ContactInfo;
  internal : Internal;
  scheduleTimes : Scheduletimes;
}


// const times = { 
//   "FRI": {
//       "from": "03:24",
//       "to": "21:26"
//   },  
//   "SUN": {
//       "from": "02:25",
//       "to": "16:27"
//   }
// }

// const schedule = {
// "FRI": true,
// "SUN": true
// }

const times = "{\"MON\":{\"from\":\"05:32\",\"to\":\"18:33\"}}";
const schedule = "{\"MON\":true}";


const BasicInfoForm: React.FC = () => {

  const { control, formState: { errors }, getValues, setValue, trigger, watch } = useFormContext<FormData>();
  const internalID = watch('internal.id')
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");

  const handleError = (error: any) => {  
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };

  const handleCloseAlert = () => {
  setErrorAlertOpen(false);
  };

  // console.log('insertnal.id', internalID)
  
  const {data, isFetching, isLoading } = useGet({
    endpoint: 'dentist/get', 
    param: {id : internalID},
    querykey:'get-dentist-item',
    onErrorCallback: handleError,
  });
  
  useEffect(()=>{
    // console.log('parsesched', data)
    
    if (data) {      
      //console.log('user-data', data, data.birthdate)
      setValue('basicInfo.firstName', data.first_name);
      setValue('basicInfo.lastName', data.last_name);
      setValue('basicInfo.mI', data.middle_initial);
      setValue('basicInfo.sex', data.sex=='M'? 'male':'female');            
      setValue('basicInfo.birthDate', dayjs(data.birthdate.toString())); 
      setValue('basicInfo.age', data.age);
      setValue('contactInfo.address', data['address']);  
      setValue('contactInfo.email', data['emailaddress']);
      setValue('contactInfo.contactNo', data['contact_no']);
      //setValue('basicInfo.timeSched', JSON.parse(data.time_schedule));
      setValue('scheduleTimes.schedule', JSON.parse(data.schedule));
      setValue('scheduleTimes.times', JSON.parse(data.times));
    }
  },[data])
  
  //console.log('basicInfo', getValues('basicInfo'));
  //console.log('accessPrivilege', getValues('accessPrivilege'));
  //console.log('data-fetching-loading',data, isFetching, isLoading);
  //console.log('jobData', jobData, jobIsFetching);
  return (
    
    <Container maxWidth="xl">
      {
        (!isFetching) ?
        <Box mt={5}>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          

          <FormInput
            name="basicInfo.firstName"
            control={control}
            label="First Name"
            rules={{ required: 'First Name is required' }}
            errors={errors.basicInfo?.firstName}
          />

          <FormInput
            name="basicInfo.lastName"
            control={control}
            label="Last Name"
            rules={{ required: 'Last Name is required' }}
            errors={errors.basicInfo?.lastName}
          />

          <FormInput
            name="basicInfo.mI"
            control={control}
            label="Middle Name"
            rules={{ required: 'Middle Name is required' }}
            errors={errors.basicInfo?.mI}
          />             

          {
            getValues('internal.method') === 'Edit' &&
            <FormInput
              name="basicInfo.age"
              control={control}
              label="Age"
              isNotRequired
              isNumber={true}
              isDisabled
              errors={errors?.basicInfo?.age}                 
            />
          }

          <DatePickerField
            name="basicInfo.birthDate"
            control={control}
            label="Date of Birth"
            errors={errors}
            requiredMessage="Birth Date is required"
            maxDate={dayjs().subtract(23, 'years')}
          />

          <RadioGroupField
            name="basicInfo.sex"
            label="Sex"
            control={control}
            defaultValue=""
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            errors={errors.basicInfo?.sex}
            rules={{ required: 'Sex is required' }}
          />
          
          
          {/* <CheckBoxGroupField
            name="basicInfo.daysOnDuty"
            label="Select your Days On Duty"
            control={control}
            options={[
              { code: 'MON', description: 'Mon' },
              { code: 'TUE', description: 'Tue' },
              { code: 'WED', description: 'Wed' },
              { code: 'THU', description: 'Thu' },
              { code: 'FRI', description: 'Fri' },
              { code: 'SAT', description: 'Sat' },
              { code: 'SUN', description: 'Sun' },
              
            ]}
            direction={'row'}
            defaultValue={[]}
            errors={errors}
            rules={{ required: 'Please select at least one Days On Duty.' }}
          /> */}

          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>


          <FormInput
                  name="contactInfo.address"
                  control={control}
                  label="Address"                    
                  errors={errors?.contactInfo?.address}
                  rules={{
                    required: 'Address is required',                 
                  }}                    
                />

          <FormInput
            name="contactInfo.email"
            control={control}
            label="Email"                    
            errors={errors?.contactInfo?.email}
            rules={{
              required: 'Email is required',                 
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: 'Email is not valid',
              },
            }}                    
          />            

          <FormInput
            name="contactInfo.contactNo"
            control={control}
            label="Contact No."
            errors={errors?.contactInfo?.contactNo}
            rules={{
                required: 'Contact No. is required', // Ensure the field is not empty
                pattern: {
                    value: /^[1-9]\d{9}$/, // Ensures a 10-digit number starting with 1-9
                    message: 'Contact No. must be a 10-digit number without a leading zero',
                },
            }}
          />

          <Typography variant="h6" gutterBottom>
            Time Schedule
          </Typography>

          <TimeScheduleForm name_sched='scheduleTimes.schedule' name_times='scheduleTimes.times' />
        
        </Box>
        : <Loader/>
      }
        <ErrorAlert
            open={errorAlertOpen}
            message={errorAlertMessage}
            onClose={handleCloseAlert}
        />        
    </Container>

  );
};

export default BasicInfoForm;

