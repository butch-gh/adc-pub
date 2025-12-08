import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface ErrorAlertProps {
    open: boolean;
    message?: string;
    duration?: number; // Duration in milliseconds
    onClose: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
    open,
    message = "Oops! Something went wrong.",
    duration = 6000,
    onClose,
}) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={duration}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
            <Alert onClose={onClose} severity="error" variant="filled">
                {message}
            </Alert>
        </Snackbar>
    );
};

export default ErrorAlert;
