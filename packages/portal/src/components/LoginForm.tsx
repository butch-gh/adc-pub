import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@repo/auth';
import './LoginForm.css';

export function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo');
      if (redirectTo) {        
        window.location.href = redirectTo;
      }
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="login-container">
      <motion.div
        className="login-card"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div className="logo-section" variants={itemVariants} transition={{ duration: 0.4, ease: "easeOut" }}>
          <motion.div
            className="logo-placeholder"
            whileHover={{ scale: 0.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src="/cliniclogo-wide.jpg"
              alt="ADC Clinic"
              className="clinic-logo"
              style={{ backgroundSize: 'cover' }}
            />
            {/* show simple text only when logo missing or not loaded */}
            {/* <span style={{ display: logoLoaded ? 'none' : 'block' }}>ADC</span> */}
          </motion.div>
        </motion.div>
        
        <div className="form-section">
          <motion.h1 className="login-title" variants={itemVariants} transition={{ duration: 0.4, ease: "easeOut" }}>
            Welcome back
          </motion.h1>
          <motion.p className="login-subtitle" variants={itemVariants} transition={{ duration: 0.4, ease: "easeOut" }}>
            Sign in to your account
          </motion.p>
          
          {error && (
            <motion.div
              className="error-message"
              variants={itemVariants}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {error}
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <motion.div className="input-group" variants={itemVariants} transition={{ duration: 0.4, ease: "easeOut" }}>
              <label htmlFor="username" className="input-label">Email or username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input-field"
                placeholder="Enter your email or username"
              />
            </motion.div>
            
            <motion.div className="input-group" variants={itemVariants} transition={{ duration: 0.4, ease: "easeOut" }}>
              <label htmlFor="password" className="input-label">Password</label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field password-input"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </motion.div>
            
            {/* <motion.div className="form-options" variants={itemVariants} transition={{ duration: 0.4, ease: "easeOut" }}>
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkmark"></span>
                Remember me
              </label>
              
              <a href="#" className="forgot-password-link">Forgot password?</a>
            </motion.div> */}
            
            <motion.button
              type="submit"
              className="submit-button"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              Sign in
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
