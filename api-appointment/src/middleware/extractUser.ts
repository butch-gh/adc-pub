import { Request, Response, NextFunction } from 'express';

// Middleware to extract user information from headers set by the gateway
export function extractUser(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const username = req.headers['x-user-username'] as string;

  if (userId) {
    (req as any).user = {
      id: userId,
      userId: userId,
      role: userRole,
      email: userEmail,
      username: username
    };
  }

  next();
}