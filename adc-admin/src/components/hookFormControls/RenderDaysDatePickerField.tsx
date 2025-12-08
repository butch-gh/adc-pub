import React from 'react';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import dayjs, { Dayjs } from 'dayjs';

interface DatePickerFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  errors: FieldErrors<any>;
  requiredMessage?: string;
  defaultValue?: Dayjs | null;
  isDisabled?: boolean;
  isTextBoxDisabled?: boolean;
  isNotRequired?: boolean;
  onChange?: (date: Dayjs | null) => void; 
  appointmentDays?: string[]; 
}

const RenderDaysDatePickerField: React.FC<DatePickerFieldProps> = ({
  name,
  control,
  label,
  errors,
  requiredMessage = 'This field is required',
  defaultValue = null,
  isDisabled,
  isTextBoxDisabled,
  isNotRequired,
  onChange,
  appointmentDays = [], 
}) => {
  const errorMessage = errors?.[name]?.message ? (errors[name] as any).message : '';

  const renderCustomDay = (
    day: Dayjs,
    _selectedDates: Dayjs | null,
    pickersDayProps: PickersDayProps<Dayjs>
  ) => {
    const isAppointmentDay = appointmentDays.includes(day.format('YYYY-MM-DD'));
    const isSelected = _selectedDates?.isSame(day, 'day');

    return (      
      <Badge
        key={day.toString()}
        overlap="circular"
        badgeContent={isAppointmentDay ? (
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%', // Circle shape
            //backgroundColor: 'rgba(255, 165, 0, 0.75)', 
            backgroundColor: 'orange',
            //border: '2px solid rgba(255, 165, 0, 0.5)', 
            display: 'inline-block',
          }} />
        ) : null}
        //color="default"  
        // sx={{
        //   '& .MuiBadge-dot': {
        //     width: 10,
        //     height: 10,
        //     border: 'none',
        //     //backgroundColor: 'green', 
        //     //color: 'red',        
        //   }
        // }}
      >
        <PickersDay 
        {...pickersDayProps} 
        sx={{
          ...(isSelected && {
            backgroundColor: 'cyan',
            color: 'white',
            '&:hover': {
              backgroundColor: 'darkcyan',
            },
          }),
        }}/>
      </Badge>      
    );
  };

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

          {/* Static Date Picker with appointment day highlighting */}
          <StaticDatePicker
            displayStaticWrapperAs="desktop"
            value={value}
            disabled={isDisabled}
            onChange={(date) => {
              fieldOnChange(date);
              if (onChange) onChange(date); // Call the optional onChange prop if provided
            }}
            shouldDisableDate={(date) => date.isBefore(dayjs(), 'day')}
            slots={{
              day: (props) => renderCustomDay(props.day, null, props),
            }}
          />
        </LocalizationProvider>
      )}
    />
  );
};

export default RenderDaysDatePickerField;
