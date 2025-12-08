import React, { useState } from "react";
import { Box, Container, Paper } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";

import { FormProvider, useForm } from "react-hook-form";
import AppointmentForm from "../AppointmentForm/AppointmentForm";
import Header from "../Header/Header";
import dayjs from "dayjs";
import AlertDialog from "components/Dialog/AlertDialog";
import useApiCallPublic from "services/hooks/useApiCallPublic";
import useLogActivityPublic from "services/hooks/useLogActivityPublic";

const BookAppointment: React.FC = () => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');    
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
  const [setLoading] = useState(false);

    const formMethods = useForm({
        mode: 'onChange',
        defaultValues: {
          appointmentFields: {            
            firstName: '',
            lastName: '',
            mobileNumber: '',
            treatmentId: '',
            appointmentDate: null,
            appointmentTimeSlots: [],            
          },      
          internal:{
            id: 0,
            method:'',            
          }                      
        }
      });
      const { getValues, formState: { errors }, watch, setValue, reset } = formMethods;


      const { apiCall, loading, error, errorCode } = useApiCallPublic();
      const { logActivity} = useLogActivityPublic();

      const handleSubmitItem = async () => {      
        const adate = getValues('appointmentFields.appointmentDate');
        const appointmentDate = adate ? dayjs(adate).format('YYYY-MM-DD') : '';
        const apiParam = {          
            firstName: getValues('appointmentFields.firstName'),                
            lastName: getValues('appointmentFields.lastName'),                
            mobileNumber: getValues('appointmentFields.mobileNumber'),                
            treatmentId: getValues('appointmentFields.treatmentId'),                
            appointmentDate: appointmentDate,      
            appointmentTimeSlot: JSON.stringify(getValues('appointmentFields.appointmentTimeSlots')),
        };

        // Add new item
        const endpoint = '/appointment-guest/add'          
        try {           
          //console.log('appointmentFields', apiParam)
          const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment-public${endpoint}`, {...apiParam});         
           //console.log('add-response', response)
                if (response) {
                  const guest = getValues('appointmentFields.firstName') + ' ' + getValues('appointmentFields.lastName');                 
                  await logActivity({action: 'Add', module: 'ADC-CLIENT:Appointment', details: JSON.stringify({ status: 'success', detail: `Added Appointment ID: ${response}`, endpoint: endpoint })});          
                  //triggerAlert('success', 'Successfully booked an appointment!');                  
                  triggerAlert('success', `Thank you, ${guest}, for submitting your schedule. Please wait for your request to be reviewed and approved by the dentist within the day. You will receive a text message once your appointment is confirmed.`);                  
                  reset();
                }       
        } catch (error) {
            //console.error("Error adding item:", error);
            await logActivity({action: 'Add', module: 'ADC-CLIENT:Appointment', details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
        }
      };

        // Trigger popup explicitly
  const triggerAlert = (newSeverity: 'error' | 'warning' | 'info' | 'success', newMessage: string) => {
    setAlertSeverity(newSeverity);
    setAlertMessage(newMessage);
    setIsAlertOpen(true);
  };

  const handleCloseAlertDialog = () => {
    setIsAlertOpen(false);
  };

    return (
        <ErrorBoundary fallback={<>Something went wrong</>}>
            <div style={{height:''}}></div>
            <FormProvider {...formMethods}>
            <Box sx={{backgroundColor:'#f0f0f0', height:'100vh'}}>
                <Box>
                    <Header />
                </Box>            
                <Container>
                <Box>    
                    <AppointmentForm onSubmit={handleSubmitItem} loading={loading}></AppointmentForm>
                </Box>
                </Container>
            </Box>            
            </FormProvider>
            <AlertDialog          
                open={isAlertOpen}
                message={alertMessage}
                severity={alertSeverity}
                position="bottom-right"        
                duration={60000} // 5 seconds duration before auto-close
                onClose={handleCloseAlertDialog}
            />
        </ErrorBoundary>
    );
};

export default BookAppointment;