import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, useAuth } from '@repo/auth';
import Master from './views/protected/Master';
import User from './views/protected/User';
import Patient from './views/protected/Patient';
import Appointment from './views/protected/Appointment';
import Maintenance from './views/protected/Maintenance';
import Dashboard from './views/protected/Dashboard';
import ChangePassword from './views/protected/Access/ChangePassword';
import PerformanceReports from './views/protected/PerformanceReports';
import ChangeUserName from './views/protected/Access/ChangeUserName';
import useGet from './services/hooks/useGet';
import ActivityLogsViewer from './views/protected/Tools/ActivityLogsViewer';
import BookAppointment from './views/public/appointment/BookAppointment';
import Dentist from './views/protected/Dentist';
import AppointmentGuest from 'views/protected/AppointmentGuest/AppointmentGuest';

type Screen = {
  code : string;
  description: string;
  route : string;
}

// Role Protected Route component
const RoleProtectedRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [userAccess, setUserAccess] = useState<string[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const { user } = useAuth();

  const { data: screenData } = useGet({
    endpoint: "role/getscreen",
    param: {},
    querykey: "get-screen-list",
  });

  const { data } = useGet({
    endpoint: "user/get-access",
    param: {},
    querykey: "get-user-access-item",
  });

  // Process user access data
  useEffect(() => {
    if (data?.access) {
      try {
        const parsedAccess = JSON.parse(data.access);
        setUserAccess(parsedAccess);
      } catch (error) {
        console.error("Error parsing access data:", error);
      }
    }
  }, [data]);

  // Process screen data
  useEffect(() => {
    if (screenData) {
      setScreens(screenData);
    }
  }, [screenData]);

  // Map user access to valid paths
  useEffect(() => {
    if (screens.length > 0 && userAccess.length > 0) {
      const matchedObjects = userAccess
        .map((code) => screens.find((obj) => obj.code === code))
        .filter((obj): obj is typeof screens[number] => obj !== undefined);

      const routesArray = matchedObjects.map((obj) => obj.route);
      setPaths(routesArray);
    }
  }, [screens, userAccess]);

  // Check current path against accessible paths
  useEffect(() => {
    if (paths.length > 0) {
      const currentPath = location.pathname;
      const isPathAccessible = [...paths,...['/changepw','/changeun','/activity']].includes(currentPath);

      if (!isPathAccessible) {
        navigate("/");      
      }
    }
  }, [paths, navigate, location.pathname]);

  // If user is not authenticated, the ProtectedRoute will handle redirection
  if (!user) {
    return null;
  }

  return (
    <Routes>
      {/* Protected Routes */}
      <Route element={<Master />}>
        <Route path="/" element={<Dashboard />} />            
        <Route path="/user" element={<User />} />
        <Route path="/dentist" element={<Dentist />} />
        <Route path="/patient" element={<Patient />} />
        <Route path="/appointment" element={<Appointment />} />
        <Route path="/guest-appointment" element={<AppointmentGuest />} />
        <Route path="/reports" element={<PerformanceReports />} />
        {/* <Route path="/changepw" element={<ChangePassword />} />
        <Route path="/changeun" element={<ChangeUserName />} /> */}
        <Route path="/activity" element={<ActivityLogsViewer />} />
        <Route path="*" element={<Navigate to="/" />} />            
      </Route>
    </Routes>
  );
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes - accessible without authentication */}
        <Route path="/appointment-guest" element={<BookAppointment />} />
        <Route path="/cms" element={<ExternalRedirect url={import.meta.env.VITE_REDIRECT_CMS ?? ""} />} />
        
        {/* Protected Routes - require authentication */}
        <Route path="/*" element={
          <ProtectedRoute>
            <RoleProtectedRoute />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

const ExternalRedirect: React.FC<{ url: string }> = ({ url }) => {
  useEffect(() => {
    // Redirect to external URL in the same tab
    window.location.href = url;
  }, [url]);

  // Show a loading message while redirecting
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px' 
    }}>
      Redirecting to CMS...
    </div>
  );
};
