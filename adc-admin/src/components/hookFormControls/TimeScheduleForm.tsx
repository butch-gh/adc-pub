import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Checkbox, Box, Typography } from "@mui/material";

const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface TimeSchedProps {
  name_sched: string;
  name_times: string;  
}

const TimeScheduleForm: React.FC<TimeSchedProps> = ({ name_sched, name_times }) => {
  const { control, watch, clearErrors, setValue } = useFormContext();

  const schedule = watch("scheduleTimes.schedule");
  
  const handleCheckboxChange = (day: string, checked: boolean, onChange: (value: boolean) => void) => {
    onChange(checked);
    
    if (!checked) {
      // Clear time values when unchecking
      setValue(`${name_times}.${day}.from`, '');
      setValue(`${name_times}.${day}.to`, '');
      clearErrors(`${name_times}.${day}.from`);
      clearErrors(`${name_times}.${day}.to`);
    } else {
      // Set default times when checking a day
      setValue(`${name_times}.${day}.from`, '09:00');
      setValue(`${name_times}.${day}.to`, '17:00');
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      {days.map((day) => (
        <div key={day} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
          <Controller
            name={`${name_sched}.${day}`}
            control={control}
            render={({ field }) => (
              <label style={{ width: '80px', display: 'flex', alignItems: 'center' }}>
                <Checkbox 
                  {...field} 
                  checked={!!field.value} 
                  onChange={(e) => handleCheckboxChange(day, e.target.checked, field.onChange)}
                />
                {day}
              </label>
            )}
          />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Controller
              name={`${name_times}.${day}.from`}
              control={control}
              rules={{ 
                required: schedule && schedule[day] ? "Time is required" : false
              }}
              render={({ field, fieldState }) => (
                <div style={{ marginRight: '10px' }}>
                  <input 
                    type="time" 
                    {...field} 
                    disabled={!schedule || !schedule[day]} 
                    style={{ 
                      padding: '6px',
                      border: fieldState.invalid ? '1px solid red' : '1px solid #ccc'
                    }} 
                  />
                  {fieldState.error && (
                    <p style={{ color: 'red', fontSize: '12px', margin: '2px 0 0 0' }}>
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Typography variant="body2" style={{ margin: '0 10px' }}>to</Typography>
            <Controller
              name={`${name_times}.${day}.to`}
              control={control}
              rules={{
                required: schedule && schedule[day] ? "Time is required" : false,
                validate: value => {
                  if (!schedule || !schedule[day]) return true;
                  
                  const fromTime = watch(`${name_times}.${day}.from`);
                  if (!fromTime || !value) return true;
                  
                  const fromDate = new Date(`1970-01-01T${fromTime}`);
                  const toDate = new Date(`1970-01-01T${value}`);
                  
                  return toDate > fromDate || "End time must be after start time";
                }
              }}
              render={({ field, fieldState }) => (
                <div>
                  <input 
                    type="time" 
                    {...field} 
                    disabled={!schedule || !schedule[day]} 
                    style={{ 
                      padding: '6px',
                      border: fieldState.invalid ? '1px solid red' : '1px solid #ccc'
                    }} 
                  />
                  {fieldState.error && (
                    <p style={{ color: 'red', fontSize: '12px', margin: '2px 0 0 0' }}>
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      ))}
    </Box>
  );
};

export default TimeScheduleForm;