import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface WarningPopupProps {
  open: boolean;
  title?: string; // Optional custom title
  message: string; // Message to display in the warning
  onClose: () => void; // Function to close the dialog
  onConfirm?: () => void; // Optional confirmation function
}

const WarningDialog: React.FC<WarningPopupProps> = ({
  open,
  title = 'Warning',
  message,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="warning-dialog-title"
      aria-describedby="warning-dialog-description"
    >
      <DialogTitle id="warning-dialog-title" style={{ display: 'flex', alignItems: 'center' }}>
        <WarningAmberIcon style={{ color: 'orange', marginRight: 8 }} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="warning-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        {onConfirm && (
          <Button onClick={onConfirm} color="warning" variant="contained">
            Confirm
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WarningDialog;
