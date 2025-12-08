import React, { useState, useEffect, useMemo } from 'react';
import { Control, Controller, FieldErrors, FieldValues, Path } from 'react-hook-form';
import { Box, Typography, Chip, FormHelperText, FormControlLabel, Switch } from '@mui/material';

/**
 * TimeSlotGenerator - A react-hook-form integrated component for generating                 // Determine color based on status
                let chipColor: 'primary' | 'default' | 'secondary' | 'error' = 'default';
                let chipVariant: 'filled' | 'outlined' = 'outlined';
                let customColor: string | undefined = undefined;
                
                if (isSelected) {
                  chipColor = 'primary';
                  chipVariant = 'filled';
                } else if (status === 'occupied') {
                  chipColor = 'default';
                  chipVariant = 'outlined';
                  customColor = '#ff9800'; // Orange color for occupied slots
                } else if (status === 'current') {
                  chipColor = 'secondary';
                  chipVariant = 'filled';
                }time slots
 * 
 * Features:
 * - Generates time slots based on working hours and service duration
 * - Integrates with react-hook-form for validation and state management
 * - Single appointment selection - only one appointment time can be selected at a time
 * - Automatically selects consecutive slots based on serviceDuration + bufferTime
 * - Shows available, occupied, and current (editing) slots with different colors
 * - Toggle to show/hide occupied slots from other appointments
 * - Material-UI styled with Chip components for better UX
 * - Visual grouping of consecutive selected slots
 * 
 * Slot Types and Colors:
 * - Available: Default color, clickable
 * - Occupied: Light orange background, semi-transparent, not clickable
 * - Current: Secondary color, for editing existing appointments
 * - Selected: Primary color, filled
 * 
 * Slot Selection Logic:
 * - Each slot represents 15 minutes
 * - When selecting a slot, automatically selects required consecutive slots
 * - Only one appointment can be selected at a time (replaces previous selection)
 * - Clicking a selected slot deselects the entire appointment
 * - Example: 45min service + 15min buffer = 60min total = 4 consecutive slots
 * - Visual feedback shows grouped slots with connected styling
 * 
 * Usage:
 * <TimeSlotGenerator
 *   name="appointmentTimeSlots"
 *   control={control}
 *   label="Available Time Slots"
 *   serviceDuration={45}
 *   bufferTime={15}
 *   workingHours={{ start: '09:00', end: '17:00' }}
 *   bookings={[{ start: '10:00', end: '10:45' }]}
 *   errors={errors}
 *   rules={{ required: 'Please select a time slot' }}
 * />
 */

interface Booking {
  start: string; // e.g., '10:00'
  end: string;   // e.g., '10:45'
}

interface WorkingHours {
  start: string; // e.g., '09:00'
  end: string;   // e.g., '17:00'
}

interface TimeSlotGeneratorProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  serviceDuration: number; // in minutes
  bufferTime: number;      // in minutes
  workingHours: WorkingHours | null;
  bookings: Booking[];
  errors?: FieldErrors<T>;
  rules?: object;
  multiple?: boolean; // Deprecated: Component now enforces single appointment selection only
  defaultValue?: any;
  showOccupied?: boolean;
  currentSlots?: { startTime: string; endTime: string } | null;
  slotRange: number;
  selectedDate?: Date | string | null; // Date for which slots are being generated
  originalAppointmentDate?: Date | string | null; // Original appointment date (for edit mode comparison)
}

