import React from 'react';
import { Controller, Control, FieldError, FieldErrors } from 'react-hook-form';
import { FormControl, FormLabel, FormHelperText, Button } from '@mui/material';

interface TimeSlotPickerProps {
  name: string;
  label: string;
  control: Control<any>;
  options: { code: string; description: string; isAvailable: boolean; time: string }[]; // Added `time`
  defaultValue?: string[];
  isDisabled?: boolean;
  errors?: FieldErrors<Record<string, any>> | FieldError;
  rules?: any;
  multiple?: boolean;
  editMode?: boolean; // New prop for edit mode
}

const isFieldErrors = (errors: any): errors is FieldErrors<Record<string, any>> => {
  return errors && typeof errors === 'object' && 'root' in errors;
};

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  name,
  label,
  control,
  options,
  defaultValue = [],
  isDisabled,
  errors,
  rules,
  multiple = false,
  editMode = false, // Default to false
}) => {
  const errorMessage = isFieldErrors(errors) ? errors[name]?.message : errors?.message;

  const currentTime = new Date(); // Get the current time

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={editMode ? defaultValue : []} // Use `defaultValue` in edit mode
      rules={rules}
      render={({ field: { value, onChange } }) => {
        const selectedValues = Array.isArray(value) ? value : [];

        const handleSlotChange = (slot: string) => {
          if (multiple) {
            onChange(
              selectedValues.includes(slot)
                ? selectedValues.filter((val) => val !== slot)
                : [...selectedValues, slot]
            );
          } else {
            onChange(selectedValues.includes(slot) ? [] : [slot]);
          }
        };

        return (
          <FormControl component="fieldset" margin="normal" fullWidth error={!!errorMessage}>
            <FormLabel component="legend">{label}</FormLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {options.map((option) => {
                const slotTime = new Date(option.time); // Convert time string to Date
                const isPast = slotTime < currentTime; // Check if the slot is in the past

                return (
                  <Button
                    key={option.code}
                    variant={selectedValues.includes(option.code) ? 'contained' : 'outlined'}
                    color={selectedValues.includes(option.code) ? 'primary' : 'secondary'}
                    disabled={isDisabled || !option.isAvailable || isPast} // Disable if slot is in the past
                    onClick={() => handleSlotChange(option.code)}
                    sx={{
                      minWidth: '80px',
                      pointerEvents: !option.isAvailable ? 'none': 'auto', // Prevent interaction
                      // Apply different styles for selected and disabled buttons
                      ...(selectedValues.includes(option.code)
                        ? {
                            color: option.isAvailable ? 'text.main' : 'gray', // Use gray if not available
                            backgroundColor: option.isAvailable ? '#0fb491' : 'yellow', // Lighter background for unavailable
                            borderColor: option.isAvailable ? '#0fb491' : 'rgba(0, 0, 0, 0.3)',
                          }
                        : {
                            color: option.isAvailable ? 'text.primary' : 'rgba(0, 0, 0, 0.5)', // Lighter font for unavailable
                            backgroundColor: 'transparent',
                            borderColor: '#0fb491',
                          }),
                    }}
                    // sx={{
                    //   minWidth: '80px',
                    //   ...(selectedValues.includes(option.code)
                    //   ? {
                    //     //pointerEvents: 'none', // Prevent interaction
                    //     color: '#fff', // Normal text color
                    //     backgroundColor: 'primary.main', // Normal background color
                    //     '&.Mui-disabled': {
                    //       color: '#fff', // Override disabled text color
                    //       backgroundColor: 'primary.main', // Override disabled background color
                    //     },
                    //   }
                    //   :{
                    //     //pointerEvents: 'none', // Prevent interaction
                    //     color: 'text.primary', // Normal text color
                    //     borderColor: 'primary.main', // Normal border color
                    //     '&.Mui-disabled': {
                    //       color: 'text.primary', // Override disabled text color
                    //       borderColor: 'primary.main', // Override disabled border color
                    //     },
                    //   })
                      
                    //}}
                  >
                    {option.description}
                  </Button>

                  // <Button
                  //   key={option.code}
                  //   variant={selectedValues.includes(option.code) ? 'contained' : 'outlined'}
                  //   color={selectedValues.includes(option.code) ? 'primary' : 'secondary'}
                  //   disabled={isDisabled || !option.isAvailable || isPast} // Disable if slot is in the past
                  //   onClick={() => handleSlotChange(option.code)}
                  //   sx={{
                  //     minWidth: '80px',
                  //     ...(selectedValues.includes(option.code)
                  //       ? { color: 'text.main', backgroundColor: '#0fb491', borderColor: '#0fb491' }
                  //       : { color: 'text.primary', backgroundColor: 'transparent', borderColor: '#0fb491' }),
                  //   }}
                  // >
                  //   {option.description}
                  // </Button>
                );
              })}
            </div>
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

export default TimeSlotPicker;