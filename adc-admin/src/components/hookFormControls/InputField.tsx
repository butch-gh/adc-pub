import { Controller, Control, FieldValues, Path, FieldError } from 'react-hook-form';
import TextField from '@mui/material/TextField';

interface FormInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  rules?: object;
  errors: FieldError | undefined;
  isNumber?: boolean;
  isDisabled?: boolean;
  isNotRequired?: boolean;
}

function FormInput<T extends FieldValues>({
  name,
  control,
  label,
  rules = {},
  errors,
  isNumber,
  isDisabled,
  isNotRequired
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <TextField
          {...field}
          fullWidth
          margin="normal"
          label={label}
          error={!!errors}
          helperText={errors ? errors.message : ''}
          required={!isNotRequired}
          disabled={isDisabled}
          type={isNumber ? 'number' : 'text'}
          InputLabelProps={{
            shrink: true // Always keep label floating above to prevent overlap
          }}
        />
      )}
    />
  );
}


// function FormInput<T extends FieldValues>({
//   name,
//   control,
//   label,
//   rules = {},
//   errors,
//   isNumber,
//   isDisabled,
//   isNotRequired
// }: FormInputProps<T>) {
//   return (
//     <Controller
//       name={name}
//       control={control}
//       rules={rules}
//       render={({ field }) => (
//         <TextField
//           {...field}
//           fullWidth
//           margin="normal"
//           label={label}
//           error={!!errors}
//           helperText={errors ? errors.message : ''}
//           required={!isNotRequired}
//           disabled={isDisabled}
//           type={isNumber ? 'number' : 'text'}
//         />
//       )}
//     />
//   );
// }

export default FormInput;
