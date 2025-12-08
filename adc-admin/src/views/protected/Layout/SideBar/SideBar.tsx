import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from '@repo/auth';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Box,
  Tooltip,
  createTheme,
  useTheme,
  Stack,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import BuildIcon from "@mui/icons-material/Build";
import CMSIcon from "@mui/icons-material/ContentPaste";
import Settings from "views/protected/Settings";
import useGet from "services/hooks/useGet";
import useLogActivity from "services/hooks/useLogActivity";

// Define the UserRole type
type UserRole = "Superadmin" | "Admin" | "Staff" | "Report Viewer";
type Access = {
  access : string[];
}


const menuItems = [
    { code: 'AP0', text: "Dashboard", icon: <HomeIcon />, link: "/" },
    { code: 'AP1', text: "User", icon: <PersonIcon />, link: "/user" },
    { code: 'AP6', text: "Dentist", icon: <PersonIcon />, link: "/dentist" },
    { code: 'AP2', text: "Appointment Scheduling", icon: <EventIcon />, link: "/appointment"},
    { code: 'AP5', text: "Guest Appointment", icon: <EventIcon />, link: "/guest-appointment" },    
    { code: 'AP3', text: "Patient Profiles", icon: <PersonIcon />, link: "/patient"},
    { code: 'AP4', text: "Performance Reports", icon: <BarChartIcon />, link: "/reports"},
    
  ];

  // const bottomMenuItems = [  
  //   { text: "Preferences", icon: <SettingsIcon />, link: "", action: toggleDrawer(true) },
  //   { text: "Logout", icon: <LogoutIcon />, link: "", action: handleLogout },
  // ];

type BottomMenuItem = {
    text: string;
    icon: React.ReactNode;
    link: string;
    action?: ((event: React.KeyboardEvent<Element> | React.MouseEvent<Element>) => void) | undefined;
  };

const SideBar: React.FC<{ toggleTheme: () => void; isDarkMode: boolean }> = ({
  toggleTheme,
  isDarkMode,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [userAccess, setUserAccess] = useState<string[]>([]);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bottomMenuItems, setBottomMenuItems] = useState<BottomMenuItem[]>([]);
  const theme = useTheme();

  const {data, isFetching, isLoading } = useGet({
    endpoint: 'user/get-access', 
    param: {},
    querykey:'get-user-access-item'
  });

  // Toggle the drawer open or closed
  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    //console.log('TOGGLE DRAWER EVENT', event);
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" || (event as React.KeyboardEvent).key === "Shift")
    ) {
      return;
    }
    //console.log('TOGGLE DRAWER', open);
    setDrawerOpen(open);
  };


  // Set up bottom menu items
  useEffect(() => {
    const bottomsMenuItems = [    
      { text: "Preferences", icon: <SettingsIcon />, link: "", action: (event: React.KeyboardEvent | React.MouseEvent) => toggleDrawer(true)(event) },
      // { text: "Back to Portal", icon: <LogoutIcon />, link: "", action: () => handleLogout() },
    ];
    setBottomMenuItems(bottomsMenuItems);
  }, []);

  const { logActivity} = useLogActivity();

  // const handleLogout = async () => {
  //   if (user) {
  //     await logActivity({action: 'Logout', module: 'ADC-ADMIN:Logout', details: JSON.stringify({ status: 'success', detail: `Success Logout: ${user.username}`, endpoint: 'none' })});
  //   }
  //   logout(); // Use the shared auth logout function
  //   navigate("/"); // Navigate to home, the ProtectedRoute will handle redirection to portal
  // };


  
  
  useEffect(()=>{    
    if (data && data.access) {
      try {
        console.log('Raw user access data:', data.access); // Debug log
        const parsedAccess = JSON.parse(data.access);
        console.log('Parsed user access:', parsedAccess); // Debug log
        setUserAccess(parsedAccess);
      } catch (error) {
        console.error("Error parsing access data:", error);
      }
    }
  },[data])

  // Debug logs
  //console.log('USER ACCESS:', userAccess);  
  // console.log('API Data:', data);
  // console.log('API Loading:', isLoading);
  // console.log('API Fetching:', isFetching);  

  // const handleCMSClick = () => {
  //   if (isAuthenticated()) {
  //     const allowedRoles = ["Superadmin", "Admin"]; // Define which roles can access CMS
  //     if (token) {
  //     const decoded = jwtDecode<DecodedToken>(token);
  //   if (!allowedRoles.includes(decoded.role)) {
  //     console.error("Insufficient permissions to access CMS");
  //     return;
  //   }
  //     window.open('http://localhost:5174/', '_blank', 'noopener,noreferrer');

  //   } else {
  //     alert("Access denied");
  //   }
  // };


  // const accessData = {
  // 'Superadmin': ['AP0', 'AP1', 'AP2', 'AP3', 'AP4', 'AP5', 'AP6', 'AP7'],
  //     'Admin': ['AP0', 'AP1', 'AP2', 'AP3', 'AP5', 'AP6', 'AP7'],
  //     'Staff': ['AP0', 'AP2', 'AP4', 'AP6', 'AP7'],
  //     'Report Viewer': ['AP0', 'AP4', 'AP6', 'AP7'],
  // }
  // const accessPrivelege: { [key: string]: string[] } = accessData;




  // Main menu items, modified to include role-based rendering
  
// console.log('USERACCESS', userAccess.includes('AP1'), userAccess?.access)
  //console.log('USERACCESS', userAccess)
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Main Menu */}
      <List>
        {menuItems.map((item, index) => {
          // Show menu item if:
          // 1. User has specific access to this item code, OR
          // 2. User has admin permission from SSO (fallback), OR
          // 3. API is still loading (show all temporarily)
          const hasAccess = (userAccess && userAccess.includes(item.code)) || 
                           (user?.permissions?.includes('admin')) || 
                           isLoading || 
                           isFetching;
          
          //console.log(`Menu item ${item.code} (${item.text}): hasAccess=${hasAccess}, userAccess.includes=${userAccess?.includes(item.code)}, isAdmin=${user?.permissions?.includes('admin')}`);
          
          return hasAccess ? (
            <ListItem
              key={index}
              disablePadding
              sx={{ display: "block" }}
              component={item.link ? Link : "div"}
              to={item.link || undefined}
            >
              <Tooltip title={!isDrawerOpen ? item.text : ""} placement="right">
                <ListItemButton
                  sx={{
                    justifyContent: isDrawerOpen ? "initial" : "center",
                    px: 2.5,
                    color: theme.palette.text.primary,
                    backgroundColor: location.pathname === item.link ? "#0fa796" : "inherit",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isDrawerOpen ? 3 : "auto",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {isDrawerOpen && <ListItemText primary={item.text} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ) : null;
        })}
      </List>

      
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      {/* Bottom Menu */}
      
        <Settings onChangeTheme={toggleTheme} isDarkMode={isDarkMode} drawerOpen={drawerOpen} toggleDrawer={toggleDrawer}/>
        <Stack>
        <List>
          {bottomMenuItems.map((item, index) =>
            //userAccess && 
            //userAccess.includes(item.code)  && (
              <ListItem key={index} disablePadding sx={{ display: "flex" }}>
                <Tooltip title={!isDrawerOpen ? item.text : ""} placement="right">
                  <ListItemButton
                    sx={{
                      justifyContent: isDrawerOpen ? "initial" : "center",
                      px: 2.5,
                      color: location.pathname === item.link ? theme.palette.text.primary: theme.palette.text.primary,
                      backgroundColor: location.pathname === item.link ? "#0fa796" : "inherit",
                      // "&:hover": {
                      //   backgroundColor: "#d4d4d4",
                      //   color: "#4c4c4c",
                      //   opacity: 0.7
                      // },
                    }}
                    onClick={item.action ? item.action : undefined}
                    component={item.link && !item.action ? Link : "button"}
                    to={item.link && !item.action ? item.link : undefined}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isDrawerOpen ? 3 : "auto",
                        justifyContent: "center",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {isDrawerOpen && <ListItemText primary={item.text} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            //)
          )}
        </List>
      </Stack>
      
      
    </Box>
  );
};

export default SideBar;