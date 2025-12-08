import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertProps, SnackbarOrigin } from '@mui/material';

interface AlertDialogProps {
  open: boolean;
  message: string;
  severity?: AlertProps['severity']; // Allows 'error', 'warning', 'info', 'success'
  duration?: number;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right' | 'center-top' | 'center-bottom';
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  message,
  severity,
  duration = 6000,
  onClose,
  position = 'bottom-right',
}) => {
  const getAnchorOrigin = (): SnackbarOrigin => {
    switch (position) {
      case 'top-right':
        return { vertical: 'top', horizontal: 'right' };
      case 'top-left':
        return { vertical: 'top', horizontal: 'left' };
      case 'bottom-left':
        return { vertical: 'bottom', horizontal: 'left' };
      case 'bottom-right':
        return { vertical: 'bottom', horizontal: 'right' };
      case 'center-top':
        return { vertical: 'top', horizontal: 'center' };
      case 'center-bottom':
        return { vertical: 'bottom', horizontal: 'center' };
      default:
        return { vertical: 'top', horizontal: 'right' }; // Default position
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}      
      anchorOrigin={getAnchorOrigin()}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: 'auto' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AlertDialog;
