import React from 'react';
import { Controller, Control, FieldError, FieldErrors } from 'react-hook-form';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';

interface DropdownFieldProps {
  name: string;
  label: string;
  control: Control<any>;
  options: { id: number; description: string }[];
  defaultValue?: string;
  isDisabled?: boolean;
  errors?: FieldErrors<Record<string, any>> | FieldError;
  rules?: any;
}

const isFieldErrors = (errors: any): errors is FieldErrors<Record<string, any>> => {
  return errors && typeof errors === 'object' && 'root' in errors;
};

const DropDownField: React.FC<DropdownFieldProps> = ({
  name,
  label,
  control,
  options,
  defaultValue = '',
  isDisabled,
  errors,
  rules,
}) => {
  const errorMessage = isFieldErrors(errors)
    ? errors[name]?.message 
    : errors?.message;

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultValue}
      rules={rules}
      render={({ field: { value, onChange } }) => (
        <FormControl fullWidth margin="normal" error={!!errorMessage}>
          <InputLabel>{label}</InputLabel>
          <Select
            label={label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={isDisabled}
          >
            {options.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.description}
              </MenuItem>
            ))}
          </Select>
          {errorMessage && (
            <FormHelperText>{typeof errorMessage === 'string' ? errorMessage : ''}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};

export default DropDownField;
