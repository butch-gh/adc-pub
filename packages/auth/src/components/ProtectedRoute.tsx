import { useAuth } from '../hooks';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  let location;
  try {
    location = useLocation();
  } catch (error) {
    // If useLocation fails, we're not in a Router context
    console.warn('ProtectedRoute rendered outside Router context');
    location = { pathname: window.location.pathname };
  }

  useEffect(() => {
    // Wait until the auth state is resolved
    if (isLoading) {
      return;
    }

    if (!user) {
      // Get portal URL from environment variable or use default
      const portalUrl = import.meta.env?.VITE_PORTAL_URL || 'http://localhost:5173';
      
      // The URL to redirect back to after login is the current URL of the application
      const redirectTo = window.location.href;
      
      // Redirect to the portal's login page, passing the return URL
      window.location.href = `${portalUrl}/login?redirectTo=${encodeURIComponent(redirectTo)}`;
    }
  }, [user, isLoading, location]);

  // While the auth state is resolving or the redirect is in flight, render nothing.
  if (isLoading || !user) {
    return null;
  }

  return children;
}
