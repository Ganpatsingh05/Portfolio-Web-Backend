import { Request, Response, NextFunction } from 'express';

/**
 * Custom API Error class with status code support
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = 'Bad request') {
    return new ApiError(message, 400);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(message, 403);
  }

  static notFound(message: string = 'Resource not found') {
    return new ApiError(message, 404);
  }

  static conflict(message: string = 'Resource conflict') {
    return new ApiError(message, 409);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(message, 500);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler - 404 for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error | ApiError, req: Request, res: Response, next: NextFunction) => {
  // Log error for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${err.message}`);
    if (err.stack) console.error(err.stack);
  }

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  }

  // Handle Supabase errors
  if ('code' in err && typeof (err as any).code === 'string') {
    const code = (err as any).code;
    
    // Supabase "no rows" error
    if (code === 'PGRST116') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Unique constraint violation
    if (code === '23505') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    
    // Foreign key violation
    if (code === '23503') {
      return res.status(400).json({ error: 'Referenced resource does not exist' });
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }

  // Default 500 error
  return res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};
