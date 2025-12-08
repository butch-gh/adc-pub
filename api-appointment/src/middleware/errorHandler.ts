import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[APPOINTMENT-SERVICE] Error:`, err);

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    service: 'appointment'
  };

  // Validation error
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map((val: any) => val.message).join(', ');
  }

  // Duplicate key error
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered';
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
  }

  res.status(err.statusCode || 500).json(error);
}