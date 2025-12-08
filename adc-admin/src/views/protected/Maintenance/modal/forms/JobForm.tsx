import React, { useEffect, useState } from 'react';
import {  
  Container,
  Typography,
  Box,  
} from '@mui/material';
import {useFormContext } from 'react-hook-form';
import FormInput from 'components/hookFormControls/InputField';
import useGet from 'services/hooks/useGet';
import Loader from 'components/loader';
import ErrorAlert from 'components/Dialog/ErrorAlert';


interface FormFields {
  name : string;
}

interface Internal {
  id : number;
  method: string;
}

interface FormData {
  formFields : FormFields;  
  internal : Internal;
}


interface Props {
  id : number | undefined;
}

const JobForm: React.FC<Props> = ({id}) => {
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

  const { control, formState: { errors }, getValues, setValue, reset, trigger, watch } = useFormContext<FormData>();
  
 
   const {data, isFetching, isLoading } = useGet({
    endpoint: 'job/get', 
    param: {id : id},
    querykey:'get-job-item',
    onErrorCallback: handleError,
  });

  useEffect(()=>{
    
    if (data) {            
      setValue('formFields.name', data.description);
    }else{
      reset();
    }
  },[data, id])
  

  //console.log('data-fetching-loading',data, isFetching, isLoading);
  //console.log('getValues', getValues(),  data);
  return (
    
    <Container maxWidth="lg">
      
      {
       (isFetching) ? <Loader/> : 
        <Box>
         
          <FormInput
            name="formFields.name"
            control={control}
            label="Job Name"
            rules={{ required: 'Job Name is required' }}
            errors={errors.formFields?.name}
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

export default JobForm;


