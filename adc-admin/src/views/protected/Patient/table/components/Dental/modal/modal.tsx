import React, { useState, useEffect, ReactNode } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useFormContext } from 'react-hook-form';
import { Typography } from '@mui/material';



interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelType: string;
  item: {   
    id: Number;
    tooth: Number; 
    treatment: Number; 
    date: Date;} | null;  
  onSubmit: ()=>void;
  children : ReactNode;  
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, labelType, item, onSubmit, children }) => {
    const { handleSubmit } = useFormContext<FormData>();
    const [itemName, setItemName] = useState('');
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('lg'));
    // useEffect(() => {
    //     if (item) {
    //     setItemName(item.tooth);
    //     } else {
    //     setItemName('');
    //     }
    // }, [item]);

  return (
    <>
    {
    isOpen && (

        <Dialog
        fullScreen={fullScreen}
        open={isOpen}
        onClose={onClose}
        aria-labelledby="responsive-dialog-title"
        >
        <DialogTitle id="responsive-dialog-title">
        <Typography variant="h5" component="span" gutterBottom>
            {labelType}
        </Typography>
        
        </DialogTitle>
        <DialogContent>
        <DialogContentText>            
            
            {children}

        </DialogContentText>
        </DialogContent>
        <DialogActions>
        <Button variant='contained' onClick={onClose} autoFocus>
          Close
        </Button>
        <Button variant='contained' onClick={handleSubmit(onSubmit)}>
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