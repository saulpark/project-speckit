import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ContentProcessor } from '../utils/contentProcessor';

function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
}

export const validateNote: RequestHandler[] = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be 200 characters or less')
    .trim(),

  body('content.type')
    .optional()
    .isIn(['delta', 'plain'])
    .withMessage('Content type must be delta or plain'),

  body('content.data')
    .custom((value, { req }) => {
      const contentType = (req.body as any)?.content?.type || 'delta';

      if (contentType === 'delta') {
        if (!ContentProcessor.validateDelta(value)) {
          throw new Error('Invalid Delta format');
        }
      } else if (contentType === 'plain') {
        if (typeof value !== 'string') {
          throw new Error('Plain content must be a string');
        }
      }

      return true;
    }),

  handleValidationErrors as RequestHandler,
];

export const validateNoteUpdate: RequestHandler[] = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be 200 characters or less')
    .trim(),

  body('content')
    .optional()
    .custom((value) => {
      if (value && value.data) {
        const contentType = value.type || 'delta';
        if (contentType === 'delta' && !ContentProcessor.validateDelta(value.data)) {
          throw new Error('Invalid Delta format');
        }
      }
      return true;
    }),

  handleValidationErrors as RequestHandler,
];
