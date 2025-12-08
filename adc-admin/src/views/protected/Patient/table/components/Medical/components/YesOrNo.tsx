import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import RadioGroup, { useRadioGroup } from '@mui/material/RadioGroup';
import FormControlLabel, {
  FormControlLabelProps,
} from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import { Controller } from 'react-hook-form';

interface StyledFormControlLabelProps extends FormControlLabelProps {
  checked: boolean;
}

const StyledFormControlLabel = styled((props: StyledFormControlLabelProps) => (
  <FormControlLabel {...props} />
))(({ theme }) => ({
  '& .MuiFormControlLabel-label': {
    color: (props: StyledFormControlLabelProps) =>
      props.checked
        ? theme.palette.mode === 'dark'
          ? theme.palette.primary.light
          : theme.palette.primary.main
        : theme.palette.text.primary,
  },
}));

function MyFormControlLabel(props: FormControlLabelProps) {
  const radioGroup = useRadioGroup();
  let checked = false;

  if (radioGroup) {
    checked = radioGroup.value === props.value;
  }

  return <StyledFormControlLabel checked={checked} {...props} />;
}

interface RadioGroupFieldProps {
  name: string;
  control: any; // Pass the `control` object from react-hook-form
  defaultValue?: string;
  options: { value: string; label: string }[];
  row?: boolean;
}

const YesOrNoField: React.FC<RadioGroupFieldProps> = ({
  name,
  control,
  defaultValue = '',
  options,
  row = false,
}) => {
  const theme = useTheme();

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultValue}
      render={({ field }) => (
        <RadioGroup {...field} row={row}>
          {options.map((option) => (
            <MyFormControlLabel
              key={option.value}
              value={option.value}
              label={option.label}
              control={
                <Radio
                  sx={{
                    color:
                      theme.palette.mode === 'dark'
                        ? '#0fb491'
                        : theme.palette.grey[700],
                    '&.Mui-checked': {
                      color: '#0fb491',
                    },
                  }}
                />
              }
            />
          ))}
        </RadioGroup>
      )}
    />
  );
};

export default YesOrNoField;


// import * as React from 'react';
// import { styled } from '@mui/material/styles';
// import RadioGroup, { useRadioGroup } from '@mui/material/RadioGroup';
// import FormControlLabel, {
//   FormControlLabelProps,
// } from '@mui/material/FormControlLabel';
// import Radio from '@mui/material/Radio';
// import { Controller, useForm } from 'react-hook-form';

// interface StyledFormControlLabelProps extends FormControlLabelProps {
//   checked: boolean;
// }

// const StyledFormControlLabel = styled((props: StyledFormControlLabelProps) => (
//   <FormControlLabel {...props} />
// ))(({ theme }) => ({
//   variants: [
//     {
//       props: { checked: true },
//       style: {
//         '.MuiFormControlLabel-label': {
//           color: theme.palette.primary.main,
//         },
//       },
//     },
//   ],
// }));

// function MyFormControlLabel(props: FormControlLabelProps) {
//   const radioGroup = useRadioGroup();

//   let checked = false;

//   if (radioGroup) {
//     checked = radioGroup.value === props.value;
//   }

//   return <StyledFormControlLabel checked={checked} {...props} />;
// }

// interface RadioGroupFieldProps {
//   name: string;
//   control: any; // Pass the `control` object from react-hook-form
//   defaultValue?: string;
//   options: { value: string; label: string }[];
//   row?: boolean;
// }

// const YesOrNoField: React.FC<RadioGroupFieldProps> = ({
//   name,
//   control,
//   defaultValue = '',
//   options,
//   row = false,
// }) => {
//   return (
//     <Controller
//       name={name}
//       control={control}
//       defaultValue={defaultValue}
//       render={({ field }) => (
//         <RadioGroup {...field} row={row}>
//           {options.map((option) => (
//             <MyFormControlLabel
//               key={option.value}
//               value={option.value}
//               label={option.label}
//               control={<Radio />}
//             />
//           ))}
//         </RadioGroup>
//       )}
//     />
//   );
// };


// export default YesOrNoField