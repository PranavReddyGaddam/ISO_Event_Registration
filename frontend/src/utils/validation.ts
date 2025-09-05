/**
 * Form validation utilities with TypeScript.
 */

import { FormErrors } from '@/types';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export class FormValidator {
  private schema: ValidationSchema;

  constructor(schema: ValidationSchema) {
    this.schema = schema;
  }

  public validate(data: Record<string, string>): FormErrors {
    const errors: FormErrors = {};

    Object.entries(this.schema).forEach(([fieldName, rule]) => {
      const value = data[fieldName] || '';
      const error = this.validateField(value, rule);
      
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  }

  public validateField(value: string, rule: ValidationRule): string | null {
    // Required validation
    if (rule.required && !value.trim()) {
      return 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value.trim() && !rule.required) {
      return null;
    }

    // Length validations
    if (rule.minLength && value.length < rule.minLength) {
      return `Must be at least ${rule.minLength} characters long`;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return `Must be no more than ${rule.maxLength} characters long`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return 'Invalid format';
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }

  public isValid(data: Record<string, string>): boolean {
    const errors = this.validate(data);
    return Object.keys(errors).length === 0;
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]{10,}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// Common validation rules
export const ValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: ValidationPatterns.name,
  },
  email: {
    required: true,
    pattern: ValidationPatterns.email,
  },
  phone: {
    required: true,
    pattern: ValidationPatterns.phone,
    custom: (value: string): string | null => {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return 'Phone number must have at least 10 digits';
      }
      return null;
    },
  },
} as const;

// Attendee registration form validator
export const attendeeRegistrationValidator = new FormValidator({
  name: ValidationRules.name,
  email: ValidationRules.email,
  phone: ValidationRules.phone,
});

// Utility functions
export const formatPhoneNumber = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  
  if (digitsOnly.length <= 3) {
    return digitsOnly;
  } else if (digitsOnly.length <= 6) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
  } else if (digitsOnly.length <= 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
  }
};

export const sanitizeInput = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};
