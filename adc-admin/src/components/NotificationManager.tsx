import React, { useState, useEffect, useCallback } from 'react';
import { Drawer, Typography, Divider, Stack, Box, List, ListItem, ListItemText, LinearProgress } from '@mui/material';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import useApiCall from 'services/hooks/useApiCall';
import useLogActivity from 'services/hooks/useLogActivity';
import AlertDialog from 'components/Dialog/AlertDialog';
import { use } from 'echarts';

type Guest = {
  id: number;
  guest: string;
  mobile_number: string;
  treatment: string;
  appointment_date: string;
  appointment_time_slot: string;
  created_at: string;
  status: string;
};

interface NotificationManagerProps {
  userJob: string;
  isOpen: boolean;
  onToggle: () => void;
  onNotifCountChange: (count: number) => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({
  userJob,
  isOpen,
  onToggle,
  onNotifCountChange,
}) => {
  const [guest, setGuest] = useState<Guest[]>([]);
  const [loadingApproval, setLoading] = useState<Record<number, boolean>>({});
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');

  const { apiCall } = useApiCall();
  const { logActivity } = useLogActivity();

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const convertTo12Hour = (time24: string): string => {
    if (!time24) return time24;
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const minute = minutes || '00';
    
    if (hour === 0) {
      return `12:${minute} AM`;
    } else if (hour < 12) {
      return `${hour}:${minute} AM`;
    } else if (hour === 12) {
      return `12:${minute} PM`;
    } else {
      return `${hour - 12}:${minute} PM`;
    }
  };

  useEffect(() => {
    if (userJob === 'Dentist') {
      //console.log('Connecting to SSE for userJob:', userJob);
      
      // Use API Gateway for SSE connection
      //const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/appointment-public-sse/appointment-guest-sse/notifstream`);
      // Fallback direct connection (for development/debugging)
      const eventSource = new EventSource(`${import.meta.env.VITE_API_DIRECT_URL}/appointment-guest/notifstream`);

      eventSource.onopen = (event) => {
        console.log('SSE Connection opened:', event);
      };

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          //console.log('Raw SSE event data:', event.data); // Log raw data first
          const data = JSON.parse(event.data);
          //console.log('Parsed SSE Message:', data); // Log the parsed message data
          setGuest(data);
          const count = data.filter((d: any) => d.status === 'pending').length;
          onNotifCountChange(count);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
          console.error('Raw data that failed to parse:', event.data);
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE Connection error:', event);
        console.error('EventSource readyState:', eventSource.readyState);
        console.error('EventSource url:', eventSource.url);
      };

      //console.log('SSE EventSource created:', eventSource);
      //console.log('SSE URL:', `${import.meta.env.VITE_API_URL}/appointment-public/appointment-guest/notifstream`);

      return () => {
        console.log('Closing SSE connection');
        eventSource.close(); // Cleanup on unmount
      };
    }
  }, [userJob, onNotifCountChange]);

