import { useState, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';

interface UseRateLimitingOptions {
  maxRetries?: number;
  baseDelay?: number;
  onRateLimit?: (retryCount: number, retryDelay: number) => void;
  onMaxRetriesExceeded?: () => void;
}

interface RateLimitingState {
  isRateLimited: boolean;
  retryCount: number;
  retryDelay: number;
  isRetrying: boolean;
}

export const useRateLimiting = (options: UseRateLimitingOptions = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onRateLimit,
    onMaxRetriesExceeded
  } = options;

  const [state, setState] = useState<RateLimitingState>({
    isRateLimited: false,
    retryCount: 0,
    retryDelay: 0,
    isRetrying: false
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const handleRateLimit = useCallback((error: AxiosError, originalRequest: () => Promise<any>) => {
    if (error.response?.status !== 429) {
      return Promise.reject(error);
    }

    const currentRetryCount = state.retryCount + 1;
    
    if (currentRetryCount > maxRetries) {
      setState(prev => ({ ...prev, isRateLimited: false, isRetrying: false }));
      onMaxRetriesExceeded?.();
      throw new Error('Maximum retry attempts exceeded due to rate limiting');
    }

    const retryDelay = Math.pow(2, currentRetryCount - 1) * baseDelay + Math.random() * 1000;
    
    setState({
      isRateLimited: true,
      retryCount: currentRetryCount,
      retryDelay,
      isRetrying: true
    });

    onRateLimit?.(currentRetryCount, retryDelay);

    return new Promise((resolve, reject) => {
      retryTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await originalRequest();
          setState({
            isRateLimited: false,
            retryCount: 0,
            retryDelay: 0,
            isRetrying: false
          });
          resolve(result);
        } catch (retryError) {
          if ((retryError as AxiosError).response?.status === 429) {
            handleRateLimit(retryError as AxiosError, originalRequest)
              .then(resolve)
              .catch(reject);
          } else {
            setState(prev => ({ ...prev, isRateLimited: false, isRetrying: false }));
            reject(retryError);
          }
        }
      }, retryDelay);
    });
  }, [state.retryCount, maxRetries, baseDelay, onRateLimit, onMaxRetriesExceeded]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState({
      isRateLimited: false,
      retryCount: 0,
      retryDelay: 0,
      isRetrying: false
    });
  }, []);

  const forceRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setState(prev => ({ ...prev, retryDelay: 0 }));
  }, []);

  return {
    ...state,
    handleRateLimit,
    reset,
    forceRetry
  };
};

export default useRateLimiting;