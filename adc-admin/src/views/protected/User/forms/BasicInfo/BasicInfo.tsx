import React, { useEffect, useState } from 'react';
import {  
  Container,
  Typography,
  Box,  
} from '@mui/material';
import dayjs from 'dayjs';
import {useFormContext } from 'react-hook-form';
// import CheckBoxGroupField from '@hookFormControls/CheckBoxGroupField';
// import DatePickerField from '@hookFormControls/DatePicker';
// import DropDownField from '@hookFormControls/DropDownField';
// import FormInput from '@hookFormControls/InputField';
// import RadioGroupField from '@hookFormControls/RadioGroupFieldProps';
import Loader from 'components/loader';
import useGet from 'services/hooks/useGet';
import CheckBoxGroupField from 'components/hookFormControls/CheckBoxGroupField';
import DatePickerField from 'components/hookFormControls/DatePicker';
import DropDownField from 'components/hookFormControls/DropDownField';
import FormInput from 'components/hookFormControls/InputField';
import RadioGroupField from 'components/hookFormControls/RadioGroupFieldProps';
import ErrorAlert from 'components/Dialog/ErrorAlert';
//import useGet from '@hooks/useGet';

interface BasicInfo {
  firstName : string;
  lastName : string;
  mI: string;
  birthDate: dayjs.Dayjs | null;
  age: number;
  sex: string;
  selectedJob: number;
  daysOnDuty: string[];
}

interface ContactInfo {
  address : string;
  email : string;
  contactNo: string;    
}

interface AccessPrivilege {
  selectedRole : number;
}

interface Internal {
  id : number;
  method: string;
}

interface FormData {
  basicInfo : BasicInfo;
  contactInfo : ContactInfo;
  accessPrivilege : AccessPrivilege;
  internal : Internal;
}

type JobLOV = {
  id : number;
  description : string;
}

type RoleLOV = {
  id : number;
  description : string;
}

const BasicInfoForm: React.FC = () => {

  const { control, formState: { errors }, getValues, setValue, trigger, watch } = useFormContext<FormData>();
  const [jobLOV, setJobLOV] = useState<JobLOV[]>([]);
  const [roleLOV, setRoleLOV] = useState<RoleLOV[]>([]);
  const internalID = watch('internal.id')
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");
  const [userRole, setUserRole] = useState(0);

  const handleError = (error: any) => {  
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };

  const handleCloseAlert = () => {
  setErrorAlertOpen(false);
  };

  //console.log('insertnal.id', internalID)
  
  const {data, isFetching, isLoading } = useGet({
    endpoint: 'user/get', 
    param: {id : internalID},
    querykey:'get-user-item',
    onErrorCallback: handleError,
  });
  
  
  const {data: jobData, isFetching: jobIsFetching } = useGet({
    endpoint: 'job/getall', 
    param: {},
    querykey:'get-job-item',
    onErrorCallback: handleError,
  });

  const {data: roleData, isFetching: roleIsFetching } = useGet({
    endpoint: 'role/getall', 
    param: {},
    querykey:'get-role-item',
    onErrorCallback: handleError,
  });
         
  useEffect(()=>{
    if (jobData) {
      setJobLOV(jobData.map((job: any) => ({
        id: job.id,
        description: job.name
      })))
      //console.log(jobData)
    }
  },[jobData])

  useEffect(()=>{
    if (roleData) {
      setRoleLOV(roleData)
      //console.log(roleData)
    }
  },[roleData])
  
  useEffect(()=>{
    
    if (data) {      
      //console.log('user-data', data, data.birthdate)
      setValue('basicInfo.firstName', data.first_name);
      setValue('basicInfo.lastName', data.last_name);
      setValue('basicInfo.mI', data.middle_initial);
      setValue('basicInfo.sex', data.sex=='M'? 'male':'female');            
      setValue('basicInfo.birthDate', dayjs(data.birthdate.toString())); 
      setValue('basicInfo.age', data.age);
      setValue('basicInfo.selectedJob', data.jobId);
      setValue('basicInfo.daysOnDuty', JSON.parse(data.days_on_duty));
      setValue('contactInfo.email', data['emailaddress']);
      setValue('contactInfo.contactNo', data['contact_no']);
      setValue('contactInfo.address', data['address']);
      setValue('accessPrivilege.selectedRole', data.roleId);
      setUserRole(data.roleId);       
      
    }
  },[data])
  
  //console.log('basicInfo', getValues('basicInfo'));
  //console.log('accessPrivilege', getValues('accessPrivilege'));
  //console.log('data-fetching-loading',data, isFetching, isLoading);
  //console.log('jobData', jobData, jobIsFetching);
  return (
    
    <Container maxWidth="xl">
      {
        //(!isLoading) ?
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
          
          <DropDownField
            name="basicInfo.selectedJob"
            label="Select Job"
            control={control}
            options={jobLOV}
            defaultValue={''}
            rules={{ required: 'Please select job.' }}
          />

          <CheckBoxGroupField
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
          />

          <Typography variant="h6" component="h1" gutterBottom>
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

          {/* <FormInput
                name="contactInfo.contactNo"
                control={control}
                label="Contact No."                    
                errors={errors?.contactInfo?.contactNo}
                rules={{
                  required: 'Contact No. is required',                 
                  pattern: {
                    value: /^\d{11}$/,
                    message: 'Contact No. is not valid',
                  },
                }}                    
              /> */}

          {
            userRole !== 1 &&
            <>
              <Typography variant="h6" component="h1" gutterBottom>
                Access Privilege
              </Typography>

              <DropDownField
                name="accessPrivilege.selectedRole"
                label="Select role"
                control={control}
                options={roleLOV}
                defaultValue=""
                rules={{ required: 'Please select role.' }}
              />
            </>
          }
          
          
        
        </Box>
        //: <Loader/>
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

