import React, { useState, useEffect } from 'react';
import { Modal, Button, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface SelectionOption {
  id: string | number;
  description: string;
}

interface Option {
  id: number;
  description: string;
  tooth_options: SelectionOption[];
}

interface DentalRecordItem {
  id: number;
  treatment: string;
  groupType: string;
  tooth: string;
  patientId: number;
}

interface DentalRecordAddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  item?: DentalRecordItem | null;
  onSubmit: (values: { treatment: string; groupType: string; tooth: string }) => void;
  treatmentOptions: Option[];
  getTeethTypeOptions: (selectedGroupType: number) => SelectionOption[];
}

const DentalRecordAddEditModal: React.FC<DentalRecordAddEditModalProps> = ({
  isOpen,
  onClose,
  mode,
  item,
  onSubmit,
  treatmentOptions,
  getTeethTypeOptions,
}) => {
  const theme = useTheme();
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [selectedGroupType, setSelectedGroupType] = useState<string>('');
  const [selectedTooth, setSelectedTooth] = useState<string>('');

  useEffect(() => {
    if (mode === 'edit' && item) {
      setSelectedTreatment(item.treatment);
      setSelectedGroupType(item.groupType);
      setSelectedTooth(item.tooth);
    } else {
      setSelectedTreatment('');
      setSelectedGroupType('');
      setSelectedTooth('');
    }
  }, [mode, item, isOpen]);

  const handleTreatmentChange = (value: string) => {
    setSelectedTreatment(value);
    setSelectedGroupType('');
    setSelectedTooth('');
  };

  const handleGroupTypeChange = (value: string) => {
    setSelectedGroupType(value);
    setSelectedTooth('');
  };

  const handleToothChange = (value: string) => {
    setSelectedTooth(value);
  };

  const handleSubmit = () => {
    if (selectedTreatment && selectedGroupType && selectedTooth) {
      onSubmit({ treatment: selectedTreatment, groupType: selectedGroupType, tooth: selectedTooth });
      onClose();
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: theme.palette.background.paper,
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <h3 style={{ marginBottom: '16px', color: theme.palette.text.primary }}>
          {mode === 'add' ? 'Add Dental Record' : 'Edit Dental Record'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: theme.palette.text.primary }}>
              Treatment
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
              value={selectedTreatment}
              onChange={(e) => handleTreatmentChange(e.target.value)}
            >
              <option value="">Select Treatment...</option>
              {treatmentOptions.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.description}
                </option>
              ))}
            </select>
          </div>

          {selectedTreatment && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: theme.palette.text.primary }}>
                Group Type
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
                value={selectedGroupType}
                onChange={(e) => handleGroupTypeChange(e.target.value)}
              >
                <option value="">Select Option...</option>
                {treatmentOptions
                  .find((t) => t.id === Number(selectedTreatment))
                  ?.tooth_options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.description}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedGroupType && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: theme.palette.text.primary }}>
                Tooth Selection
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
                value={selectedTooth}
                onChange={(e) => handleToothChange(e.target.value)}
              >
                <option value="">Select Tooth...</option>
                {getTeethTypeOptions(Number(selectedGroupType)).map((tooth) => (
                  <option key={tooth.id} value={tooth.id}>
                    {tooth.description}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!selectedTreatment || !selectedGroupType || !selectedTooth}
          >
            {mode === 'add' ? 'Add' : 'Update'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default DentalRecordAddEditModal;