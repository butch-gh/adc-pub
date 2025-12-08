import { useState, useCallback } from 'react';
import axios from 'axios';

const useApiCall = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string>('');

    const apiCall = useCallback(
        async (endpoint: string, param: any, errorCallback?: (error: any) => void) => {
            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Token not available');
                }

                const response = await axios.post(endpoint, param, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                return response.data;
            } catch (err: any) {
                if (axios.isAxiosError(err) && err.response) {
                    const statusCode = err.response.status;

                    setErrorCode(statusCode.toString());

                    if (statusCode === 403) {
                        console.warn("Access forbidden. Redirecting to portal...");
                        const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';
                        window.location.href = portalUrl;
                    } else {
                        const errorMessage =
                            err.response.data?.message || 'An error occurred';
                        setError(errorMessage);

                        // Trigger the error callback if provided
                        if (errorCallback) {
                            errorCallback(err);
                        }
                    }
                } else {
                    setError('An unexpected error occurred');

                    // Trigger the error callback for non-Axios errors
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