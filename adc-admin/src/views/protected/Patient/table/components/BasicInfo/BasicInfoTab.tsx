import { useForm, FormProvider } from "react-hook-form";
import useGet from "../../../../../../services/hooks/useGet";
import dayjs from 'dayjs';
import { useEffect, useState } from "react";
import { 
  Container, 
  Box, 
  Typography, 
  Stack, 
  Card, 
  CardContent, 
  Grid, 
  Avatar, 
  Divider,
  Chip
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Cake as CakeIcon,
  Wc as WcIcon
} from "@mui/icons-material";
import Loader from "../../../../../../components/loader";
import ErrorAlert from "components/Dialog/ErrorAlert";

interface BasicInfo {
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: dayjs.Dayjs | null;
  age: number;
  sex: string;
}

interface ContactInfo {
  address: string;
  email: string;
  contactNo: string;
}

interface Internal {
  id: number;
  method: string;
}

interface FormData {
  basicInfo: BasicInfo;
  contactInfo: ContactInfo;
  internal: Internal;
}

interface Props {
  Id: number | null;
}

const BasicInfo: React.FC<Props> = ({ Id }) => {
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");
  const [info, setInfo] = useState<any>();

  const handleError = (error: any) => {  
    const message = error?.response?.data?.message || "Something went wrong. Please try again.";
    setErrorAlertMessage(message);
    setErrorAlertOpen(true);
  };

  const handleCloseAlert = () => {
  setErrorAlertOpen(false);
  };

  const formMethods = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {}
  });
  const { control, formState: { errors }, setValue, getValues } = formMethods;
  console.log('PATIENT-ID', Id)
  const { data, isFetching } = useGet({
    endpoint: 'patient/get',
    param: { id: Id },
    querykey: 'get-patient-item',
    onErrorCallback: handleError,
  });
  
  return (
    <>
      <FormProvider {...formMethods}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {data && !isFetching ? (
            <>
              {/* Patient Header */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 4, 
                  p: 3, 
                  bgcolor: 'primary.light', 
                  borderRadius: 2,
                  color: 'primary.contrastText'
                }}
              >
                <Avatar 
                  sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.dark' }}
                >
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                    {data.firstName} {data.middleName} {data.lastName}
                  </Typography>


                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} /> 
                    <Typography variant="subtitle1">
                      {data.email || 'N/A'}
                    </Typography>
                  </Box>

                </Box>
              </Box>

              <Grid container spacing={4}>
                {/* Basic Information Card */}
                <Grid item xs={12} md={6}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      boxShadow: 3, 
                      borderRadius: 2,
                      '&:hover': { boxShadow: 6 }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        component="h2" 
                        gutterBottom 
                        sx={{ 
                          fontWeight: 'bold', 
                          color: 'primary.main',
                          borderBottom: '2px solid',
                          borderColor: 'primary.main',
                          pb: 1
                        }}
                      >
                        Basic Information
                      </Typography>

                      <Stack direction="column" spacing={2.5}>
                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">First Name</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.firstName}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Last Name</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.lastName}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Middle Name</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.middleName}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <CakeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Age</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.age} years old</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <CakeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {dayjs(data.birthDate.toString()).format('MMMM DD, YYYY')}
                            </Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <WcIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Sex</Typography>
                            <Chip 
                              label={data.sex === 'M' ? 'Male' : 'Female'} 
                              color={data.sex === 'M' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Contact Information Card */}
                <Grid item xs={12} md={6}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      boxShadow: 3, 
                      borderRadius: 2,
                      '&:hover': { boxShadow: 6 }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        component="h2" 
                        gutterBottom 
                        sx={{ 
                          fontWeight: 'bold', 
                          color: 'primary.main',
                          borderBottom: '2px solid',
                          borderColor: 'primary.main',
                          pb: 1
                        }}
                      >
                        Contact Information
                      </Typography>

                      <Stack direction="column" spacing={2.5}>
                        <Box display="flex" alignItems="center">
                          <HomeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Address</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.address}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Email</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.email}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <PhoneIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Contact Number</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.contactNo}</Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          ) : (
            <Loader />
          )}
        </Container>
        <ErrorAlert
          open={errorAlertOpen}
          message={errorAlertMessage}
          onClose={handleCloseAlert}
        />
      </FormProvider>
    </>
  );
}

export default BasicInfo;
