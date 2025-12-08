import React, { useState } from 'react';
import { Box, TextField, InputAdornment, IconButton, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface Props {
    onSearch: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar: React.FC<Props> = ({ onSearch }) => {
    const [searchValue, setSearchValue] = useState('');
    const theme = useTheme(); // Access the current theme

    const handleClear = () => {
        setSearchValue('');
        // Create a synthetic ChangeEvent
        const syntheticEvent = {
            target: { value: '' } as HTMLInputElement,
        } as React.ChangeEvent<HTMLInputElement>;
        onSearch(syntheticEvent);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
        onSearch(event); // Trigger search with updated value
    };

    return (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <TextField
                variant="outlined"
                size="small"
                placeholder="Search..."
                value={searchValue}
                onChange={handleInputChange}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton onClick={handleClear} disabled={!searchValue}>
                                <ClearIcon sx={{color: searchValue ? (theme.palette.mode =='dark' ? theme.palette.text.secondary : '#0fb491') : 'default' }}/>
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
                sx={{
                    width: '100%',
                    maxWidth: '300px',
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'white',
                    borderRadius: '4px',
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: theme.palette.divider,
                        },
                        '&:hover fieldset': {
                            borderColor: theme.palette.text.primary,
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: theme.palette.primary.main,
                        },
                    },
                    color: theme.palette.text.primary,
                }}
            />
        </Box>
    );
};

export default SearchBar;
