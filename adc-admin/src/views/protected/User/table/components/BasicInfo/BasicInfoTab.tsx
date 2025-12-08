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
  Work as WorkIcon,
  Security as SecurityIcon,
  CalendarToday as CalendarIcon
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

interface BasicInfo {
  firstName: string;
  lastName: string;
  mI: string;
  birthDate: dayjs.Dayjs | null;
  age: number;
  sex: string;
  selectedJob: number;
  daysOnDuty: string[];
}

interface ContactInfo {
  address: string;
  email: string;
  contactNo: string;
}

interface AccessPrivilege {
  selectedRole: number;
}

interface Internal {
  id: number;
  method: string;
}

interface FormData {
  basicInfo: BasicInfo;
  contactInfo: ContactInfo;
  accessPrivilege: AccessPrivilege;
  internal: Internal;
}

type JobLOV = {
  id: number;
  name: string;
  description: string;
};

type RoleLOV = {
  id: number;
  description: string;
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
  const [jobLOV, setJobLOV] = useState<JobLOV[]>([]);
  const [roleLOV, setRoleLOV] = useState<RoleLOV[]>([]);
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
    endpoint: "user/get",
    param: { id: Id },
    querykey: "get-user-item",
    onErrorCallback: handleError,
  });

  const { data: jobData, isFetching: jobIsFetching } = useGet({
    endpoint: "job/getall",
    param: {},
    querykey: "get-job-item",
  });

  const { data: roleData, isFetching: roleIsFetching } = useGet({
    endpoint: "role/getall",
    param: {},
    querykey: "get-role-item",
  });

  useEffect(() => {
    if (jobData) {
      setJobLOV(jobData);
      //console.log("jobData", jobData);
    }
  }, [jobData]);

  useEffect(() => {
    if (roleData) {
      setRoleLOV(roleData);
      //console.log(roleData);
    }
  }, [roleData]);

  useEffect(() => {
    if (data) {
      setValue("basicInfo.firstName", data.first_name);
      setValue("basicInfo.lastName", data.last_name);
      setValue("basicInfo.mI", data.middle_initial);
      setValue("basicInfo.sex", data.sex == "M" ? "male" : "female");
      setValue("basicInfo.birthDate", dayjs(data.birthdate.toString()));
      setValue("basicInfo.age", data.age);
      setValue("basicInfo.selectedJob", data.jobId);
      setValue("basicInfo.daysOnDuty", JSON.parse(data.days_on_duty));
      setValue("contactInfo.email", data["emailaddress"]);
      setValue("contactInfo.contactNo", data["contact_no"]);
      setValue("contactInfo.address", data["address"]);
      setValue("accessPrivilege.selectedRole", data.roleId);
    }
  }, [data]);

  return (
    <>
      <FormProvider {...formMethods}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {data && !isFetching ? (
            <>
              {/* User Header */}
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
                    {data.first_name} {data.middle_initial} {data.last_name}
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

                        <Box display="flex" alignItems="center">
                          <WorkIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Job</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {jobLOV.find(job => job.id === data.jobId)?.name || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Days on Duty</Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {JSON.parse(data.days_on_duty)?.length > 0 ? (
                                JSON.parse(data.days_on_duty).map((day: string) => (
                                  <Chip 
                                    key={day} 
                                    label={day} 
                                    size="small" 
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                    variant="outlined"
                                  />
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">None</Typography>
                              )}
                            </Box>
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

                {/* Access Privilege Card */}
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
                        <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Access Privilege
                      </Typography>

                      <Stack direction="column" spacing={2.5}>
                        <Box display="flex" alignItems="center">
                          <SecurityIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">Role</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {roleLOV.find(role => role.id === data.roleId)?.description || 'N/A'}
                            </Typography>
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
};

export default BasicInfo;
