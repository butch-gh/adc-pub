import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import DropDownMultipleSelect from '../../../../../../components/hookFormControls/DropDownMultipleSelect';

interface FormValues {
  interests: string[];
}

const options = [
  { value: 'sports', label: 'Sports' },
  { value: 'music', label: 'Music' },
  { value: 'reading', label: 'Reading' },
  { value: 'traveling', label: 'Traveling' },
  { value: 'coding', label: 'Coding' },
];

const DropdownGroup: React.FC = () => {
  const { handleSubmit, control, formState: { errors } } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DropDownMultipleSelect
        name="interests"
        label="Select Your Interests"
        control={control}
        options={options}
        defaultValue={[]}
        //errors={errors.interests}
        rules={{ required: 'Please select at least one interest' }}
      />

      <button type="submit">Submit</button>
    </form>
  );
};

export default DropdownGroup;
