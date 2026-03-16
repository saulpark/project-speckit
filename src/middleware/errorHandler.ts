import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error Classes for better error handling
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly fields: Array<{ field: string; message: string; value?: any }>;

  constructor(message: string, fields: Array<{ field: string; message: string; value?: any }> = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}


/**
 * Error Response Interface
 */
interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  status?: number;
  fields?: Array<{ field: string; message: string; value?: any }>;
  stack?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Development vs Production Error Details
 */
function getErrorDetails(error: Error, isDevelopment: boolean): Partial<ErrorResponse> {
  if (isDevelopment) {
    return {
      stack: error.stack
    };
  }
  return {};
}

/**
 * Format error response based on error type
 */
function formatErrorResponse(
  error: Error,
  req: Request,
  isDevelopment: boolean = false
): ErrorResponse {
  let status = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let fields: Array<{ field: string; message: string; value?: any }> | undefined;

  if (error instanceof AppError) {
    status = error.status;
    message = error.message;
    code = error.code;

    if (error instanceof ValidationError) {
      fields = error.fields;
    }
  } else if (error.name === 'ValidationError') {
    // Mongoose validation error
    status = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    // Mongoose cast error
    status = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    status = 503;
    message = 'Database service temporarily unavailable';
    code = 'DATABASE_ERROR';
  } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
    status = 503;
    message = 'Service temporarily unavailable';
    code = 'SERVICE_UNAVAILABLE';
  }

  const response: ErrorResponse = {
    success: false,
    message,
    error: code,
    status,
    timestamp: new Date().toISOString(),
    requestId: req.get('X-Request-ID') || 'unknown',
    ...getErrorDetails(error, isDevelopment)
  };

  if (fields) {
    response.fields = fields;
  }

  return response;
}

/**
 * Global Error Handler Middleware
 */
export function globalErrorHandler() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log the error
    console.error(`Error occurred: ${error.message}`, {
      error: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    const errorResponse = formatErrorResponse(error, req, isDevelopment);

    // Send appropriate response
    res.status(errorResponse.status || 500).json(errorResponse);
  };
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler() {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = new NotFoundError('Route');
    error.message = `Route ${req.method} ${req.originalUrl} not found`;
    next(error);
  };
}

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 */
export function asyncHandler<T extends Request = Request, U extends Response = Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * User-Friendly Error Messages
 */
export const ErrorMessages = {
  // Authentication
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Your session is invalid. Please log in again.',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support.',

  // Registration
  EMAIL_ALREADY_EXISTS: 'An account with this email address already exists. Try logging in instead.',
  WEAK_PASSWORD: 'Your password is not strong enough. Please choose a more secure password.',
  INVALID_EMAIL: 'Please enter a valid email address.',

  // General
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  CSRF_TOKEN_INVALID: 'Security token invalid. Please refresh the page and try again.',

  // File/Upload
  FILE_TOO_LARGE: 'The file you selected is too large. Please choose a smaller file.',
  INVALID_FILE_TYPE: 'This file type is not supported. Please choose a different file.',

  // Database
  DATABASE_ERROR: 'We are experiencing technical difficulties. Please try again later.',
  CONNECTION_ERROR: 'Unable to connect to our services. Please check your connection and try again.'
};

/**
 * Client-Side Error Handling Utilities
 */
export function generateClientErrorHandler(): string {
  return `
// Client-side error handling utilities
SpecKit.errorHandler = {
  // Handle API errors consistently
  handleApiError(error, context = 'request') {
    let message = 'An unexpected error occurred';

    if (error.response) {
      // Server responded with error
      const data = error.response.data;
      message = data.message || 'Server error occurred';

      // Handle specific error types
      switch (data.error) {
        case 'VALIDATION_ERROR':
          if (data.fields && data.fields.length > 0) {
            message = data.fields.map(f => f.message).join(', ');
          }
          break;
        case 'AUTHENTICATION_ERROR':
          message = 'Please log in to continue';
          // Redirect to login after a delay
          setTimeout(() => {
            window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
          }, 2000);
          break;
        case 'RATE_LIMIT_ERROR':
          message = 'Too many requests. Please wait before trying again.';
          break;
        case 'CSRF_TOKEN_INVALID':
          message = 'Security token expired. Please refresh the page.';
          setTimeout(() => window.location.reload(), 2000);
          break;
      }
    } else if (error.request) {
      // Network error
      message = 'Unable to connect to the server. Please check your connection.';
    }

    SpecKit.utils.showAlert(message, 'error');
    console.error('API Error in', context, ':', error);
  },

  // Handle form validation errors
  handleFormErrors(errors, formElement) {
    // Clear previous errors
    const errorElements = formElement.querySelectorAll('.field-error');
    errorElements.forEach(el => el.remove());

    const fieldElements = formElement.querySelectorAll('.is-invalid');
    fieldElements.forEach(el => el.classList.remove('is-invalid'));

    // Display new errors
    errors.forEach(error => {
      const field = formElement.querySelector('[name="' + error.field + '"]');
      if (field) {
        field.classList.add('is-invalid');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = error.message;
        field.parentNode.appendChild(errorDiv);
      }
    });
  },

  // Retry mechanism for failed requests
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        console.warn('Request failed, retrying in', delay, 'ms (attempt', attempt, 'of', maxRetries, ')');
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
};
`;
}