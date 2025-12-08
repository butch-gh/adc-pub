import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';


interface DatePickerFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  errors: FieldErrors<any>;
  requiredMessage?: string;
  defaultValue?: any;
  isDisabled?: boolean;
  isNotRequired?: boolean;
  maxDate?: Dayjs;
  onChange?: (date: any) => void; // Optional onChange prop
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  name,
  control,
  label,
  errors,
  requiredMessage = 'This field is required',
  defaultValue = null,
  isDisabled,
  isNotRequired,
  maxDate,
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
          <DatePicker
            label={label}
            value={value}
            disabled={isDisabled}
            maxDate={maxDate}
            onChange={(date) => {
              fieldOnChange(date);
              if (onChange) onChange(date); // Call the optional onChange prop if provided
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                margin: 'normal',
                error: !!errors?.[name],
                helperText: errorMessage || '',  
                required: !isNotRequired,
              },
            }}
          />
        </LocalizationProvider>
      )}
    />
  );
};

export default DatePickerField;