  const handleApprove = async (newStatus: string, _guest: Guest) => {
    setLoading((prev) => ({ ...prev, [_guest.id]: true }));
    const apiParam = { newStatus };
    const endpoint = '/appointment-guest/approve';

    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment${endpoint}`, { id: _guest.id, ...apiParam });

      if (response) {
        if (response.msg) {
          await logActivity({
            action: 'Update',
            module: 'ADC-ADMIN:Notification',
            details: JSON.stringify({ status: 'failed', detail: `Updated item ID: ${_guest.id}, Warning: ${response.msg}`, endpoint }),
          });
          triggerAlert('warning', response.msg);
        } else {
          await logActivity({
            action: 'Update',
            module: 'ADC-ADMIN:Notification',
            details: JSON.stringify({ status: 'success', detail: `Updated item ID: ${_guest.id}`, endpoint }),
          });
          triggerAlert('success', 'Successfully updated!');
        }

        const timeSlot = JSON.parse(_guest.appointment_time_slot);
        const formattedTimeSlot = `${convertTo12Hour(timeSlot.startTime)} - ${convertTo12Hour(timeSlot.endTime)}`;
        const sched = format(new Date(_guest.appointment_date), 'EEE, d MMMM yyyy') + ' ' + formattedTimeSlot;
        const spiel = newStatus === 'confirmed'
          ? `Your request has been confirmed. Please arrive at our clinic on or before your scheduled time at ${sched}. Thank you.`
          : `We regret to inform you that your appointment scheduled for ${sched} has been cancelled due to conflict of time. Please contact our clinic to reschedule at your earliest convenience. We apologize for any inconvenience caused. Thank you.`;

        const apiSMSParam = {
          to: "+63" + _guest.mobile_number,
          message: `Good day, ${_guest.guest}. ${spiel}`,
        };

        const smsresponse = await apiCall(`${import.meta.env.VITE_API_URL}/appointment/sms/send`, { ...apiSMSParam });
        if (smsresponse) {
          await logActivity({
            action: 'Send',
            module: 'ADC-ADMIN:SMS',
            details: JSON.stringify({ status: 'success', detail: `Send SMS to: ${_guest.mobile_number}`, endpoint }),
          });
        } else {
          await logActivity({
            action: 'Send',
            module: 'ADC-ADMIN:SMS',
            details: JSON.stringify({ status: 'failed', detail: `Send SMS to: ${_guest.mobile_number}`, endpoint }),
          });
        }
      }
    } catch (error) {
      await logActivity({
        action: 'Update',
        module: 'ADC-ADMIN:Notification',
        details: JSON.stringify({ status: 'failed', detail: 'Error: ' + error, endpoint }),
      });
    }

    setLoading((prev) => ({ ...prev, [_guest.id]: false }));
  };

  const triggerAlert = (newSeverity: 'error' | 'warning' | 'info' | 'success', newMessage: string) => {
    setAlertSeverity(newSeverity);
    setAlertMessage(newMessage);
    setIsAlertOpen(true);
  };

  const handleCloseAlertDialog = () => {
    setIsAlertOpen(false);
  };

  useEffect(() => {
    if (!guest) {
      console.log('No guest notifications available.', guest);
    }
  }, [guest]);

  return (
    <>
      <Drawer anchor="right" open={isOpen} onClose={onToggle}>
        <Typography variant="h6" sx={{ marginTop: 12, paddingX: 2 }}>
          Guest Appointments
        </Typography>
        <Typography variant="caption" sx={{ paddingX: 2 }}>
          Manage confirmation.
        </Typography>

        <Divider />
        <Stack>
          <Box>
            <List sx={{ width: 500 }}>
              {guest.map((g) => (
                <React.Fragment key={g.id}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1,
                      padding: 2,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
                      <Typography variant="body1" color="#cf91d0">
                        {g.treatment}
                      </Typography>
                      <Typography variant="body1">
                        {formatDistanceToNow(new Date(g.created_at), { addSuffix: true })}
                      </Typography>
                    </Stack>
                    <ListItemText
                      primary={g.guest}
                      secondary={
                        format(new Date(g.appointment_date), 'EEE, d MMMM yyyy') + '   ' + ' - ' + (() => {
                          try {
                            const timeSlot = JSON.parse(g.appointment_time_slot);
                            return `${convertTo12Hour(timeSlot.startTime)} - ${convertTo12Hour(timeSlot.endTime)}`;
                          } catch (error) {
                            return g.appointment_time_slot; // fallback to raw string if parsing fails
                          }
                        })()
                      }
                    />
                    <Stack direction="column" gap={1} width="100%">
                      <Stack direction="row" gap={3}>
                        {g.status !== 'confirmed' && (
                          <Link
                            to="#"
                            onClick={() => handleApprove('confirmed', g)}
                            style={{
                              color: '#0e9f8f',
                              pointerEvents: loadingApproval[g.id] ? 'none' : 'auto',
                              opacity: loadingApproval[g.id] ? 0.5 : 1,
                            }}
                          >
                            Approve
                          </Link>
                        )}
                        {g.status !== 'cancelled' && (
                          <Link
                            to="#"
                            onClick={() => handleApprove('cancelled', g)}
                            style={{
                              color: '#0e9f8f',
                              pointerEvents: loadingApproval[g.id] ? 'none' : 'auto',
                              opacity: loadingApproval[g.id] ? 0.5 : 1,
                            }}
                          >
                            Cancel
                          </Link>
                        )}
                        <Typography variant="body1" color="#cf91d0">
                          {g.status}
                        </Typography>
                      </Stack>
                      {loadingApproval[g.id] && <LinearProgress />}
                    </Stack>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Stack>
      </Drawer>

      <AlertDialog
        open={isAlertOpen}
        message={alertMessage}
        severity={alertSeverity}
        position="center-top"
        duration={6000}
        onClose={handleCloseAlertDialog}
      />
    </>
  );
};

export default NotificationManager;