import {
	TextField as MuiTextField,
	TextFieldProps as MuiTextFieldProps,
} from '@mui/material';

import { Controller, useFormContext } from 'react-hook-form';

import { GenericType } from './types';
import { useEffect, useState } from 'react';

type TextFieldProps = {
	textFieldProps?: MuiTextFieldProps;
	multiline?: boolean; // Optional prop for multiline support
	rows?: number;       // Number of rows for multiline inputs
	defaultValue?: string; // Default value for the text field
} & GenericType;

export const TextField = (props: TextFieldProps) => {
	const { control } = useFormContext();		
	const preventEnter = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !props.multiline) e.preventDefault();
	};

	return (
		<Controller
			name={props.name}
			control={control}
			rules={props.validations}
			defaultValue={props.defaultValue || ''} // Set default value
			render={({ field, fieldState: { error } }) => (
				<MuiTextField
					id={`${props.name}-textfield`}
					onKeyDown={preventEnter}
					error={!!error}
					helperText={error?.message && <>{error.message}</>}
					InputLabelProps={{ shrink: true }}
					fullWidth
					color="primary"
					variant="outlined"
					size="small"
					margin="none"
					multiline={props.multiline}
					rows={props.multiline ? props.rows : undefined}
					
					{...props.textFieldProps}
					{...field}
				/>
			)}
		/>
	);
};
