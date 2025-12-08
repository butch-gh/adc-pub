import React from 'react';
import { Controller, Control, FieldError, FieldErrors } from 'react-hook-form';
import { FormControl, FormControlLabel, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/material';

interface RadioGroupFieldProps {
  name: string;
  label: string;
  control: Control<any>;
  options: { value: string; label: string }[];
  defaultValue?: string;
  isDisabled?: boolean;
  errors?: FieldErrors<Record<string, any>> | FieldError;
  rules?: any;
}


const isFieldErrors = (errors: any): errors is FieldErrors<Record<string, any>> => {
  return errors && typeof errors === 'object' && 'root' in errors;
};

const RadioGroupField: React.FC<RadioGroupFieldProps> = ({
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
      render={({ field }) => (
        <FormControl component="fieldset" margin="normal" fullWidth error={!!errorMessage}>
          <FormLabel component="legend">{label}</FormLabel>
          <RadioGroup {...field} row>
            {options.map((option) => (
              <FormControlLabel
              disabled={isDisabled}
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
          {errorMessage && (
            <FormHelperText>
              {typeof errorMessage === 'string' ? errorMessage : ''}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};

export default RadioGroupField;
