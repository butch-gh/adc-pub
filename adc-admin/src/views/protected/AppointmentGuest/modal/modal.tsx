import React, { useState, useEffect, ReactNode } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useFormContext } from 'react-hook-form';
import { Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

interface Item {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
  service: string;
  appointment_date: Date;  
  code: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelType: string;
  onSubmit: ()=>void;
  children : ReactNode;
  isSubmitDisabled?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, labelType, onSubmit, children, isSubmitDisabled = false }) => {
    const { handleSubmit } = useFormContext<FormData>();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('xl'));
    
    // Only use the date-based disable check, allow submit even if not dirty
    // This allows status-only changes to be submitted
    const shouldDisableSubmit = isSubmitDisabled;

  return (
    <>
    {
    isOpen && (

        <Dialog
        open={isOpen}
        onClose={onClose}
        aria-labelledby="responsive-dialog-title"
        maxWidth="md"
        fullWidth={true}
        >
        <DialogTitle id="responsive-dialog-title">
        <Typography variant="h5" component="span" gutterBottom>
            {labelType}
        </Typography>
        
        </DialogTitle>
        <DialogContent>
            {children}
        </DialogContent>
        <DialogActions>
        <Button variant='contained' onClick={onClose} autoFocus startIcon={<CloseIcon/>}>
            Close
        </Button>
        <Button variant='contained' onClick={handleSubmit(onSubmit)} startIcon={<SaveIcon/>} disabled={shouldDisableSubmit}>
          Submit
        </Button>
        </DialogActions>
        </Dialog>
    )
    }
    </>
  );
};

export default Modal;
