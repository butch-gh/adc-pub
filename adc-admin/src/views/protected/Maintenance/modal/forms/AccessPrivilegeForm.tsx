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
import { Description } from '@mui/icons-material';
//import useGet from '@hooks/useGet';

interface FormFields {
  selectedLevel : number[];
  name : string;
  accessPermissions: accessLOV[];  
}

// interface AccessPermissionFields {
//     viewAnalyticsReports: string;           //Can view Analytics and Reports
//     viewStaffPage: string;                  //Can view Staff Page
//     viewAppointment: string;                //Can view Appointment
//     viewPatientProfilesPage: string;        //Can view Patient Profiles page
//     operatesPatient: string;                //Operates on Patient
//     manageStaffPage: string;                //Can manage Staff Page
//     manageContentManagement: string;        //Can manage Content Management
//     manageAppointmentScheduling: string;    //Can manage Appointment Scheduling
// }

interface Internal {
  id : number;
  method: string;
}

interface FormData {
  formFields : FormFields;  
  internal : Internal;
}

type accessLOV = {
  code : string;
  description : string;
}

type Level = {
  id : number;
  description : string;
}

type Screen = {
  code : string;
  description: string;
  route : string;
}

const AccessOptions = [
    {code:'AP0', description: 'Dashboard'},
    {code:'AP1', description: 'User'},
    {code:'AP2', description: 'Appointment Scheduling'},
    {code:'AP3', description: 'Patient Profiles'},
    {code:'AP4', description: 'Performance Reports'},
    {code:'AP5', description: 'Other Maintenance'},
    {code:'AP6', description: 'Dentist'},    
]

// Dashboard
// User
// Appointment Scheduling
// Patient Profiles
// Performance Reports
// Other Maintenance

interface Props {
  id : number | undefined;
}

const AccessPrivilegeForm: React.FC<Props> = ({id}) => {

  const { control, formState: { errors }, getValues, setValue, reset, trigger, watch } = useFormContext<FormData>();
  const [accessLOV, setAccessLOV] = useState<accessLOV[]>([]);
  const [screen, setScreen] = useState<Screen[]>([]);
  const [level, setLevel] = useState<Level[]>([]);
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");
  const selectedLevel = watch('formFields.selectedLevel');
  const handleError = (error: any) => {  
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };

  const handleCloseAlert = () => {
  setErrorAlertOpen(false);
  };
 
  const {data, isFetching } = useGet({
    endpoint: 'role/get', 
    param: {id : id},
    querykey:'get-role-item',
    onErrorCallback: handleError,
  });
 
  
  const {data: screenData, isFetching: isScreenDataFetching } = useGet({
    endpoint: 'role/getscreen-lov', 
    param: {level: selectedLevel || 0},
    querykey:'get-screen-list',
    onErrorCallback: handleError,
  });
  console.log('selectedLevel', selectedLevel)

  const {data: roleLevelData, isFetching: isRoleLevelFetching } = useGet({
    endpoint: 'role/getlevel', 
    param: {id : id},
    querykey:'get-role-item',
    onErrorCallback: handleError,
  });

  useEffect(()=>{    
    if (screenData) {            
      console.log('screenData', screenData)
      setScreen(screenData);
    }
  },[screenData])
  
  useEffect(()=>{    
    if (roleLevelData) {            
      console.log('roleLevelData', roleLevelData)
      setLevel(roleLevelData.map((o:any)=> { return {id: o.level, description: o.description}}));
    }
  },[roleLevelData])

  useEffect(()=>{
    
    if (data) {            
      console.log('data', data);
      setValue('formFields.selectedLevel', data.level);
      setValue('formFields.name', data.description);
      setValue('formFields.accessPermissions', JSON.parse(data.access));
    }
    else{
      reset();
      //setValue('formFields.selectedLevel', data.level);
      console.log('selected Level', )
    }
  },[data, id])
  

  useEffect(()=>{
    
  },[])

  //console.log('data-fetching-loading',data, isFetching, isLoading);
  //console.log('getValues', getValues());
  return (
    
    <Container maxWidth="lg">
      
      {
       (data && screenData && roleLevelData && isFetching && isScreenDataFetching) ? <Loader/> :
        <Box>
 
         {/* <Typography variant="h6" component="h1" gutterBottom>
            Role Name
          </Typography> */}

          <DropDownField
            name="formFields.selectedLevel"
            label="Select Role Level"
            control={control}            
            options={level}
            defaultValue=""
            errors={errors}
            rules={{ required: 'Please select role level.' }}
          />
          
          <FormInput
            name="formFields.name"
            control={control}
            label="Role Name"
            rules={{ required: 'Role Name is required' }}
            errors={errors.formFields?.name}
          />

          

 
          {/* <Typography variant="h6" component="h1" gutterBottom>
            Select Access
          </Typography> */}


          <CheckBoxGroupField
            name="formFields.accessPermissions"
            label="Select Access Screen"
            direction='column'
            control={control}
            options={screen.map((o)=>{return {code: o.code, description: o.description}})}
            //options={AccessOptions}
            defaultValue={[]}
            errors={errors}            
            rules={{ required: 'Please select at least one access.' }}
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

export default AccessPrivilegeForm;


