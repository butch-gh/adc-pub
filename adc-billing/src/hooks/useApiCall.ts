import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

const useApiCall = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string>('');

    const apiCall = useCallback(
        async (endpoint: string, param: any, errorCallback?: (error: any) => void) => {
            setLoading(true);
            setError(null);

            try {
                const response = await api.post(endpoint, param);
                return response.data;
            } catch (err: any) {
                if (err.response) {
                    const statusCode = err.response.status;
                    setErrorCode(statusCode.toString());

                    const errorMessage = err.response.data?.message || 'An error occurred';
                    setError(errorMessage);

                    if (errorCallback) {
                        errorCallback(err);
                    }
                } else {
                    setError('An unexpected error occurred');
                    if (errorCallback) {
                        errorCallback(err);
                    }
                }

                throw err;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return { apiCall, loading, error, errorCode };
};

export default useApiCall;