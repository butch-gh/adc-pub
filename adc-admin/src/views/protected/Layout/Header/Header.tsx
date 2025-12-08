import React, { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import useGet from "services/hooks/useGet";
import { Badge, Divider, IconButton, useTheme } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '@repo/auth';


function stringToColor(string: string) {
  let hash = 0;

  /* eslint-disable no-bitwise */
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

function stringAvatar(name: string) {
  
  const nameParts = name.split(' '); // Split the name into parts
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[1][0]}` // Use initials of first two words
    : `${nameParts[0][0]}`; // Use only the first character if there's only one word

  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: initials.toUpperCase(), // Make initials uppercase for consistency
  };
}

type Props={
  setUserJobMaster: any;
  notifCount: number;
  toggleDrawer: () => void;
}

const Header: React.FC<Props> = ({toggleDrawer, notifCount, setUserJobMaster}) => {
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userJob, setUserJob] = useState('');
  const theme = useTheme();
  const { user, logout } = useAuth()
  const [isHoveringPortalBtn, setIsHoveringPortalBtn] = useState(false);

  // const notifyToggleDrawer = () => {
  //   setIsDrawerOpen((prev) => !prev);
  // };

  const {data, refetch, isFetching, isFetched} = useGet({
    endpoint: 'user/getinfo', 
    param: {},
    querykey: 'get-user-info',
  });


  useEffect(() => {
    if (data) {
      setUserFullName(data.first_name + ' ' + data.last_name)
      setUserRole(data.role)
      setUserJob(data.job)
      setUserJobMaster(data.job)
    }
  }, [data]);


  return (
    <Box sx={{ display: "flex", width: '100%', backgroundColor:theme.palette.background.paper, alignItems: 'center', paddingRight:'32px', paddingY: 1}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              //onClick={onMenuClick}
              style={{
                padding: '8px',
                borderRadius: '8px',
                color: '#4B5563',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#111827';
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#4B5563';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* <Menu style={{ width: '20px', height: '20px' }} /> */}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(to right, #2563EB, #1D4ED8)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}>
                <User style={{ width: '16px', height: '16px', color: 'white' }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#111827',
                  letterSpacing: '-0.025em',
                  margin: 0
                }}>
                  Dental / Clinic Management
                </h1>
                <p style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  margin: 0
                }}>
                  Dental Clinic Management System
                </p>
              </div>
            </div>
        </div>
      {/* <Box sx={{flexGrow:1, backgroundColor: 'yellow' }}></Box> */}
      {/* Profile Icon */}
      <Box sx={{ marginLeft: "auto", justifyContent:'center', alignItems: 'center' }} display={'flex'} flexDirection={'row'} gap={2}>
        {/* Notification Bell */}
        {
          userJob === 'Dentist' && 
          <IconButton
          aria-label="notifications"
          onClick={toggleDrawer}
          sx={{ marginRight: 5 }}
        >
          <Badge badgeContent={notifCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>  
        }
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#F3F4F6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User style={{ width: '16px', height: '16px', color: '#4B5563' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '500', color: '#111827' }}>{userFullName}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'capitalize' }}>{userJob} / {userRole}</div>
            </div>
          </div>

          {
            // compute button styles so it works in both light and dark modes
          }
          <button
            onClick={() => {
              const token = localStorage.getItem('token');
              const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';
              window.location.href = token ? `${portalUrl}?token=${encodeURIComponent(token)}` : portalUrl;
              localStorage.removeItem('token');
            }}
            style={(() => {
              const base = {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                // adapt base background/border/text for theme
                backgroundColor: theme.palette.mode === 'dark' ? '#008d6f' : '#FFFFFF',
                border: `1px solid ${theme.palette.mode === 'dark' ? '#374151' : '#E5E7EB'}`,
                color: theme.palette.mode === 'dark' ? '#E5E7EB' : '#5e6673'
              } as React.CSSProperties;

              if (isHoveringPortalBtn) {
                const hover = {
                  backgroundColor: theme.palette.mode === 'dark' ? '#0fb491' : '#0fb491',
                  border: `1px solid ${theme.palette.mode === 'dark' ? '#0fb491' : '#E5E7EB'}`,
                  color: `${theme.palette.mode === 'dark' ? '#f9fafb' : '#f9fafb'}`
                } as React.CSSProperties;

                return Object.assign({}, base, hover);
              }

              return base;
            })()}
            onMouseEnter={() => setIsHoveringPortalBtn(true)}
            onMouseLeave={() => setIsHoveringPortalBtn(false)}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            <span>Back to Portal</span>
          </button>
        </div>
      </Box>
    </Box>
  );
};

export default Header;


// import React from "react";
// import "./Header.css"

// const Header: React.FC = () => {
//   return (
//     <div>
//         <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet" />
//         <header>            
//             <div className="logo">
//                 <img src="C:\Users\Rassed\Downloads\Dental logo.png" alt="Logo" height="40" width="40" />
//                 <h3><span>Adriano Dental Clinic</span></h3>
//             </div>
//             <div className="profile-icon">            
//             <a href="#"><img src="https://storage.googleapis.com/a1aa/image/8e5XYrW1N0VFGigSblCUxjxofIUDwsYSEEu7lQT2OLfCgzInA.jpg" alt="User profile" height="40" width="40" /></a>            
//             </div>
//         </header>
//     </div>
//   );
// };

// export default Header;