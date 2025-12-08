import React, { useEffect, useState } from 'react';
import { Controller, Control, FieldError, FieldErrors } from 'react-hook-form';
import { FormControl, FormLabel, FormHelperText, Button, Typography, Box } from '@mui/material';

  // Add a new prop to determine if we're working with a future date
interface TimeSlotPickerFlexiProps {
  name: string;
  label: string;
  control: Control<any>;
  options: { code: string; description: string; isAvailable: boolean; slot: number }[];
  durationInMinutes?: number;
  treatmentCode?: string;
  patientId?: string;
  defaultValue?: string[];
  isDisabled?: boolean;
  errors?: FieldErrors<Record<string, any>> | FieldError;
  rules?: any;
  multiple?: boolean;
  editMode?: boolean;
  occupiedSlots?: string[];
  selectedDate?: Date | null; // Add this new prop
}

const isFieldErrors = (errors: any): errors is FieldErrors<Record<string, any>> => {
  return errors && typeof errors === 'object' && 'root' in errors;
};

const TimeSlotPickerFlexi: React.FC<TimeSlotPickerFlexiProps> = ({
  name,
  label,
  control,
  options,
  durationInMinutes = 30,
  treatmentCode = '',
  patientId = '',
  defaultValue = [],
  isDisabled,
  errors,
  rules,
  multiple = true,
  editMode = false,
  occupiedSlots = [],
  selectedDate = null, // Default to null
}) => {
  const errorMessage = isFieldErrors(errors) ? errors[name]?.message : errors?.message;
  const currentTime = new Date();
  
  // Calculate number of slots needed based on duration in minutes
  const slotsNeeded = Math.ceil(durationInMinutes / 30);
  
  // State for preview slots on hover
  const [previewSlots, setPreviewSlots] = useState<number[]>([]);
  
  // Determine if the selected date is in the future
  const isFutureDate = (): boolean => {
    if (!selectedDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to beginning of day
    
    const selDate = new Date(selectedDate);
    selDate.setHours(0, 0, 0, 0); // Reset time to beginning of day
    
    return selDate > today;
  };
  
  // Function to check if a time slot is in the past
  const isTimeSlotInPast = (timeSlot: string): boolean => {
    // If it's a future date, no slots are in the past
    if (isFutureDate()) return false;
    
    // Original logic for current date
    const timePattern = /(\d{1,2}):(\d{2})\s(AM|PM)/;
    const match = timeSlot.match(timePattern);
    
    if (!match) return false;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3];
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    // Create a date object with today's date and the time slot's time
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    // Check if the time slot is in the past
    return slotTime < currentTime;
  };
  
  // Function to check if a range of slots overlaps with occupied slots or reaches beyond bounds
  const checkIfRangeOverlapsOccupied = (startSlot: number, endSlot: number): boolean => {
    // Add a specific check for slots near the edge
    if (endSlot > options[options.length - 1].slot) {
      return true; // Would exceed the last available slot
    }
    
    if (startSlot + slotsNeeded - 1 > options[options.length - 1].slot) {
      return true; // Not enough slots available from this position to satisfy slotsNeeded
    }
    
    // Check if all required slots exist in the options
    const allSlotsInRange = Array.from({ length: endSlot - startSlot + 1 }, (_, i) => startSlot + i);
    const allSlotsExist = allSlotsInRange.every(slot => 
      options.some(opt => opt.slot === slot)
    );
    
    if (!allSlotsExist) {
      return true; // Not all slots in the desired range exist
    }
    
    // Check for occupied slots in the range
    for (let slot = startSlot; slot <= endSlot; slot++) {
      // Check if occupied
      const isOccupied = occupiedSlots.some(occupiedSlot => {
        const parts = occupiedSlot.split('|');
        const occupiedSlotNumber = parseInt(parts[0], 10);
        return occupiedSlotNumber === slot;
      });
      
      if (isOccupied) {
        return true; // Found an occupied slot in the range
      }
      
      // Check availability
      const slotOption = options.find(opt => opt.slot === slot);
      if (!slotOption || !slotOption.isAvailable || isTimeSlotInPast(slotOption.code)) {
        return true; // Slot is unavailable or in the past
      }
    }
    
    return false; // Range is valid and available
  };

  // Add this function to calculate which slots would be selected in a range
  const getSelectableRange = (slotNumber: number): number[] => {
    const startSlot = slotNumber;
    const endSlot = Math.min(startSlot + slotsNeeded - 1, options.length);
    const range = [];
    
    for (let i = startSlot; i <= endSlot; i++) {
      range.push(i);
    }
    
    return range;
  };

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={editMode ? defaultValue : []}
      rules={rules}
      render={({ field: { value, onChange } }) => {
        const selectedValues = Array.isArray(value) ? value : [];

        // Handle auto-selection of consecutive slots
        const handleSlotChange = (slotCode: string, slotNumber: number) => {
          // Find the slots that need to be selected
          const slotsToSelect = [];
          
          // Calculate how many slots we need to select
          const startSlot = slotNumber;
          const endSlot = Math.min(startSlot + slotsNeeded - 1, options.length);
          
          // Check if any of the slots in the range is occupied
          const isOverlapping = checkIfRangeOverlapsOccupied(startSlot, endSlot);
          
          if (isOverlapping) {
            // Don't allow selection if any slot in the range is occupied
            return; // Exit function early
          }
          
          // Check if all slots in range are available
          const allAvailable = options
            .filter(opt => opt.slot >= startSlot && opt.slot <= endSlot)
            .every(opt => opt.isAvailable);
          
          if (!allAvailable) {
            const slotOption = options.find(opt => opt.slot >= startSlot && opt.slot <= endSlot);
            // If any slot in range is unavailable, just select this one slot
            if (slotOption) {
              slotsToSelect.push(`${slotNumber}|${slotOption.code}`);
            }
          } else {
            // Get all slots in the range
            const rangeSlots = options
              .filter(opt => opt.slot >= startSlot && opt.slot <= endSlot)
              .map(opt => `${opt.slot}|${opt.code}`);
              
            slotsToSelect.push(...rangeSlots);
          }
          
          // Update form value with selected slots
          onChange(slotsToSelect);
        };

        return (
          <FormControl component="fieldset" margin="normal" fullWidth error={!!errorMessage}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <FormLabel component="legend">{label}</FormLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'orange', mr: 0.5 }}></Box>
                  <Typography variant="caption">Occupied</Typography>
                </Box>
                <Typography variant="caption">
                  {slotsNeeded > 1 
                    ? `Selecting a slot will auto-select ${slotsNeeded} consecutive slots (${durationInMinutes} minutes)` 
                    : 'Select a time slot'}
                </Typography>
              </Box>
            </Box>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {options.map((option) => {
                // Check if this option is selected by looking for its slot number in the selectedValues
                const isSelected = selectedValues.some(val => {
                  const parts = val.split('|');
                  const storedSlotNumber = parseInt(parts[0], 10);
                  return storedSlotNumber === option.slot;
                });
                
                const isPastTime = isTimeSlotInPast(option.code);
                const isOccupied = occupiedSlots.some(occupiedSlot => {
                  const parts = occupiedSlot.split('|');
                  const occupiedSlotNumber = parseInt(parts[0], 10);
                  return occupiedSlotNumber === option.slot;
                });
                
                // Check if this is a slot where selecting would exceed boundary
                const wouldExceedBoundary = checkIfRangeOverlapsOccupied(
                  option.slot, 
                  Math.min(option.slot + slotsNeeded - 1, options.length)
                );

                // Check if this slot is in preview
                const isPreview = previewSlots.includes(option.slot);

                // Let's add more specific debugging
                //console.log(`Slot ${option.slot} (${option.description}) would exceed boundary: ${wouldExceedBoundary}`);

                return (
                  <div 
                    key={`slot-wrapper-${option.slot}`} 
                    style={{ 
                      display: 'inline-block',
                      cursor: wouldExceedBoundary ? 'not-allowed !important' : 'pointer'
                    }}
                  >
                    <Button
                      key={option.code}
                      variant={isSelected ? 'contained' : 'outlined'}
                      color={isSelected ? 'primary' : 'secondary'}
                      disabled={isDisabled || !option.isAvailable || isPastTime || isOccupied}
                      onClick={() => {
                        // Check if selecting would exceed boundary before handling click
                        if (!wouldExceedBoundary) {
                          handleSlotChange(option.code, option.slot);
                        }
                      }}
                      onMouseEnter={() => {
                        if (!isDisabled && option.isAvailable && !isPastTime && !isOccupied && !wouldExceedBoundary) {
                          setPreviewSlots(getSelectableRange(option.slot));
                        }
                      }}
                      onMouseLeave={() => setPreviewSlots([])}
                      sx={{
                        minWidth: '80px',
                        // Remove the cursor style from the button - let the parent div handle it
                        // And don't block pointer events for boundary cases
                        pointerEvents: (!option.isAvailable || isPastTime || isOccupied) ? 'none' : 'auto',
                        ...(isSelected
                          ? {
                              color: '#fff',
                              backgroundColor: '#0fb491',
                              borderColor: '#0fb491',
                            }
                          : isOccupied
                            ? {
                                color: 'text.primary',
                                backgroundColor: 'orange',
                                borderColor: 'orange',
                              }
                            : isPreview
                              ? {
                                  color: '#fff',
                                  backgroundColor: '#1976d2', // Blue for newly selected/preview
                                  borderColor: '#1976d2',
                                }
                              : {
                                  color: option.isAvailable && !isPastTime ? 'text.primary' : 'rgba(0, 0, 0, 0.5)',
                                  backgroundColor: 'transparent',
                                  borderColor: option.isAvailable && !isPastTime ? '#0fb491' : 'rgba(0, 0, 0, 0.2)',
                                }),
                      }}
                    >
                      {option.description}
                    </Button>
                  </div>
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

export default TimeSlotPickerFlexi;