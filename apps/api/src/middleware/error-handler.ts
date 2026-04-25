import type { Context } from 'hono';

export const errorHandler = (err: Error, c: Context) => {
  console.error('❌ API Error:', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return c.json({
      error: 'Validation Error',
      details: err.message,
    }, 400);
  }

  // Custom app errors
  if ('statusCode' in err && typeof err.statusCode === 'number') {
    return c.json({
      error: err.message,
    }, err.statusCode as number);
  }

  // Default 500
  return c.json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
  }, 500);
};

// Custom error classes
export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}
