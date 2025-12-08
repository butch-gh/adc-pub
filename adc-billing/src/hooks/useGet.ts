import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffect } from 'react';

const apiCall = async (endpoint: string, param: any) => {
    try {
        // Filter out undefined values from params and convert to strings
        const cleanParams: Record<string, string> = {};
        
        if (param && typeof param === 'object') {
            Object.entries(param).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    cleanParams[key] = String(value);
                }
            });
        }
        
        // For GET requests with parameters, append them as query string
        const queryString = new URLSearchParams(cleanParams).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        const response = await api.get(url);
        return response.data;
    } catch (error: any) {
        console.error('useGet: API call failed:', {
            endpoint,
            error: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw error;
    }
};

interface Props {
    endpoint: string;
    param: any;
    querykey: string;
    onErrorCallback?: (error: any) => void;
    enabled?: boolean; // Add optional enabled prop
}

const useGet = (props: Props) => {    
    const { endpoint, param, querykey, onErrorCallback, enabled = true } = props;
    
    // Determine if query should be enabled
    const shouldEnable = Boolean(endpoint) && enabled && 
        // Check if any required parameters are undefined
        (param === null || param === undefined || 
         !Object.values(param || {}).some(value => value === undefined));
    
    const { isFetching, isLoading, data, isError, error, isFetched, refetch } = useQuery({
      queryKey: [querykey, endpoint, param],
      queryFn: () => {
          if (endpoint) {             
            return apiCall(endpoint, param);
          }
          return Promise.resolve(null); 
      },
      enabled: shouldEnable,  
      retry: false,
      refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (isError && error) {
            console.error("useGet query failed:", {
                queryKey: querykey,
                endpoint,
                error
            });

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