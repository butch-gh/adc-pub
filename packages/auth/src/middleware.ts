import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './token';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Verifying token...');

  const decoded = verifyToken(token);

  if (!decoded) {
    console.log('Authentication failed: Invalid or expired token');
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }

  console.log('Authentication successful for user:', (decoded as any).username);
  (req as any).user = decoded;
  next();
}
