import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface DatePickerFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  errors: FieldErrors<any>;
  requiredMessage?: string;
  defaultValue?: any;
  isDisabled?: boolean;
  isTextBoxDisabled?: boolean;
  isNotRequired?: boolean;
  onChange?: (date: any) => void; // Optional onChange prop
}

const StaticDatePickerField: React.FC<DatePickerFieldProps> = ({
  name,
  control,
  label,
  errors,
  requiredMessage = 'This field is required',
  defaultValue = null,
  isDisabled,
  isTextBoxDisabled,
  isNotRequired,
  onChange // Destructure the optional onChange prop
}) => {

  const errorMessage = errors?.[name]?.message ? (errors[name] as any).message : '';

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultValue}
      rules={{ required: requiredMessage }}
      render={({ field: { onChange: fieldOnChange, value } }) => (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {/* Separate label */}
          <Typography variant="body1" gutterBottom>
            {label}
          </Typography>

          {/* TextField for input */}
          <TextField
            value={value ? value.format('YYYY-MM-DD') : ''}
            onClick={(e) => e.stopPropagation()} // Prevents focus from opening calendar
            fullWidth
            margin="normal"
            error={!!errors?.[name]}
            helperText={errorMessage || ''}
            required={!isNotRequired}
            disabled={isTextBoxDisabled}
            onChange={(e) => fieldOnChange(e.target.value)} // Pass value to form control
          />

          {/* Static Date Picker inline */}
          <StaticDatePicker
            displayStaticWrapperAs="desktop"
            value={value}
            disabled={isDisabled}
            onChange={(date) => {
              fieldOnChange(date);
              if (onChange) onChange(date); // Call the optional onChange prop if provided
            }}
          />
        </LocalizationProvider>
      )}
    />
  );
};

export default StaticDatePickerField;
