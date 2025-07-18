import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './error';

type ValidationTarget = 'body' | 'query' | 'params';

export const validateRequest = (schema: Joi.Schema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const dataToValidate = req[target];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      throw new ValidationError('Validation failed', details);
    }
    
    // Replace the request data with the validated and sanitized data
    req[target] = value;
    
    next();
  };
};