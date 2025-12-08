import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

// Add TypeScript declaration for Vite env variables
interface ImportMetaEnv {
    readonly VITE_REDIRECT_PUBLIC_WEB_URL: string;
    // add other env variables here if needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

const Header = () => {
    const handleRedirect = () => {
        window.location.href = `${import.meta.env.VITE_REDIRECT_PUBLIC_WEB_URL}`; // Replace with the desired URL
    };

    return (
        <AppBar
            position="relative"
            sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                color: 'black',
                boxShadow: 'none',
                borderBottom: '1px solid #e0e0e0',
            }}
        >
            <Container>
                <Toolbar
                    disableGutters
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 2,
                    }}
                >
                    {/* Logo and Title */}
                    <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                        onClick={handleRedirect}
                    >
                        <img
                            src="logo.png"
                            alt="Clinic Logo"                            
                        />                        
                    </Box>

                    {/* Redirect Button */}
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRedirect}
                        sx={{
                            textTransform: 'none',
                            fontSize: '1rem',
                            padding: '6px 16px',
                            backgroundColor: '#007FFF',
                            '&:hover': {
                                backgroundColor: '#005FCC',
                            },
                            borderRadius: '8px',
                        }}
                    >
                        Back to Home Page
                    </Button>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Header;


// import React from 'react';
// import AppBar from '@mui/material/AppBar';
// import Toolbar from '@mui/material/Toolbar';
// import Container from '@mui/material/Container';
// import Box from '@mui/material/Box';

// const Header = () => {
//     return (
//         <AppBar            
//             position="relative"
//             sx={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', color: 'black' }}
//         >
//             <Container>
//                 <Toolbar
//                     disableGutters
//                     sx={{
//                         display: 'flex',
//                         justifyContent: 'space-between',
//                         alignItems: 'center',
//                         padding: 2,
//                     }}
//                 >
//                     {/* Logo and Title */}
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                         <img src="logo.png" alt="Clinic Logo" style={{ }} />                        
//                     </Box>

                    
//                 </Toolbar>
//             </Container>
//         </AppBar>
//     );
// };

// export default Header;
