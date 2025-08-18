import { Request, Response, NextFunction } from 'express';

/**
 * Error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  console.error(`💥 [${requestId}] Error in ${req.method} ${req.path}:`, error);

  // Prevent header already sent errors
  if (res.headersSent) {
    return next(error);
  }

  // Determine error status and message
  let status = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
    details = error.message;
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    status = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    status = 404;
    message = 'Not Found';
  } else if (error.name === 'RateLimitError') {
    status = 429;
    message = 'Too Many Requests';
  }

  // Send error response
  res.status(status).json({
    error: message,
    message: error.message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  });
}

/**
 * 404 handler pro neexistující routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  console.warn(`🔍 [${requestId}] 404: ${req.method} ${req.path}`);
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Async error wrapper pro route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
} 