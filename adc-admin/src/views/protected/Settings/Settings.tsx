import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Switch,
  Divider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LockIcon from '@mui/icons-material/Lock';
import LogsIcon from '@mui/icons-material/LocalActivity';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Link } from 'react-router-dom';

interface SettingsDrawerProps {
  onChangeTheme: () => void; // Callback to toggle light/dark mode
  isDarkMode: boolean; // Current theme mode
  drawerOpen: boolean;
  toggleDrawer: (open:boolean) => void | any;
}

const Settings: React.FC<SettingsDrawerProps> = ({ onChangeTheme, isDarkMode, drawerOpen, toggleDrawer }) => {
  

  return (
    <>
      {/* Settings Icon to Open Drawer */}
      {/* <IconButton onClick={toggleDrawer(true)} color="inherit">
        <SettingsIcon />
      </IconButton> */}

      {/* Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 280, marginTop:5, paddingTop:10 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <Divider />
          {/* <Typography variant="h6" sx={{ padding: 2 }}>
            Manage Account
          </Typography> */}

          <List>
            {/* Change Password Item */}
            {/* <ListItem disablePadding>
              <ListItemButton 
                  component={Link}
                  to="/changepw">
                <ListItemIcon>
                  <LockIcon />
                </ListItemIcon>
                <ListItemText primary="Change Password" />
              </ListItemButton>
            </ListItem> */}

            {/* Change User name Item */}
            {/* <ListItem disablePadding>
              <ListItemButton 
                  component={Link}
                  to="/changeun">
                <ListItemIcon>
                  <LockIcon />
                </ListItemIcon>
                <ListItemText primary="Change User Name" />
              </ListItemButton>
            </ListItem> */}
          
            {/* <Divider /> */}
          {/* <Typography variant="h6" sx={{ padding: 2 }}>
            Miscellaneous
          </Typography> */}

            {/* Change Theme Item */}
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  {isDarkMode ? <Brightness4Icon /> : <Brightness7Icon />}
                </ListItemIcon>
                <ListItemText primary="Light/Dark Mode" />
                {/* Toggle button to switch between light and dark mode */}                
                <Switch
                  checked={isDarkMode}
                  onChange={onChangeTheme}
                  inputProps={{ 'aria-label': 'theme toggle' }}
                />
              </ListItemButton>
            </ListItem>
          
          <Divider />

          {/* <Typography variant="h6" sx={{ padding: 2 }}>
            Tools
          </Typography> */}
            {/* Change Password Item */}
            {/* <ListItem disablePadding>
              <ListItemButton 
                  component={Link}
                  to="/activity">
                <ListItemIcon>
                  <LogsIcon />
                </ListItemIcon>
                <ListItemText primary="Activity Logs" />
              </ListItemButton>
            </ListItem> */}

          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Settings;
