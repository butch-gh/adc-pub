import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  LinearProgress,
  useTheme,  
} from '@mui/material';
import axios from 'axios';
import useApiCall from 'services/hooks/useApiCall';
import AlertDialog from 'components/Dialog/AlertDialog';


interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
  const theme = useTheme();
  const { apiCall, loading, error: errorApiCall } = useApiCall();

  const [formData, setFormData] = useState<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New Password and Confirm Password do not match.');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('New Password must be at least 6 characters long.');
      return;
    }

    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment/security/changepw`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      if (response === 'CHANGED_SUCCESS') {
        setSuccessMessage('Password changed successfully!');
        triggerAlert('success', 'Successfully changed password!');
      } else if (response === 'INVALID_CURRENT_PASSWORD') {
        setError('Invalid current password.');
        triggerAlert('warning', 'Invalid current password!');
      }

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError('Failed to change password. Please try again.');
      triggerAlert('warning', 'Failed to change password. Please try again.');
    }
  };

  const triggerAlert = (newSeverity: 'error' | 'warning' | 'info' | 'success', newMessage: string) => {
    setAlertSeverity(newSeverity);
    setAlertMessage(newMessage);
    setIsAlertOpen(true);
  };

  const handleCloseAlertDialog = () => {
    setIsAlertOpen(false);
  };

  return (
    <>
      

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'baseline',
          height: '100vh',          
          backgroundColor: theme.palette.background.paper,          
          color: theme.palette.text.primary,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 600,
            marginTop: '100px',
            padding: 3,
            backgroundColor: theme.palette.background.paper, // Form background
            borderRadius: 2,
            boxShadow: 3,
            borderColor: theme.palette.divider, // Adjust border color for light/dark mode
            color: theme.palette.text.primary, // Ensure text aligns with theme
          }}
        >
          <Typography variant="h6" gutterBottom align="center">
            Change Password
          </Typography>

          {error && (
            <Typography color="error" sx={{ marginBottom: 2 }} align="center">
              {error}
            </Typography>
          )}
          {successMessage && (
            <Typography color="primary" sx={{ marginBottom: 2 }} align="center">
              {successMessage}
            </Typography>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                required
              />

              <TextField
                fullWidth
                label="New Password"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
                inputProps={{ minLength: 6 }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />

              <Button variant="contained" color="primary" type="submit" fullWidth disabled={loading}>
                {loading ? 'Processing...' : 'Change Password'}
              </Button>
            </Stack>
            {loading && <LinearProgress color="primary" sx={{marginTop:'10px'}}/>}
          </form>
        </Box>
      </Box>

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

export default ChangePassword;