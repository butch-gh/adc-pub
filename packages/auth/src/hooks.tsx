import React, { useState, useEffect, createContext, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL parameters first (for cross-origin auth)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    console.log('Frontend: Checking for token in URL parameters',urlParams);    
    console.log('Frontend: URL token check:', urlToken);
    
    // Only process URL token if we're not on the login page (to prevent restoring after logout)
    const isLoginPage = window.location.pathname.includes('/login');
    
    if (urlToken && !isLoginPage) {
      // Store the token from URL parameters
      localStorage.setItem('token', urlToken);
      // Clean up the URL by removing the token parameter
      const newUrl = window.location.pathname + window.location.hash;
      console.log('Frontend: Cleaning up URL, new URL:', newUrl);
      window.history.replaceState({}, document.title, newUrl);
    }

    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Note: client-side decoding is for convenience, not security.
        // The server is the source of truth for token validity.
        const decoded = jwtDecode(token) as any;

        // Check if token is expired
        if (decoded && decoded.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          //const expirationTime = new Date(decoded.exp * 1000);
          //const currentDateTime = new Date(currentTime * 1000);

          // console.log('Frontend: Token expiration check:', {
          //   expirationTime: expirationTime.toISOString(),
          //   currentTime: currentDateTime.toISOString(),
          //   isExpired: decoded.exp < currentTime,
          //   timeUntilExpiration: decoded.exp - currentTime + ' seconds'
          // });

          if (decoded.exp < currentTime) {
            //console.log('Frontend: Token expired, removing from localStorage');
            localStorage.removeItem('token');
            setIsLoading(false);
            return;
          }
        }
        
        // Assign permissions based on role
        let permissions: string[] = [];
        switch (decoded.role) {
          case 'superadmin':
          permissions = ['billing', 'inventory', 'appointment', 'maintenance'];
          break;
        case 'admin':
          permissions = ['billing', 'inventory', 'appointment', 'maintenance'];
          break;        
        case 'staff':
          permissions = ['appointment','billing','inventory', 'maintenance'];
          break;
        case 'reports':
          permissions = ['appointment', 'billing', 'inventory', 'maintenance'];
          break;
        default:
          permissions = [];
        }
        
        const user: AuthUser = {
          id: decoded.userId,
          username: decoded.username,
          full_name: decoded.username, // Using username as full_name for now
          role: decoded.role,
          permissions: permissions
        };
        console.log('Frontend: Decoded user from token:', user);
        setUser(user);
      } catch (error) {
        console.error('Failed to decode token:', error);
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
      //console.log('Frontend: Using API URL:', apiUrl, username, password);
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      //console.log('Frontend: Login response status:', response.status);

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.data.token);

      // Decode the token and create user object with expected interface
      const decoded = jwtDecode(data.data.token) as any;

      // Check if token is expired
      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        //const expirationTime = new Date(decoded.exp * 1000);
        //const currentDateTime = new Date(currentTime * 1000);

        // console.log('Frontend: New token expiration check:', {
        //   expirationTime: expirationTime.toISOString(),
        //   currentTime: currentDateTime.toISOString(),
        //   isExpired: decoded.exp < currentTime,
        //   timeUntilExpiration: decoded.exp - currentTime + ' seconds'
        // });

        if (decoded.exp < currentTime) {
          throw new Error('Received token is already expired');
        }
      }

      // Assign permissions based on role
      let permissions: string[] = [];
      switch (decoded.role) {
        case 'superadmin':
          permissions = ['billing', 'inventory', 'appointment', 'maintenance'];
          break;
        case 'admin':
          permissions = ['billing', 'inventory', 'appointment', 'maintenance'];
          break;        
        case 'staff':
          permissions = ['appointment', 'billing', 'inventory', 'maintenance'];
          break;
        case 'reports':
          permissions = ['appointment', 'billing', 'inventory', 'maintenance'];
          break;
        default:
          permissions = [];
      }

      const user: AuthUser = {
        id: decoded.userId,
        username: decoded.username,
        full_name: decoded.username, // Using username as full_name for now
        role: decoded.role,
        permissions: permissions
      };

      setUser(user);
    } catch (error) {
      console.error('Frontend: Login error:', error);
      throw error; // Re-throw to let the UI handle the error
    }
  };

  const logout = () => {
    console.log('Frontend: Logout called - clearing all auth data');
    setUser(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    // Clear any other auth-related data
    localStorage.removeItem('user');
    sessionStorage.clear();
    // Force a redirect to login page to ensure clean state
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
