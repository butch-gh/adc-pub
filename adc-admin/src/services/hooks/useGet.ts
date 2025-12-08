import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';

const apiCall = async (endpoint: string, param: any) => {
    const token = localStorage.getItem('token');    
    if (!token) {
        throw new Error("Token not available");
    }
    
    try {
        
        // Ensure the endpoint has the correct API prefix
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
        const fullUrl = `${apiUrl}/appointment/${endpoint}`;
        
        const response = await axios.post(fullUrl, param, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            timeout: 10000, // Add 10 second timeout
        });
        
        return response.data;
    } catch (error: any) {
        console.error('useGet: API call failed:', {
            endpoint,
            error: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status
        });
        
        if (axios.isAxiosError(error)) {
            // Network error (server not running)
            if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
                console.error('Backend server is not running!');
                throw new Error('Cannot connect to server. Please ensure the backend is running.');
            }
            
            // HTTP errors
            if (error.response) {
                const statusCode = error.response.status;
                if (statusCode === 403) {
                    console.warn("Access forbidden. Redirecting to portal...");
                    window.location.href = 'http://localhost:5173';
                } else if (statusCode === 401) {
                    console.warn("Unauthorized. Token might be expired.");
                    localStorage.removeItem('token');
                    window.location.href = 'http://localhost:5173';
                }
            }
        }
        throw error;
    }
};

interface Props {
    endpoint: string;
    param: any;
    querykey: string;
    onErrorCallback?: (error: any) => void; 
}

const useGet = (props: Props) => {    
    const { endpoint, param, querykey, onErrorCallback  } = props;
    
    const { isFetching, isLoading, data, isError, error, isFetched, refetch } = useQuery({
      queryKey: [querykey, endpoint, param],
      queryFn: () => {
          if (endpoint) {             
            return apiCall(endpoint, param);
          }
          return Promise.resolve(null); 
      },
      enabled: Boolean(endpoint),  
      retry: false, // Disable retry to see errors faster
      refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (isError && error) {
            console.error("useGet query failed:", {
                queryKey: querykey,
                endpoint,
                error
            });

            // Trigger the error callback if provided
            if (onErrorCallback) {
                onErrorCallback(error);
            }
        }
    }, [isError, error, onErrorCallback, querykey, endpoint]);

    return {
        data,
        isFetching,
        isLoading,
        refetch,
        isFetched,
        isError,
        error,
    }
};

export default useGet;
