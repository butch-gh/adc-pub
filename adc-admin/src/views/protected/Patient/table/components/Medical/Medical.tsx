import { useForm, FormProvider, Controller } from "react-hook-form"
import { useEffect, useState } from "react";
import { Container, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, useTheme } from "@mui/material";
import Loader from "../../../../../../components/loader";
import YesOrNoField from "./components/YesOrNo";
import { TextField } from "components/hookFormControls/TextField";
import useApiCall from "services/hooks/useApiCall";
import useGet from "services/hooks/useGet";
import UpdateIcon from '@mui/icons-material/Update';
import ErrorAlert from "components/Dialog/ErrorAlert";
import useLogActivity from "services/hooks/useLogActivity";
import AlertDialog from "components/Dialog/AlertDialog";


const TemplateQuestions = [
    { Id:1, question:'Are you in good health?', answerType:'YESNO'},
    { Id:2, question:'Are you under medical treatment now? If so, what is the condition being treated?', answerType:'TEXT'},
    { Id:3, question:'Have you ever had serious illness or surgical operation? If so, what illness or operation?', answerType:'TEXT'},
    { Id:4, question:'Have you ever been hospitalized? If so, when and why?', answerType:'TEXT'},
    { Id:5, question:'Are you taking any prescription/non-prescription medication? If so, please specify.', answerType:'TEXT'},
    { Id:6, question:'Do you use tobacco products?', answerType:'YESNO'},    
    { Id:7, question:'Do you use alcohol, cocaine, or other dangerous drugs?', answerType:'YESNO'},    
    { Id:8, question:'Are you allergic? If so, please specify.', answerType:'TEXT'},    
    { Id:9, question:'Bleeding time', answerType:'TEXT'},    
    { Id:10, question:'For women only: Are you pregnant?', answerType:'YESNO'},    
    { Id:11, question:'For women only: Are you nursing?', answerType:'YESNO'},    
    { Id:12, question:'For women only: Are you taking birth control pills?', answerType:'YESNO'},    
    { Id:13, question:'Blood Type', answerType:'TEXT'},    
    { Id:14, question:'Blood Pressure', answerType:'TEXT'},    
    { Id:15, question:'Do you have or have you had other factors? If so, please specify.', answerType:'TEXT'},    
]


type MedRecord = {
    medRecord: {
      id: number;
      answer: string | undefined;
    }[];
  };

  type Answer = {
    id: number;
    answer: string;
    }[];

interface MedicalModel {
    Id : number;
    question : string;
    answerType: string;    
}

interface Props {
    PatientId: number | null;
}


