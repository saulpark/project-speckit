import { body, ValidationChain } from 'express-validator';
import { handleValidationErrors } from './validation';

/**
 * Validation middleware for profile management operations
 */

/**
 * Validate profile update data
 * Validates displayName field with proper constraints
 */
export const validateProfileUpdate: ValidationChain[] = [
  body('displayName')
    .optional({ values: 'null' })
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters')
    .trim()
    .escape()
    .custom((value) => {
      // Allow null/empty to clear display name
      if (value === null || value === '') {
        return true;
      }

      // Check for valid characters (letters, numbers, spaces, basic punctuation)
      const validNameRegex = /^[a-zA-Z0-9\s\-_'.]+$/;
      if (!validNameRegex.test(value)) {
        throw new Error('Display name contains invalid characters');
      }

      // Prevent excessive whitespace
      if (value.includes('  ')) {
        throw new Error('Display name cannot contain multiple consecutive spaces');
      }

      // Prevent starting/ending with whitespace (trim should handle this, but extra safety)
      if (value.trim() !== value) {
        throw new Error('Display name cannot start or end with spaces');
      }

      return true;
    })
];

export const handleProfileUpdate = [
  ...validateProfileUpdate,
  handleValidationErrors
];

/**
 * Validate password change request
 * Ensures current password and new password meet requirements
 */
export const validatePasswordChange: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isLength({ min: 1 })
    .withMessage('Current password cannot be empty'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
    .withMessage('Password confirmation must match new password'),

  // Additional security checks
  body('newPassword')
    .custom((value, { req }) => {
      // Ensure new password is different from current password
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
    .withMessage('New password must be different from current password'),

  body('newPassword')
    .custom((value) => {
      // Check for common weak patterns
      const weakPatterns = [
        /123456/,
        /password/i,
        /qwerty/i,
        /admin/i,
        /user/i,
        /test/i
      ];

      for (const pattern of weakPatterns) {
        if (pattern.test(value)) {
          throw new Error('Password contains common patterns and is not secure');
        }
      }

      // Check for repeated characters (more than 3 in a row)
      if (/(.)\1{3,}/.test(value)) {
        throw new Error('Password cannot contain more than 3 consecutive identical characters');
      }

      return true;
    })
    .withMessage('Password does not meet security requirements')
];

export const handlePasswordChange = [
  ...validatePasswordChange,
  handleValidationErrors
];


/**
 * Validate profile view parameters (for query filtering, etc.)
 */
export const validateProfileView: ValidationChain[] = [
  // Currently no specific validation needed for profile view
  // This can be extended in the future for query parameters
];

export const handleProfileView = [
  ...validateProfileView,
  handleValidationErrors
];

/**
 * Sanitize and validate user input for security
 * This middleware can be used as an additional layer of security
 */
export const sanitizeProfileInput = (req: any, res: any, next: any) => {
  try {
    // Sanitize displayName if present
    if (req.body.displayName) {
      // Remove any potential HTML tags
      req.body.displayName = req.body.displayName.replace(/<[^>]*>/g, '');

      // Normalize whitespace
      req.body.displayName = req.body.displayName.replace(/\s+/g, ' ').trim();

      // Convert empty string to null for consistency
      if (req.body.displayName === '') {
        req.body.displayName = null;
      }
    }

    // Remove any unexpected fields from the request body for security
    const allowedFields = ['displayName', 'currentPassword', 'newPassword', 'confirmPassword', 'password'];
    const sanitizedBody: any = {};

    for (const field of allowedFields) {
      if (req.body.hasOwnProperty(field)) {
        sanitizedBody[field] = req.body[field];
      }
    }

    req.body = sanitizedBody;

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid input data',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Rate limiting validation helper
 * Can be used to implement additional rate limiting logic
 */
export const validateRateLimit = (operation: string) => {
  return (req: any, res: any, next: any) => {
    // This can be extended with Redis-based rate limiting
    // For now, we rely on the general rate limiting middleware

    // Add operation context to request for logging
    req.profileOperation = operation;
    next();
  };
};

/**
 * Custom validation for admin operations (future use)
 */
export const validateAdminOperation: ValidationChain[] = [
  // This will be used for admin-specific validations
];

export const handleAdminOperation = [
  ...validateAdminOperation,
  handleValidationErrors
];

/**
 * Password strength checker utility
 * Returns a score from 0-5 indicating password strength
 */
export function calculatePasswordStrength(password: string): { score: number; feedback: string[] } {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');

  if (password.length >= 12) score += 1;
  else feedback.push('Consider using 12+ characters for better security');

  // Complexity checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push('Add special characters (@$!%*?&)');

  // Bonus points for variety
  const uniqueChars = new Set(password.split('')).size;
  if (uniqueChars > password.length * 0.7) score += 1;

  return {
    score: Math.min(score, 5),
    feedback: score >= 4 ? ['Strong password!'] : feedback
  };
}