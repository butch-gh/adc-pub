import React from "react";
import { Controller, Control } from "react-hook-form";
import { Checkbox, FormControlLabel } from "@mui/material";

type CheckboxProps = {
  name: string;
  label: string;
  control: Control<any>; // Control from React Hook Form
  defaultValue?: boolean;
  rules?: any; // Validation rules for the checkbox
  error?: string;
};

const FormCheckbox: React.FC<CheckboxProps> = ({ name, label, control, defaultValue = false, rules, error }) => {
  return (
    <div>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        rules={rules}
        render={({ field }) => (
          <FormControlLabel
            control={<Checkbox {...field} checked={!!field.value} />}
            label={label}
          />
        )}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default FormCheckbox;
