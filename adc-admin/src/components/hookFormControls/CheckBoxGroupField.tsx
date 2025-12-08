import React from 'react';
import { Controller, Control, FieldError, FieldErrors } from 'react-hook-form';
import { FormControl, FormControlLabel, FormLabel, FormHelperText, Checkbox, Stack } from '@mui/material';

type DirectionTypeValue = 'row' | 'column';

interface CheckboxGroupFieldProps {
  name: string;
  label: string;
  control: Control<any>;
  options: { code: string; description: string }[];
  defaultValue?: [];
  isDisabled?: boolean;
  errors?: FieldErrors<Record<string, any>> | FieldError;
  rules?: any;
  direction: DirectionTypeValue;
}

const isFieldErrors = (errors: any): errors is FieldErrors<Record<string, any>> => {
  return errors && typeof errors === 'object' && 'root' in errors;
};

const CheckBoxGroupField: React.FC<CheckboxGroupFieldProps> = ({
  name,
  label,
  control,
  options,
  defaultValue = [],
  isDisabled,
  errors,
  rules,
  direction
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
      render={({ field: { value, onChange } }) => {
        const checkedValues = Array.isArray(value) ? value : []; // Ensure `checkedValues` is always an array

        return (
          <FormControl component="fieldset" margin="normal" fullWidth error={!!errorMessage}>
            <FormLabel component="legend">{label}</FormLabel>
            <Stack direction={direction} width={400}>
              {options.map((option) => (
                <FormControlLabel
                  disabled={isDisabled}
                  key={option.code}                            
                  control={
                    <Checkbox
                      checked={checkedValues.includes(option.code)}
                      onChange={(e) => {
                        const newValue = e.target.checked
                          ? [...checkedValues, option.code]
                          : checkedValues.filter((val: string) => val !== option.code);
                        onChange(newValue);
                      }}
                    />
                  }
                  label={option.description}
                />
              ))}
            </Stack>
            {errorMessage && (
              <FormHelperText>
                {typeof errorMessage === 'string' ? errorMessage : ''}
              </FormHelperText>
            )}
          </FormControl>
        );
      }}
    />
  );
};

export default CheckBoxGroupField;

