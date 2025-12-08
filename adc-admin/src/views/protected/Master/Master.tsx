import React, { useState, useEffect } from 'react';
import './Master.css';  // Import your vanilla CSS file
import Header from '../Layout/Header';
import SideBar from '../Layout/SideBar';
import { Outlet } from 'react-router-dom';
import { AppBar, Box, Drawer, IconButton, Toolbar, CssBaseline } from '@mui/material';
import MenuIcon from "@mui/icons-material/Menu";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import NotificationManager from 'components/NotificationManager';

const drawerWidthOpen = 280;
const drawerWidthClosed = 60;

const Master: React.FC = () => {
  const [isNotifyDrawerOpen, setIsNotifyDrawerOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme')==='dark' ? true : false);
  const [notifCount, setNotifCount] = useState(0);

  const [userJob, setUserJobMaster] = useState('');
  
  // const {data: approveData, refetch, isFetching, isFetched} = useGet({
  //   endpoint: 'appointment-public/approve', 
  //   param: {},
  //   querykey: 'get-appointment-public-approve',
  // });


  // useEffect(() => {
  //   if (approveData) {
  //     setGuest(data)
  //     setNotifCount(data.length)
  //     console.log('Guest', data)      
  //   }
  // }, [approveData]);

  // Toggle Drawer state
  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  // Toggle Dark/Light theme
  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Load saved theme preference from localStorage (optional)
  // useEffect(() => {
  //   const savedTheme = localStorage.getItem('theme');
  //   console.log('savedTheme', savedTheme)
  //   if (savedTheme === 'dark') {
  //     setIsDarkMode(true);
  //   } else {
  //     setIsDarkMode(false);
  //   }
  // }, []);

  // Save theme preference to localStorage (optional)
  useEffect(() => {
    //console.log('isDarkMode', isDarkMode)
    if (isDarkMode) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Define the theme based on current mode
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      ...(isDarkMode
        ? {
            primary: {
              main: '#0fb491', // Lighter gray for primary color (a neutral shade)
              contrastText: '#ffffff', // White text for contrast
            },
            secondary: {
              main: '#90a4ae', // Light blue-gray for secondary accents
              contrastText: '#ffffff', // White text for contrast
            },
            background: {
              default: '#212121', // Dark background (but not too deep)
              paper: '#323232', // Slightly lighter gray for paper elements
            },
            text: {
              primary: '#e0e0e0', // Light gray text (easier to read in dark mode)
              secondary: '#b0bec5', // Subtle gray for secondary text
            },
            divider: '#757575', // Medium gray divider to separate elements
            action: {
              active: '#ffffff', // Active icons or buttons in the UI
              hover: '#424242', // Slightly lighter hover effect
              selected: '#81d4fa', // Light blue selected item color (soft and noticeable)
            },
          }
        : {}),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            ...(isDarkMode
              ? {}
              : {
                  backgroundColor: '#0fb491', // Cyan background in light mode
                  color: '#ffffff', // White text for contrast
                  '&:hover': {
                    backgroundColor: '#008ba3', // Darker cyan on hover
                  },
                }),
          },
        },
      },
      // MuiIconButton: {
      //   styleOverrides: {
      //     root: {
      //       ...(isDarkMode
      //         ? {}
      //         : {
      //             backgroundColor: '#c1c1c1', // Cyan background in light mode
      //             color: '#ffffff', // White text for contrast
      //             '&:hover': {
      //               backgroundColor: '#008ba3', // Darker cyan on hover
      //             },
      //           }),
      //     },
      //   },
      // },
    },
  });



  const notifyToggleDrawer = () => {
    setIsNotifyDrawerOpen((prev) => !prev);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  //console.log('RENDER MASTER', userJob)
  //console.log('loadingApproval', loadingApproval)
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* This applies the background color and typography based on the theme */}

      <Box sx={{ display: "flex", height: "100vh", backgroundColor: isDarkMode ? theme.palette.background.default : "#e7e7e7" }}>
        {/* AppBar */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            borderBottom: 'solid 1px',
            borderBottomColor: theme.palette.mode == 'dark' ? '#707070' : '#e0e0e0'
          }}
          elevation={0}
        >
          <Toolbar
            sx={{
              paddingLeft: { xs: "16px", sm: "24px" },
              paddingRight: { xs: "0px", sm: "0px" },
              justifyContent: 'center',
            }}
          >
            <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ paddingRight: 3 }}>
              <MenuIcon />
            </IconButton>
            <Header toggleDrawer={notifyToggleDrawer} notifCount={notifCount} setUserJobMaster={setUserJobMaster}/>
          </Toolbar>
        </AppBar>

        {/* SideBar Drawer */}
        <Drawer
          variant="permanent"
          open={isDrawerOpen}
          sx={{
            width: isDrawerOpen ? drawerWidthOpen : drawerWidthClosed,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: isDrawerOpen ? drawerWidthOpen : drawerWidthClosed,
              boxSizing: "border-box",
              transition: "width 0.3s",
              whiteSpace: "nowrap",
            },
            ".css-1ygil4i-MuiToolbar-root": {
              minHeight: '90px',
            },
            ".css-1lwhjos-MuiPaper-root-MuiDrawer-paper":{
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : 'default',
              border:'none',
              
            }
          }}
        >
          <Toolbar sx={{height:'90px'}}/>
          <SideBar toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
        </Drawer>
          
        <NotificationManager
          userJob={userJob}
          isOpen={isNotifyDrawerOpen}
          onToggle={notifyToggleDrawer}
          onNotifCountChange={(count) => setNotifCount(count)}
        />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 1,
            height: '100%',
            overflow: 'auto',
            backgroundColor: isDarkMode ? theme.palette.background.default : "#f9fafb",
          }}
        >
          <Toolbar sx={{height:'90px'}}/>
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Master;