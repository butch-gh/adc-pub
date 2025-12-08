import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AxiosError } from 'axios';
import { RateLimitNotification } from '../components/shared/RateLimitNotification';

interface ErrorContextType {
  showRateLimitError: (error: AxiosError) => void;
  clearError: () => void;
  isRateLimited: boolean;
  retryCount: number;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  const showRateLimitError = useCallback((error: AxiosError) => {
    if (error.response?.status === 429) {
      setIsRateLimited(true);
      setRetryCount(prev => prev + 1);
      
      // Auto-hide after 10 seconds
      if (retryTimeout) clearTimeout(retryTimeout);
      const timeout = setTimeout(() => {
        setIsRateLimited(false);
      }, 10000);
      setRetryTimeout(timeout);
    }
  }, [retryTimeout]);

  const clearError = useCallback(() => {
    setIsRateLimited(false);
    setRetryCount(0);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
  }, [retryTimeout]);

  const handleRetry = useCallback(() => {
    clearError();
    // Force a page refresh to retry failed requests
    window.location.reload();
  }, [clearError]);

  return (
    <ErrorContext.Provider 
      value={{ 
        showRateLimitError, 
        clearError, 
        isRateLimited, 
        retryCount 
      }}
    >
      {children}
      <RateLimitNotification
        isVisible={isRateLimited}
        onRetry={handleRetry}
      />
    </ErrorContext.Provider>
  );
};

export default ErrorProvider;