const Medical: React.FC<Props> = ({PatientId}) =>{
    let MODULE = 'ADC-ADMIN:Patient-Medical';
    const [errorAlertOpen, setErrorAlertOpen] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState("");
    const { logActivity} = useLogActivity();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');    
    const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
    const handleError = (error: any) => {  
      const message = error?.response?.data?.message || "Something went wrong. Please try again.";
      setErrorAlertMessage(message);
      setErrorAlertOpen(true);
      
    };
  
    const handleCloseAlert = () => {
    setErrorAlertOpen(false);
    };

     // Trigger popup explicitly
     const triggerAlert = (newSeverity: 'error' | 'warning' | 'info' | 'success', newMessage: string) => {
        setAlertSeverity(newSeverity);
        setAlertMessage(newMessage);
        setIsAlertOpen(true);
  
        // Ensure consistent visibility, even if `refetch` triggers a re-render
        setTimeout(() => setIsAlertOpen(false), 6000);
      };
      const handleCloseAlertDialog = () => {
        setIsAlertOpen(false);
      };


    const theme = useTheme();
    const formMethods = useForm<MedRecord>({
        mode: 'onChange',
        defaultValues: {
            medRecord:[]
        }
    });
    
    const { control, formState: { errors }, getValues, register, watch, setValue, reset, formState } = formMethods;
    //const ans = watch(`medRecord`);
    

    const {apiCall, error, loading} = useApiCall()
    //console.log('PatientID:', PatientId);
    
    const {data, isFetching, refetch } = useGet({
        endpoint: 'medical/get', 
        param: {patientId : PatientId},
        querykey:'get-medical-item',
        onErrorCallback: handleError,
      });

    

    useEffect(() => {        
            let parsedAnswers: Answer = [];
            try {
                parsedAnswers = JSON.parse(data.answers) as Answer;
            } catch (error) {                
                parsedAnswers = [];
            }    
            const mixAns = TemplateQuestions.map((a) => {
                const matchingAnswer = parsedAnswers.find((o:any) => o.id === a.Id);
                const finalAnswer = matchingAnswer ? matchingAnswer.answer : (a.answerType==='YESNO' ? 'no' : '')
                return {
                    id: a.Id,
                    answer: finalAnswer,
                };
            });    
            setValue('medRecord', mixAns );    
    }, [data]);

    //console.log('getValues', getValues());
    const OnSubmit =  async () => {
        if (data) {
            // update
            const endpoint = '/medical/update'
            try {           
                
                const withAnswers = getValues().medRecord.filter((f)=>f.answer!=='no' && f.answer!=='');
                //console.log('updated withAnswers', withAnswers)
                const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id: PatientId, answers: JSON.stringify(withAnswers)});         
                //console.log('update-response', response)
                //refetch();
                if (response) {
                    await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Updated MedicalID: ${response[0]}, with PatientID: ${PatientId}`, endpoint: endpoint })});      
                    triggerAlert('success', 'Successfully Submitted;!');
                    refetch();   
                }         
              } catch (error) {
                  console.error("Error updating item:", error);
                  await logActivity({action: 'Update', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
                  triggerAlert('error', 'Failed to update!');
                }
            
        }else{
            // insert
            const endpoint = '/medical/add'
            try {           
            
                const withAnswers = getValues().medRecord.filter((f)=>f.answer!=='no' && f.answer!=='');
                //console.log('withAnswers', withAnswers)
                const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, {id: PatientId, answers: JSON.stringify(withAnswers)});         
                //console.log('add-response', response)
                //refetch();
                if (response) {                
                    await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'success', detail: `Added MedicalID: ${response[0]}, with PatientID: ${PatientId}`, endpoint: endpoint })}); 
                    triggerAlert('success', 'Successfully added!');
                    refetch();                            
                  }         
              } catch (error) {
                  console.error("Error adding item:", error);
                  await logActivity({action: 'Add', module: MODULE, details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint: endpoint })});
                  triggerAlert('error', 'Failed to add!');
                }    
        }
        
    }

    return (
        <>
            <FormProvider {...formMethods}>
                
                <Container maxWidth="xl">
                    {
                        // (data && isFetching) ? <Loader/> :
                        <Box mt={5}>
                            <Typography variant="h6" component="h1" gutterBottom>
                            Medical Record
                            </Typography>

                                

                            <TableContainer component={Paper} >
                            <Table sx={{ minWidth: 800 }} aria-label="simple table" size="small">
                                <TableHead>
                                <TableRow>
                                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}}>Id</TableCell>
                                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Name</TableCell>
                                    <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="right">
                                    <Box my={1} justifyContent={'center'} alignItems={'right'}>                                        
                                        <Button variant="contained" color="primary" endIcon={<UpdateIcon />} onClick={OnSubmit}>
                                            Submit
                                        </Button>
                                    </Box>
                                    </TableCell>            
                                </TableRow>
                                </TableHead>
                                <TableBody>
                                    {
                                        TemplateQuestions.map((row: MedicalModel, index : number)=>(
                                            <TableRow
                                                key={`${row.Id}`}                  
                                                hover                            
                                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>                  
                                                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.Id}                                      
                                                <Controller
                                                        name={`medRecord.${index}.id`}
                                                        control={control}
                                                        defaultValue={index+1} // default value is row.Id
                                                        render={({ field }) => (
                                                        <input type="hidden" {...field} value={index+1} />
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{row.question}</TableCell>                            
                                                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="right">                                                  
                                                    {
                                                        row.answerType === 'YESNO' ? 
                                                            
                                                                <YesOrNoField
                                                                name={`medRecord.${index}.answer`}
                                                                control={control}
                                                                defaultValue="no"
                                                                options={[
                                                                { value: 'yes', label: 'Yes' },
                                                                { value: 'no', label: 'No' },
                                                                ]}
                                                                row
                                                            />

                                                        : row.answerType === 'TEXT' ? (
                                                            <TextField
                                                                name={`medRecord.${index}.answer`}
                                                                //validations={{ required: "This field is required" }}
                                                                //defaultValue={undefined}
                                                                multiline                                                                
                                                                rows={1}
                                                            />
                                                        ) : null
                                                    }
                                                </TableCell>              
                                                </TableRow>
                                        ))
                                    }
                                </TableBody>
                            </Table>
                            </TableContainer>
                        </Box>          
                    }
                </Container>
            </FormProvider>
            <AlertDialog          
                    open={isAlertOpen}
                    message={alertMessage}
                    severity={alertSeverity}
                    position="center-top"        
                    duration={6000} // 5 seconds duration before auto-close
                    onClose={handleCloseAlertDialog}
                  />
            <ErrorAlert
                open={errorAlertOpen}
                message={errorAlertMessage}
                onClose={handleCloseAlert}
            />             
        </>
    )
}

export default Medical