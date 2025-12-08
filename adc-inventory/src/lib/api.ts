import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

console.log('API Base URL:', API_BASE_URL);

// Request queue to manage rate limiting
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly minInterval = 100; // Minimum 100ms between requests

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
      }
      
      const request = this.queue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }
    
    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

// Store retry counts for requests
const retryMap = new WeakMap();

export const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    console.log('Making API request:', config.method?.toUpperCase(), config.url);
    console.log('Full URL:', `${config.baseURL}${config.url}`);

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Initialize retry count if not exists
    if (!retryMap.has(config)) {
      retryMap.set(config, { retryCount: 0 });
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic for rate limiting
api.interceptors.response.use(
  (response) => {
    console.log('API response received:', response.status, response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    
    console.error('API response error:', error.message);
    console.error('Error config:', error.config);
    console.error('Error response:', error.response);

    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429 && config) {
      const retryData = retryMap.get(config) || { retryCount: 0 };
      const maxRetries = 3;
      
      if (retryData.retryCount < maxRetries) {
        const backoffTime = Math.pow(2, retryData.retryCount) * 1000 + Math.random() * 1000; // 1s, 2s, 4s + jitter
        
        console.log(`Rate limited. Retrying in ${backoffTime}ms (attempt ${retryData.retryCount + 1}/${maxRetries})`);
        
        retryData.retryCount += 1;
        retryMap.set(config, retryData);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        return requestQueue.add(() => api.request(config));
      } else {
        console.error('Max retries exceeded for rate limiting');
        retryMap.delete(config);
        throw new Error('Request failed after multiple attempts due to rate limiting. Please try again later.');
      }
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);
