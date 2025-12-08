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
import useApiCall from 'services/hooks/useApiCall';
import AlertDialog from 'components/Dialog/AlertDialog';

interface ChangeUsernameForm {
  currentUsername: string;
  newUsername: string;
}

const ChangeUserName: React.FC = () => {
  const navigate = useNavigate();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'error' | 'warning' | 'info' | 'success'>('warning');
  const theme = useTheme();
  const { apiCall, loading, error: errorApiCall } = useApiCall();

  const [formData, setFormData] = useState<ChangeUsernameForm>({
    currentUsername: '',
    newUsername: '',
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

    if (formData.newUsername.trim() === '') {
      setError('New Username cannot be empty.');
      return;
    }

    if (formData.newUsername.trim().length < 6) {
      setError('New Username must be at least 6 characters long.');
      return;
  }

    try {
      const response = await apiCall(`${import.meta.env.VITE_API_URL}/appointment/security/changeun`, {
        currentUsername: formData.currentUsername,
        newUsername: formData.newUsername,
      });
      if (response === 'CHANGED_SUCCESS') {
        setSuccessMessage('Username changed successfully!');
        triggerAlert('success', 'Successfully changed username!');
      } else if (response === 'INVALID_CURRENT_USERNAME') {
        setError('Invalid current username.');
        triggerAlert('warning', 'Invalid current username!');
      }

      setFormData({
        currentUsername: '',
        newUsername: '',
      });
    } catch (err) {
      setError('Failed to change username. Please try again.');
      triggerAlert('warning', 'Failed to change username. Please try again.');
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
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: 3,
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
          }}
        >
          <Typography variant="h6" gutterBottom align="center">
            Change Username
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
                label="Current Username"
                name="currentUsername"
                value={formData.currentUsername}
                onChange={handleInputChange}
                required
              />

              <TextField
                fullWidth
                label="New Username"
                name="newUsername"
                value={formData.newUsername}
                onChange={handleInputChange}
                required
              />

              <Button variant="contained" color="primary" type="submit" fullWidth disabled={loading}>
                {loading ? 'Processing...' : 'Change Username'}
              </Button>
            </Stack>
            {loading && <LinearProgress color="primary" sx={{ marginTop: '10px' }} />}
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

export default ChangeUserName;
