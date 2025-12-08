import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        un: string;
        role?: string;
      };
    }
  }
}

export interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roles: string[];
  full_name: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}
