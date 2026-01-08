import { BadRequestError } from '../utils/httpErrors.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema(req.body);

    if (error) {
      return next(new BadRequestError(error));
    }

    next();
  };
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRequired(fields) {
  return (req, res, next) => {
    const missing = [];

    for (const field of fields) {
      if (!req.body[field]) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return next(new BadRequestError(`Missing required fields: ${missing.join(', ')}`));
    }

    next();
  };
}