// Helper to convert 12-hour format to 24-hour format
  const convertTo24Hour = (timeStr: string): string => {
    const cleanTime = timeStr.trim().toLowerCase();
    if (!cleanTime.includes('am') && !cleanTime.includes('pm')) {
      return cleanTime; // Already in 24-hour format
    }
    
    const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
    if (!timeMatch) return '09:00';
    
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const meridian = timeMatch[3];
    
    if (meridian === 'pm' && hours !== 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };


  const isSlotSelected = (slot: string, selectedValue: { startTime: string; endTime: string } | string | string[] | null) => {
    if (!selectedValue) return false;
    //console.log('Checking slot selection for:', slot, 'against', selectedValue);
    // Handle new format: object with startTime and endTime
    if (typeof selectedValue === 'object' && !Array.isArray(selectedValue) && 'startTime' in selectedValue) {
      // Convert slot to 24-hour format for comparison
      const slot24 = convertTo24Hour(slot);
      //console.log('Converted slot to 24-hour format:', slot24, slot24 >= selectedValue.startTime && slot24 <= selectedValue.endTime);
      return slot24 >= selectedValue.startTime && slot24 <= selectedValue.endTime;
    }
    
    // Handle legacy array format
    if (Array.isArray(selectedValue)) {
      return selectedValue.includes(slot);
    }
    
    // Handle single string format
    return selectedValue === slot;
  };

// Utility functions (normalized to 24-hour HH:MM format to ensure consistent comparisons)
const parseTime = (str: string): Date => {
  // Extract first hh:mm pattern regardless of additional AM/PM text
  const match = str.trim().toLowerCase().match(/(\d{1,2}):(\d{2})/);
  let hours = 0; let minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
  }
  // Adjust if original string had am/pm markers
  if (/pm/.test(str.toLowerCase()) && hours < 12) hours += 12;
  if (/am/.test(str.toLowerCase()) && hours === 12) hours = 0;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const formatTime = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const addMinutes = (date: Date, mins: number): Date =>
  new Date(date.getTime() + mins * 60000);

// Convert 24-hour HH:MM to 12-hour h:MM AM/PM for display only
const to12Hour = (time24: string): string => {
  if (!/^[0-2]?\d:[0-5]\d$/.test(time24)) return time24; // fallback if unexpected
  const [hStr, m] = time24.split(':');
  let h = parseInt(hStr, 10);
  const meridian = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${meridian}`;
};

const timeOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => start1 < end2 && start2 < end1;

// Main component
const TimeSlotGenerator = <T extends FieldValues = FieldValues>({
  name,
  control,
  label = "Available Time Slots",
  serviceDuration,
  bufferTime,
  workingHours,
  bookings,
  errors,
  rules,
  multiple = false,
  defaultValue,
  showOccupied = false,
  currentSlots,
  slotRange,
  selectedDate,
  originalAppointmentDate,
}: TimeSlotGeneratorProps<T>) => {
  // State for hover preview
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  
  // Helper function to format dates for comparison (YYYY-MM-DD)
  const formatDateForComparison = (date: Date | string | null): string | null => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Determine if we should show currentSlots (purple) - only if we're viewing the original appointment date
  const shouldShowCurrentSlots = useMemo(() => {
    if (!currentSlots || !originalAppointmentDate || !selectedDate) return false;
    
    const selectedDateStr = formatDateForComparison(selectedDate);
    const originalDateStr = formatDateForComparison(originalAppointmentDate);
    
    return selectedDateStr === originalDateStr;
  }, [currentSlots, originalAppointmentDate, selectedDate]);

  // Memoize all slots and their statuses
  const { allSlots, slotStatuses } = useMemo(() => {
    // If working hours are null, return empty slots
    if (!workingHours) {
      return { allSlots: [], slotStatuses: {} };
    }

    const slots: string[] = [];
    const statuses: { [key: string]: 'available' | 'occupied' | 'current' | 'past' } = {};
    const totalDuration = serviceDuration + bufferTime;
    
    let current = parseTime(workingHours.start);
    const end = parseTime(workingHours.end);
    
    // Use selectedDate if provided, otherwise use today
    const referenceDate = selectedDate ? new Date(selectedDate) : new Date();
    const isToday = referenceDate.toDateString() === new Date().toDateString();
    const now = new Date(); // Current time for comparison
    
    // Generate all possible slot start times
    while (addMinutes(current, totalDuration) <= end) {
      const slotTime = formatTime(current);
      slots.push(slotTime);
      current = addMinutes(current, slotRange); // step forward
    }

    // Classify each slot
    slots.forEach(slot => {
      const slotStart = parseTime(slot); // start time of candidate slot
      const slotEnd = addMinutes(slotStart, totalDuration); // end of potential booking window

      // Check if slot is in the past - only if it's today and the slot time has passed
      const isPast = isToday && slotStart < now;

      // Determine if this slotStart belongs to the current (editing) selection.
      // Our current selection stores startTime and endTime as the first and LAST SLOT START (not the true end boundary).
      // Therefore we treat the end as inclusive on slot starts: slotStart >= currentStart && slotStart <= currentEnd.
      let isCurrent = false;
      if (shouldShowCurrentSlots && currentSlots) {
        const currentStart = parseTime(currentSlots.startTime);
        const currentEndSlotStart = parseTime(currentSlots.endTime);
        if (slotStart >= currentStart && slotStart <= currentEndSlotStart) {
          isCurrent = true;
        }
      }

      // Check if overlaps with other bookings (on slot start basis, inclusive end)
      const overlapsBooking = bookings.some(({ start, end }) => {
        const bookingStart = parseTime(start);
        const bookingEnd = parseTime(end);
        return slotStart >= bookingStart && slotStart <= bookingEnd;
      });

      if (isPast) {
        statuses[slot] = 'past';
      } else if (isCurrent) {
        statuses[slot] = 'current';
      } else if (overlapsBooking) {
        statuses[slot] = 'occupied';
      } else {
        statuses[slot] = 'available';
      }
    });
    //console.log('Bookings:', bookings);
    return { allSlots: slots, slotStatuses: statuses };
  }, [serviceDuration, bufferTime, workingHours?.start, workingHours?.end, bookings, shouldShowCurrentSlots, currentSlots, selectedDate]);

  // Available slots are those that can be selected (available or current in edit mode)
  const availableSlots = useMemo(() => {
    // Always include slots marked current (editing range).
    return allSlots.filter(slot => {
      const status = slotStatuses[slot];
      return status === 'available' || status === 'current';
    });
  }, [allSlots, slotStatuses]);

  // Calculate which slots would be selected if hovering over a specific slot
  const getHoverPreviewSlots = useMemo(() => {
    return (slot: string): string[] => {
      if (!slot) return [];
      
      const totalDuration = Number(serviceDuration) + Number(bufferTime);
      const slotsNeeded = Math.ceil(totalDuration / slotRange);
      
      const startDate = parseTime(slot);
      const consecutiveSlots: string[] = [];
      let contiguous = true;
      
      for (let i = 0; i < slotsNeeded; i++) {
        const stepDate = addMinutes(startDate, i * slotRange);
        const stepLabel = formatTime(stepDate);
        
        // Must exist in the generated allSlots list
        if (!allSlots.includes(stepLabel)) { 
          contiguous = false; 
          break; 
        }
        
        // Status must be available or current (cannot traverse occupied gap)
        const status = slotStatuses[stepLabel];
        if (!(status === 'available' || status === 'current')) { 
          contiguous = false; 
          break; 
        }
        
        consecutiveSlots.push(stepLabel);
      }
      
      return contiguous && consecutiveSlots.length === slotsNeeded ? consecutiveSlots : [];
    };
  }, [serviceDuration, bufferTime, allSlots, slotStatuses]);

  // Check if a slot is part of the hover preview
  const isSlotInHoverPreview = (slot: string) => {
    if (!hoveredSlot) return false;
    const previewSlots = getHoverPreviewSlots(hoveredSlot);
    return previewSlots.includes(slot);
  };

  // Check if hovering over a slot that cannot be selected (insufficient consecutive slots)
  const isHoveringInvalidSlot = (slot: string) => {
    if (!hoveredSlot || hoveredSlot !== slot) return false;
    const previewSlots = getHoverPreviewSlots(slot);
    return previewSlots.length === 0;
  };

//   // Debug logging for prop changes and re-renders
//   useEffect(() => {
//     console.log('🔄 TimeSlotGenerator Re-render:', {
//       timestamp: new Date().toLocaleTimeString(),
//       serviceDuration,
//       bufferTime,
//       workingHours,
//       bookingsCount: bookings?.length || 0,
//       name,
//       availableSlotsCount: availableSlots.length
//     });
//   } , [serviceDuration, bufferTime, workingHours, bookings, name, availableSlots.length]);

  const getErrorMessage = (fieldName: Path<T>) => {
    const error = errors?.[fieldName];
    if (error) {
      return typeof error.message === 'string' ? error.message : 'This field is required';
    }
    return '';
  };



  

  // Helper function to determine slot position in a consecutive group
  const getSlotGroupPosition = (slot: string, selectedValue: { startTime: string; endTime: string } | string | string[] | null) => {
    if (!selectedValue) return null;
    
    // Handle new format: object with startTime and endTime
    if (typeof selectedValue === 'object' && !Array.isArray(selectedValue) && 'startTime' in selectedValue) {
      const slot24 = convertTo24Hour(slot);
      const slotIndex = availableSlots.findIndex((s: string) => convertTo24Hour(s) === slot24);
      const startIndex = availableSlots.findIndex((s: string) => convertTo24Hour(s) === selectedValue.startTime);
      const endIndex = availableSlots.findIndex((s: string) => convertTo24Hour(s) === selectedValue.endTime);
      
      if (slotIndex >= startIndex && slotIndex <= endIndex) {
        return {
          position: slotIndex - startIndex,
          isFirst: slotIndex === startIndex,
          isLast: slotIndex === endIndex,
          groupSize: endIndex - startIndex + 1
        };
      }
    }
    
    // Handle legacy array format
    if (Array.isArray(selectedValue) && selectedValue.includes(slot)) {
      const slotIndexInSelection = selectedValue.indexOf(slot);
      return {
        position: slotIndexInSelection,
        isFirst: slotIndexInSelection === 0,
        isLast: slotIndexInSelection === selectedValue.length - 1,
        groupSize: selectedValue.length
      };
    }
    
    return null;
  };

  // Helper function to find which booking a slot belongs to and its position within that booking
  const getOccupiedSlotGroupPosition = (slot: string) => {
    const slot24 = convertTo24Hour(slot);
    const SLOT_STEP_MIN = slotRange;

    for (const booking of bookings) {
      let bookingStart = convertTo24Hour(booking.start);
      let bookingEnd = convertTo24Hour(booking.end);

      // If booking uses same start/end to denote a single-slot booking, extend by one slot so both start & next slot show.
      if (bookingStart === bookingEnd) {
        const extendedDate = addMinutes(parseTime(bookingEnd), SLOT_STEP_MIN);
        bookingEnd = formatTime(extendedDate);
      }

      // INCLUSIVE on bookingEnd for slot starts (booking represents a set of discrete 15-min start points)
      if (slot24 >= bookingStart && slot24 <= bookingEnd) {
        const bookingSlots = allSlots.filter(s => {
          const s24 = convertTo24Hour(s);
            return s24 >= bookingStart && s24 <= bookingEnd;
        });
        const slotIndex = bookingSlots.findIndex(s => convertTo24Hour(s) === slot24);
        if (slotIndex === -1) continue;
        return {
          position: slotIndex,
          isFirst: slotIndex === 0,
          isLast: slotIndex === bookingSlots.length - 1,
          groupSize: bookingSlots.length,
          bookingIndex: bookings.indexOf(booking)
        };
      }
    }
    return null;
  };

  const handleSlotToggle = (slot: string, currentValue: { startTime: string; endTime: string } | string | string[] | null, onChange: (value: { startTime: string; endTime: string } | null) => void) => {
    // Calculate how many 15-minute slots we need for the total duration
    const totalDuration = Number(serviceDuration) + Number(bufferTime);
    const slotsNeeded = Math.ceil(totalDuration / slotRange); // Each slot is 15 minutes
    
    // Check if the clicked slot is already part of the current selection
    if (isSlotSelected(slot, currentValue)) {
      // If clicking an already selected slot, clear all selections (deselect the appointment)
      onChange(null);
      return;
    }
    
    // Enforce real chronological contiguity (no skipping over occupied slots)
    const startDate = parseTime(slot);
    const consecutiveSlots: string[] = [];
    let contiguous = true;
    for (let i = 0; i < slotsNeeded; i++) {
      const stepDate = addMinutes(startDate, i * slotRange);
      const stepLabel = formatTime(stepDate);
      // Must exist in the generated allSlots list
      if (!allSlots.includes(stepLabel)) { contiguous = false; break; }
      // Status must be available or current (cannot traverse occupied gap)
      const status = slotStatuses[stepLabel];
      if (!(status === 'available' || status === 'current')) { contiguous = false; break; }
      consecutiveSlots.push(stepLabel);
    }

    if (contiguous && consecutiveSlots.length === slotsNeeded) {
      const startTime = convertTo24Hour(consecutiveSlots[0]);
      const endTime = convertTo24Hour(consecutiveSlots[consecutiveSlots.length - 1]);
      onChange({ startTime, endTime });
    } else {
      console.warn('Selection blocked: range would overlap or skip over an occupied slot.');
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { value, onChange } }) => {
        
        return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {label}
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '1px', // precise 1px gap between chips
            minHeight: '60px',
            maxHeight: '300px', // Set maximum height for scroll area
            overflowY: 'auto', // Enable vertical scrolling when content exceeds maxHeight
            p: 1,
            border: errors?.[name] ? '1px solid red' : '1px solid #e0e0e0',
            borderRadius: 1,
            backgroundColor: '#fafafa',
            // Custom scrollbar styling for better appearance
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#c1c1c1',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: '#a8a8a8',
              },
            },
          }}>
            {(showOccupied ? allSlots : availableSlots).length > 0 ? (
              (showOccupied ? allSlots : availableSlots).map((slot, index) => {
                const status = slotStatuses[slot];
                const isSelected = isSlotSelected(slot, value);
                const isInHoverPreview = isSlotInHoverPreview(slot);
                const isInvalidHover = isHoveringInvalidSlot(slot);
                const groupPosition = getSlotGroupPosition(slot, value);
                const occupiedGroupPosition = status === 'occupied' ? getOccupiedSlotGroupPosition(slot) : null;
                const isClickable = status === 'available' || status === 'current';
                
                // Determine color based on status
                let chipColor: 'primary' | 'default' | 'secondary' | 'error' = 'default';
                let chipVariant: 'filled' | 'outlined' = 'outlined';
                let customBgColor: string | undefined = undefined;
                
                if (isSelected) {
                  chipColor = 'primary';
                  chipVariant = 'filled';
                } else if (isInvalidHover) {
                  chipColor = 'error';
                  chipVariant = 'outlined';
                  customBgColor = 'rgba(244, 67, 54, 0.1)'; // Light red background for invalid selection
                } else if (isInHoverPreview && !isSelected) {
                  chipColor = 'primary';
                  chipVariant = 'outlined';
                  customBgColor = 'rgba(25, 118, 210, 0.1)'; // Light blue background for hover preview
                } else if (status === 'occupied') {
                  chipColor = 'default';
                  chipVariant = 'filled';
                  customBgColor = '#fff3e0'; // Light orange background for occupied slots
                } else if (status === 'current') {
                  chipColor = 'secondary';
                  chipVariant = 'filled';
                } else if (status === 'past') {
                  chipColor = 'default';
                  chipVariant = 'outlined';
                  customBgColor = '#f5f5f5'; // Light gray background for past slots
                }
                
                // Determine which grouping to use (selected appointment or occupied booking)
                const activeGroupPosition = groupPosition || occupiedGroupPosition;
                
                return (
                  <Chip
                    key={index}
                    label={to12Hour(convertTo24Hour(slot))}
                    clickable={isClickable}
                    color={chipColor}
                    variant={chipVariant}
                    onClick={isClickable ? () => handleSlotToggle(slot, value, onChange) : undefined}
                    onMouseEnter={isClickable ? () => setHoveredSlot(slot) : undefined}
                    onMouseLeave={isClickable ? () => setHoveredSlot(null) : undefined}
                    sx={{
                      // Single fixed width (fits longest label e.g. '12:45 PM') so all chips equal & no ellipsis
                      width: 86,
                      minWidth: 86,
                      maxWidth: 86,
                      boxSizing: 'border-box',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      fontVariantNumeric: 'tabular-nums',
                      px: 0.25,
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      '& .MuiChip-label': {
                        p: 0,
                        px: 0,
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap'
                      },
                      '&:hover': isClickable ? {
                        backgroundColor: isSelected 
                          ? 'primary.dark' 
                          : status === 'current'
                            ? 'secondary.dark'
                            : isInvalidHover
                              ? 'rgba(244, 67, 54, 0.2)'
                            : isInHoverPreview
                              ? 'rgba(25, 118, 210, 0.2)'
                              : 'action.hover',
                        borderColor: isSelected
                          ? 'primary.dark'
                          : isInvalidHover
                            ? 'error.main'
                          : isInHoverPreview
                            ? 'primary.main'
                            : 'rgba(0,0,0,0.23)',
                        transform: (isInHoverPreview || isInvalidHover) ? 'scale(1.02)' : 'none',
                        transition: 'all 0.2s ease-in-out'
                      } : {},
                      opacity: status === 'occupied' ? 0.8 : status === 'past' ? 0.5 : 1,
                      backgroundColor: customBgColor,
                      lineHeight: 1.1,
                      height: 32,
                      ...(status === 'occupied' && activeGroupPosition && {
                        // Remove gradient to keep exact same metrics; could reintroduce with consistent sizing later
                        backgroundImage: undefined
                      }),
                      // Add visual grouping for consecutive slots (both selected and occupied)
                      // Border radius logic: available slots = square; others keep grouping rounding
                      ...(activeGroupPosition ? {
                        borderRadius: (isSelected || status === 'current')
                          ? 0 // force square for selected or current slots
                          : status === 'available'
                            ? 0
                            : activeGroupPosition.groupSize > 1
                              ? (
                                  status === 'occupied'
                                    ? (
                                        activeGroupPosition.isFirst
                                          ? '18px 6px 6px 18px'
                                          : activeGroupPosition.isLast
                                            ? '6px 18px 18px 6px'
                                            : '4px'
                                      )
                                    : (
                                        activeGroupPosition.isFirst
                                          ? '12px 4px 4px 12px'
                                          : activeGroupPosition.isLast
                                            ? '4px 12px 12px 4px'
                                            : '4px'
                                      )
                                )
                              : (status === 'occupied' ? '18px' : '12px')
                      } : {
                        borderRadius: (isSelected || status === 'current') ? 0 : (status === 'available' ? 0 : (status === 'occupied' ? '18px' : '12px'))
                      }),
                      marginRight: 0,
                      border: '1px solid',
                      borderColor: isSelected 
                        ? 'primary.dark' 
                        : isInvalidHover
                          ? 'error.main'
                        : isInHoverPreview
                          ? 'primary.main'
                        : status === 'occupied' 
                          ? '#ff9800' 
                        : status === 'past'
                          ? '#bdbdbd'
                          : 'rgba(0,0,0,0.23)',
                      boxShadow: isSelected 
                        ? '0 0 0 2px rgba(25,118,210,0.35)' 
                        : isInvalidHover
                          ? '0 0 0 1px rgba(244, 67, 54, 0.5)'
                        : isInHoverPreview
                          ? '0 0 0 1px rgba(25,118,210,0.5)'
                        : status === 'occupied' 
                          ? '0 0 0 1px rgba(255,152,0,0.25)' 
                        : status === 'past'
                          ? 'none'
                          : 'none',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  />
                );
              })
            ) : (
              <Typography variant="body2" color="textSecondary">
                No time slots available
              </Typography>
            )}
          </Box>
          
          {/* Hover preview information */}
          {hoveredSlot && (
            <></>
            // <Box sx={{ 
            //   mt: 1, 
            //   p: 1, 
            //   backgroundColor: getHoverPreviewSlots(hoveredSlot).length > 0 ? '#f3e5f5' : '#ffebee', 
            //   borderRadius: 1,
            //   border: `1px solid ${getHoverPreviewSlots(hoveredSlot).length > 0 ? '#9c27b0' : '#f44336'}`,
            //   borderStyle: 'dashed'
            // }}>
            //   <Typography 
            //     variant="body2" 
            //     color={getHoverPreviewSlots(hoveredSlot).length > 0 ? 'secondary' : 'error'} 
            //     sx={{ fontWeight: 'medium' }}
            //   >
            //     {getHoverPreviewSlots(hoveredSlot).length > 0 ? (
            //       <>
            //         🔍 Preview: Would select {getHoverPreviewSlots(hoveredSlot).length} consecutive slots 
            //         ({to12Hour(convertTo24Hour(getHoverPreviewSlots(hoveredSlot)[0]))} - {
            //           to12Hour(convertTo24Hour(getHoverPreviewSlots(hoveredSlot)[getHoverPreviewSlots(hoveredSlot).length - 1]))
            //         }) for {Number(serviceDuration) + Number(bufferTime)} minutes total
            //       </>
            //     ) : (
            //       <>
            //         ⚠️ Cannot select: Not enough consecutive available slots for this treatment duration 
            //         ({Number(serviceDuration) + Number(bufferTime)} minutes = {Math.ceil((Number(serviceDuration) + Number(bufferTime)) / slotRange)} slots needed)
            //       </>
            //     )}
            //   </Typography>
            // </Box>
          )}
          
          {errors?.[name] && (
            <FormHelperText error>
              {getErrorMessage(name)}
            </FormHelperText>
          )}                    
        </Box>
        );
      }}
    />
  );
};

export default TimeSlotGenerator;