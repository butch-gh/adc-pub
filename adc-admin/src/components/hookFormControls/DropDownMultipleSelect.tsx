import React from 'react';
import { Controller, Control, FieldError, FieldErrors } from 'react-hook-form';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText, Checkbox, ListItemText } from '@mui/material';

interface DropdownSelectFieldProps {
  name: string;
  label: string;
  control: Control<any>;
  options: { value: string; label: string }[];
  defaultValue?: string[];
  isDisabled?: boolean;
  errors?: FieldErrors<Record<string, any>> | FieldError;
  rules?: any;
}

const isFieldErrors = (errors: any): errors is FieldErrors<Record<string, any>> => {
  return errors && typeof errors === 'object' && 'root' in errors;
};

const DropDownMultipleSelect: React.FC<DropdownSelectFieldProps> = ({
  name,
  label,
  control,
  options,
  defaultValue = [],
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
            multiple
            value={value || []}
            onChange={(e) => onChange(e.target.value as string[])}
            renderValue={(selected) => selected.join(', ')}
            disabled={isDisabled}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={value?.includes(option.value)} />
                <ListItemText primary={option.label} />
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

export default DropDownMultipleSelect;
