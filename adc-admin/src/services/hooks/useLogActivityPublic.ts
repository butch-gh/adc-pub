import { useRef, useState } from 'react';
import axios from 'axios';
import useApiCallPublic from './useApiCallPublic';

// Function to fetch public IP address
const GetIpAddress = async (): Promise<string> => {
  try {
    const response = await axios.get('https://api64.ipify.org?format=json');
    return response.data.ip; // Returns the IP address as a string
  } catch (error) {
    console.error('Error fetching public IP:', error);
    return '127.0.0.1'; // Fallback to localhost if the IP cannot be fetched
  }
};

interface LogActivityProps {
  action: string;
  module: string;
  details: string;
}

const useLogActivityPublic = () => {
  const { apiCall, loading, error } = useApiCallPublic();
  const isLoggingRef = useRef(false); // Tracks if a logging call is ongoing

  // Log activity function
  const logActivity = async (props: LogActivityProps) => {
    if (isLoggingRef.current) {
      console.warn('An activity log request is already in progress.');
      return;
    }

    // Fetch the public IP address
    const publicIP = await GetIpAddress();

    // Set logging as in-progress
    isLoggingRef.current = true;

    const param = {
      action: props.action,
      module: props.module,
      ipAdd: publicIP,  // Directly using the result of GetIpAddress
      details: props.details,
    };

    try {
      // Log the activity by calling the API
      await apiCall(`${import.meta.env.VITE_API_URL}/appointment/logs-public/add`, { ...param });
      //console.log('Activity logged successfully:', param);
    } catch (error) {
      console.error('Error logging activity:', error);
    } finally {
      // Reset logging state
      isLoggingRef.current = false;
    }
  };

  return { logActivity, loading, error };
};

export default useLogActivityPublic;
