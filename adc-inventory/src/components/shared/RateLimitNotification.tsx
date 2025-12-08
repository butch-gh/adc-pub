import React from 'react';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface RateLimitNotificationProps {
  isVisible: boolean;
  onRetry?: () => void;
  retryIn?: number;
}

export const RateLimitNotification: React.FC<RateLimitNotificationProps> = ({
  isVisible,
  onRetry,
  retryIn
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Rate Limit Reached
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>Too many requests. The system is automatically retrying your request.</p>
            {retryIn && (
              <div className="flex items-center mt-2">
                <Clock className="h-4 w-4 mr-1" />
                <span>Retrying in {Math.ceil(retryIn / 1000)}s</span>
              </div>
            )}
          </div>
          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateLimitNotification;