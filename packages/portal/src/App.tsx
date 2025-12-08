import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from '@repo/auth';
import { LoginForm } from './components/LoginForm';
import PortalHome from './components/PortalHome';
import './App.css';

function AppContent() {
  const { user, logout } = useAuth();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <img
              src="/logo.png"
              alt="ADC Clinic"
              style={{ objectFit: 'cover', borderRadius: 6 }}
            />
            {/* <h1 style={{ margin: 0  }}></h1> */}
          </div>

          <div>
            {user && <button onClick={logout} className="logout-button">Logout</button>}
          </div>
        </div>
      </header>
      <main className="main-content">
        <div className="welcome-section">
          <h2>Welcome to Adriano Dental Clinic Portal</h2>
          <p>Your trusted partner in dental healthcare management</p>
        </div>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <LoginForm />}
          />
          <Route
            path="/"
            element={user ? <PortalHome /> : <Navigate to="/login" />}
          />
        </Routes>
      </main>
      {/* <footer className="app-footer">
        <p>&copy; 2025 Adriano Dental Clinic. All rights reserved.</p>
      </footer> */}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
