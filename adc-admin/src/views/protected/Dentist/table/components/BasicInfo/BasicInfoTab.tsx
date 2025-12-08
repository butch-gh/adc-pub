import { useForm, FormProvider } from "react-hook-form";
import React, { useEffect, useState } from "react";
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Stack, 
  Paper,
  Grid,
  Avatar,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Cake as CakeIcon,
  Wc as WcIcon,
  Schedule as ScheduleIcon
} from "@mui/icons-material";
import dayjs from "dayjs";
import useGet from "services/hooks/useGet";
import CheckBoxGroupField from "components/hookFormControls/CheckBoxGroupField";
import DatePickerField from "components/hookFormControls/DatePicker";
import DropDownField from "components/hookFormControls/DropDownField";
import FormInput from "components/hookFormControls/InputField";
import RadioGroupField from "components/hookFormControls/RadioGroupFieldProps";
import ErrorAlert from "components/Dialog/ErrorAlert";
import Loader from "components/loader";

type ScheduleData = {
  [key: string]: { from: string; to: string };
};

interface Scheduletimes {
  schedule: { [key: string]: boolean };
  times: ScheduleData;
}

interface BasicInfo {
  firstName: string;
  lastName: string;
  mI: string;
  birthDate: dayjs.Dayjs | null;
  age: number;
  sex: string;
}

interface ContactInfo {
  address: string;
  email: string;
  contactNo: string;
}

// interface TimeScheduleInfo {
//   timeSchedule: string[];
// }

interface Internal {
  id: number;
  method: string;
}

interface FormData {
  basicInfo: BasicInfo;
  contactInfo: ContactInfo;
  //timeScheduleInfo: TimeScheduleInfo;
  internal: Internal;
  scheduleTimes : Scheduletimes;
}

type DaysAbbreviation = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

type TimeRange = {
  from: string;
  to: string;
};

// const data: Record<DaysAbbreviation, TimeRange> = {
//   MON: { from: '11:38', to: '23:38' },
//   TUE: { from: '09:05', to: '17:05' },
//   // Add other days if needed
// };

const days: Record<string, string> = {
  'MON': 'MON',
  'TUE': 'TUE',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun'
};


interface Props {
  Id: number | null;
}


const BasicInfo: React.FC<Props> = ({ Id }) => {
  const formMethods = useForm<FormData>({
    mode: "onChange",
    defaultValues: {},
  });

  const { control, formState: { errors }, getValues, setValue, watch } = formMethods;

  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");

  

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
//console.log('USER-ID', Id)
  const { data, isFetching } = useGet({
    endpoint: "dentist/get",
    param: { id: Id },
    querykey: "get-dentist-item",
    onErrorCallback: handleError,
  });

  

  useEffect(() => {
    if (data) {
      const pTimes = JSON.parse(data.times);
      //console.log("Data: ", JSON.parse(data.times))
      setValue("basicInfo.firstName", data.first_name);
      setValue("basicInfo.lastName", data.last_name);
      setValue("basicInfo.mI", data.middle_initial);
      setValue("basicInfo.sex", data.sex == "M" ? "male" : "female");
      setValue("basicInfo.birthDate", dayjs(data.birthdate.toString()));
      setValue("basicInfo.age", data.age);
      setValue("contactInfo.email", data["emailaddress"]);
      setValue("contactInfo.contactNo", data["contact_no"]);
      setValue("contactInfo.address", data["address"]);
      //setValue("timeScheduleInfo.timeSchedule", JSON.parse(data.time_schedule));
      setValue('scheduleTimes.schedule', JSON.parse(data.schedule));
      setValue('scheduleTimes.times', JSON.parse(data.times));

      //console.log(Object.entries(pTimes));

      const output = Object.entries(pTimes as Record<string, TimeRange>)
        .map(([key, value]) =>
          `${days[key]} -> ${key} from: ${value.from} to: ${value.to}`
        )
        .join('\n');

      //console.log(output);

                            
      // data.times.map(([key, value]: [DaysAbbreviation, TimeRange]) => {
      //                     console.log("TRACE", key, value);
      //                     // <div key={key}>
      //                     //   {`${days[key]} -> from: ${value.from} to: ${value.to}`}
      //                     // </div>
      //                   })                      
     }

  }, [data]);

  const schedtimedata = getValues('scheduleTimes.times') as ScheduleData;
  

  return (
    <>
      <FormProvider {...formMethods}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {data && !isFetching ? (
            <>
              {/* Dentist Header */}
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
                    Dr. {data.first_name} {data.middle_initial} {data.last_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} /> 
                    <Typography variant="subtitle1">
                      {data.emailaddress || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Grid container spacing={4}>
                {/* Basic Information Card */}
                <Grid item xs={12} md={4}>
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
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.first_name}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Last Name</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.last_name}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Middle Name</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.middle_initial}</Typography>
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
                              {dayjs(data.birthdate.toString()).format('MMMM DD, YYYY')}
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
                <Grid item xs={12} md={4}>
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
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.emailaddress}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <PhoneIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Contact Number</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{data.contact_no}</Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Time Schedule Card */}
                <Grid item xs={12} md={4}>
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
                        <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Time Schedule
                      </Typography>

                      <List dense sx={{ pt: 1 }}>
                        {Object.entries(JSON.parse(data.times) as Record<string, TimeRange>).map(([key, value]: [string, TimeRange]) => (
                          <ListItem key={key} sx={{ px: 0, py: 0.5 }}>
                            <ListItemText
                              primary={
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {days[key]}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {value.from} - {value.to}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
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
};

export default BasicInfo;
