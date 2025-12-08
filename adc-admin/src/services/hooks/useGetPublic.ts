import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';


const apiCall = async (endpoint: string, param: any) => {
    // const token = localStorage.getItem('token');    
    // if (!token) {
    //     throw new Error("Token not available");
    // }

    try {
        const response = await axios.post(endpoint, param, {});
        return response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            const statusCode = error.response.status;
            if (statusCode === 403) {
                console.warn("Access forbidden. Redirecting to portal...");
                const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';
                window.location.href = portalUrl;
            }
        }
        console.error("API call error:", error);
        throw error;
    }
};


interface Props {
    endpoint: string | undefined;
    param: any;
    querykey: string;
    onErrorCallback?: (error: any) => void; 
}

const useGetPublic = (props: Props) => {
    const { endpoint, param, querykey, onErrorCallback  } = props;
    const { isFetching, isLoading, data, isError, error, isFetched, refetch } = useQuery({
      queryKey: [querykey, endpoint, param],
      queryFn: () => {
          if (endpoint) {
              return apiCall(`${import.meta.env.VITE_API_URL}/appointment-public/${endpoint}`, param);
          }
          return Promise.resolve(null); 
      },
      enabled: Boolean(endpoint),  
      retry: 2,  
    });

    
    useEffect(() => {
        if (isError && error) {
            console.error("API call failed:", error);

            // Trigger the error callback if provided
            if (onErrorCallback) {
                onErrorCallback(error);
            }
        }
    }, [isError, error, onErrorCallback]);

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

export default useGetPublic;
