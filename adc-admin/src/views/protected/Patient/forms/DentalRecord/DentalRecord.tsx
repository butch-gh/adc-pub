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
import DropDownField from 'components/hookFormControls/DropDownField';
import internal from 'stream';
import ErrorAlert from 'components/Dialog/ErrorAlert';




interface Item {
  patientId: Number;
  toothId: Number; 
  treatmentId: Number; 
}

interface Internal {
  id : number;
  method: string;
}

interface FormData {
    dentalRecord : Item;
    internal : Internal;
}

type Option={
  id: number;
  description: string;
}

// type Option={
//   id: number;
//   description: string;
// }


const DentalRecordForm: React.FC = () => {
  const { control, formState: { errors }, setValue, watch } = useFormContext<FormData>();
  const [treatmentOption, setTreatmentOption] = useState<Option[]>([]);
  const [toothOption, setToothOption] = useState<Option[]>([]);  
  const dentalId = watch('internal.id');
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
  
  const {data, isFetching } = useGet({
    endpoint: 'dental/get', 
    param: {id : dentalId},
    querykey:'get-dental-item',
    onErrorCallback: handleError,
  });

  const {data: treatmentData, isFetching: treatmentIsFetching } = useGet({
    endpoint: 'treatment/getall', 
    param: {},
    querykey:'get-treatment-list',
    onErrorCallback: handleError,
  });
  
  const {data: teethData, isFetching: teethIsFetching } = useGet({
    endpoint: 'dental/getteethlist', 
    param: {},
    querykey:'get-teeth-list',
    onErrorCallback: handleError,
  });

  useEffect(()=>{
    if (treatmentData) {
        console.log('treatment-data', treatmentData)
        setTreatmentOption(treatmentData)        
    }
  },[treatmentData])

  useEffect(()=>{
    if (teethData) {
      setToothOption(teethData)        
    }
  },[teethData])

  useEffect(()=>{
    if (data) {
      //console.log('dental-data', data)
      setValue('dentalRecord.patientId', data.patientid);
      setValue('dentalRecord.toothId', data.toothid);
      setValue('dentalRecord.treatmentId', data.treatmentid);        
    }
  },[data])
  

  return (
    
        <Container maxWidth="xs">
          {
           (isFetching && treatmentIsFetching && teethIsFetching) ? <Loader></Loader> :
          <Box mt={5}>
    
            
            <DropDownField
              name="dentalRecord.treatmentId"
              label="Select Treatment"
              control={control}
              options={treatmentOption.map((o:any)=>{
                  return {id: o.id, description: o.description }
              })}
              defaultValue=""            
            />

            <DropDownField
              name="dentalRecord.toothId"
              label="Select Teeth"
              control={control}
              options={toothOption.map((o:any)=>{
                  return {id: o.id, description: o.teeth_number }
              })}
              defaultValue=""            
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

export default DentalRecordForm;
