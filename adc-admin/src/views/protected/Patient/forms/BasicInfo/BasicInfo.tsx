import React, { useEffect, useState } from 'react';
import {  
  Container,
  Typography,
  Box,  
} from '@mui/material';
import dayjs from 'dayjs';
import {useFormContext } from 'react-hook-form';
import useGet from '../../../../../services/hooks/useGet';
import Loader from '../../../../../components/loader';
import RadioGroupField from '../../../../../components/hookFormControls/RadioGroupFieldProps';
import DatePickerField from '../../../../../components/hookFormControls/DatePicker';
import FormInput from '../../../../../components/hookFormControls/InputField';
import ErrorAlert from 'components/Dialog/ErrorAlert';



interface BasicInfo {
    firstName : string;
    lastName : string;
    middleName: string;
    birthDate: dayjs.Dayjs | null;
    age: number;
    sex: string;
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
}


const BasicInfoForm: React.FC = () => {
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

  const { control, formState: { errors }, getValues, setValue, trigger } = useFormContext<FormData>();


  
  const {data, isFetching } = useGet({
    endpoint: 'patient/get', 
    param: {id : getValues('internal.id')},
    querykey:'get-patient-item',
    onErrorCallback: handleError,
  });
       
  
  useEffect(()=>{
    if (data) {
      setValue('basicInfo.firstName', data.firstName);
      setValue('basicInfo.lastName', data.lastName);
      setValue('basicInfo.middleName', data.middleName);
      setValue('basicInfo.sex', data.sex=='M'? 'male':'female');            
      setValue('basicInfo.birthDate', dayjs(data.birthDate.toString())); 
      setValue('basicInfo.age', data.age);
      setValue('contactInfo.email', data.email);
      setValue('contactInfo.contactNo', data.contactNo);
      setValue('contactInfo.address', data.address);
    }
  },[data])
  

  return (
    
        <Container maxWidth="xs">
          
          
          <Box mt={5}>
            <Typography variant="h6" component="h1" gutterBottom>
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
                name="basicInfo.middleName"
                control={control}
                label="Middle Name"
                rules={{ required: 'Middle Name is required' }}
                errors={errors.basicInfo?.middleName}
              />


                {
                  getValues('internal.method') === 'Edit' &&
                  <FormInput
                    name="basicInfo.age"
                    control={control}
                    label="Age"
                    isNotRequired
                    isNumber={true} // This will ensure it's treated as a number
                    isDisabled
                    errors={errors?.basicInfo?.age}
                    // rules={{
                    //   required: 'Age is required', // Ensure the field is not empty
                    //   //min: { value: 18, message: 'Age must be at least 18' }, // Ensure the age is not less than 18
                    //   //max: { value: 100, message: 'Age must not exceed 100' }, // Ensure the age does not exceed 100
                    //   // validate: {
                    //   //   positiveNumber: (v:number) => v > 0 || 'Age must be a positive number', // Custom validation to ensure a positive number
                    //   // },
                    // }}                    
                  />

                }


                  <DatePickerField
                          name="basicInfo.birthDate"
                          control={control}
                          label="Date of Birth"
                          errors={errors}
                          requiredMessage="Birth Date is required"
                          maxDate={dayjs().subtract(1, 'years')}
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

                

            <Typography variant="h6" component="h1" gutterBottom>
              Contact Information
            </Typography>


            <FormInput
                    name="contactInfo.address"
                    control={control}
                    label="Address"                    
                    errors={errors?.contactInfo?.address}
                    rules={{
                      required: 'Address is required', // Ensure the field is not empty                      
                    }}                    
                  />

                  <FormInput
                    name="contactInfo.email"
                    control={control}
                    label="Email"                    
                    errors={errors?.contactInfo?.email}
                    rules={{
                      required: 'Email is required', // Ensure the field is not empty                      
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
                      required: 'Contact No. is required', // Ensure the field is not empty                      
                      pattern: {
                        value: /^\d{11}$/, // Assuming a 10-digit phone number
                        message: 'Contact No. is not valid',
                      },
                    }}                    
                  /> */}
          </Box>
          
          <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />           
        
      </Container>

  );
};

export default BasicInfoForm;
