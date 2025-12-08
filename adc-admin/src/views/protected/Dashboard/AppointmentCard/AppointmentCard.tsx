import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Link,
  useTheme,
} from "@mui/material";
import useGet from "services/hooks/useGet";
import dayjs from "dayjs";

interface Patient {
  name: string;
  details: string;
}

interface Appointments {
  title: string;
  date: string;
  patients: Patient[];
}

const AppointmentCard: React.FC = () => {  
  const [appointmentsData, setAppointmentsData] = useState<Appointments[]>([]);
  const theme = useTheme();

  const { data } = useGet({
    endpoint: "dashboard/getappointments",
    param: {},
    querykey: "get-appointments-counts",
  });

  useEffect(() => {
    if (data) {
      //console.log("data from useGet:", data); 
      const appointments = data['sf_get_dashboard_apointments'];

      if (appointments && Array.isArray(appointments)) {
        setAppointmentsData(appointments);
      } else {        
        setAppointmentsData([]);  
      }
    } else {      
      setAppointmentsData([]);
    }
  }, [data]);

  function onSeeAllPatients(){
    console.log("See all patients clicked!");
    window.location.href = '/appointment';
  };

  return (
    <Stack direction="row" spacing={2} marginTop={4}>
      {appointmentsData && appointmentsData.length > 0 ? (
        appointmentsData?.map((appointment, index) => (
          <Card key={index} sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6">{appointment.title}</Typography>
              <Typography variant="subtitle1" color="textSecondary">
                { dayjs(appointment.date).format('YYYY-MM-DD')}
              </Typography>
              <Stack spacing={1} marginTop={2}>
                {appointment.patients ? appointment.patients.map((patient, idx) => (
                  
                  <Typography key={idx} variant="body1">
                    {patient.name} -{" "}
                    <Typography
                      component="span"
                      variant="body2"
                      color="textSecondary"
                    >
                      {patient.details}
                    </Typography>
                  </Typography>                  
                ))
                :
                  <Typography variant="body1" color="red">
                    {"No appointment'(s) found."}
                  </Typography>
                }
              </Stack>              

              {
                appointment.patients &&
                <Link
                  component="button"
                  onClick={onSeeAllPatients} // Handles navigation
                  underline="hover" // Adds underline on hover
                  sx={{
                    display: 'inline-flex', // Ensures proper alignment with the icon
                    alignItems: 'center',
                    textTransform: 'none',
                    color: theme.palette.mode==='dark' ? '#81d4fa' : '#00bcd4',                
                    fontSize: '0.875rem', // Matches small button text size
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline', // Emphasize hover state
                    },
                  }}
                >
                  See all patients
                  <i
                    className="fas fa-arrow-right"
                    style={{ marginLeft: '8px', fontSize: '0.75rem' }} // Adjust spacing and icon size
                  />
                </Link>
              }
              
            </CardContent>
          </Card>
        ))
      ) : (
        <Typography>No appointments found</Typography>
      )}
    </Stack>
  );
};

export default AppointmentCard;
