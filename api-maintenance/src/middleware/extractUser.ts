import { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  userId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const extractUser = (req: Request, res: Response, next: NextFunction): void => {
  // Extract user info from headers (set by API gateway)
  const userId = req.headers['x-user-id'] as string;
  const username = req.headers['x-username'] as string;
  const role = req.headers['x-user-role'] as string;

  if (userId && username && role) {
    req.user = {
      userId,
      username,
      role,
    };
  }

  next();
};
