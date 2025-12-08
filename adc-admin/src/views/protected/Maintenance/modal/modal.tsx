import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Box, TextField } from '@mui/material';
import AccessPrivilege from '../components/AccessPrivilege';
import JobForm from './forms/JobForm';
import AccessPrivilegeForm from './forms/AccessPrivilegeForm';
import PaymentMethodForm from './forms/PaymentMethodForm';
import TreatmentForm from './forms/TreatmentForm';
import { useFormContext } from 'react-hook-form';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelType: string;
  item: { id: number; description: string; duration: number} | null;
  onSave: (item: { id: number; description: string; duration: number }) => void;
  componentType: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, labelType, item, onSave, componentType }) => {
  const { control, formState: { errors }, getValues, setValue, trigger, watch } = useFormContext();
  const [itemName, setItemName] = useState('');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('lg'));


  useEffect(() => {
    if (item) {
      setItemName(item.description);
      setValue('internal.id', item.id);
      if (componentType === 'Treatments') {
        setValue('formFields.duration', item.duration || 0); // Set duration if available
      }
    } else {
      setItemName('');
      setValue('internal.id', null);
      if (componentType === 'Treatments') {
        setValue('formFields.duration', 0); // Default duration
      }
    }
  }, [item, componentType]);

  

  const handleAddOrEdit = async () => {
    const isValid = await trigger(); // Wait for validation to complete
    if (isValid) {
        const newItem = {
            id: item ? item.id : Date.now(),
            description: itemName,
            duration: componentType === 'Treatments' ? getValues('formFields.duration') || 0 : undefined, // Ensure duration is always included for Treatments
        };

        // Remove the `duration` property if it's not relevant for other component types
        if (componentType !== 'Treatments') {
            delete newItem.duration;
        }

        onSave(newItem as { id: number; description: string; duration: number }); // Type assertion to match the expected type
    } else {
      console.log('Validation failed');
    }
  };

  //console.log('itemname:', itemName)
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
        {labelType}
        </DialogTitle>
        <DialogContent>
        <DialogContentText>            
          {
            componentType === 'Access Privilege' ?
            <AccessPrivilegeForm id={item?.id}></AccessPrivilegeForm>  :
            componentType === 'Job' ?
            <JobForm id={item?.id}></JobForm>:
            componentType === 'Payment Method' ?
            <PaymentMethodForm id={item?.id}></PaymentMethodForm> :
            componentType === 'Treatments' ?
            <TreatmentForm id={item?.id}></TreatmentForm> :
            <></>
          }            
        </DialogContentText>
        </DialogContent>
        <DialogActions>
        <Button onClick={handleAddOrEdit} color="primary" variant="contained" startIcon={<SaveIcon/>}>
          {item ? 'Save Changes' : 'Add'}
        </Button>
        <Button variant='contained' startIcon={<CloseIcon/>} onClick={onClose} autoFocus >
            Close
        </Button>
        </DialogActions>
        </Dialog>
    )
    }
    </>
  );
};

export default Modal;