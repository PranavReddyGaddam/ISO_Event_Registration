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

// Enhanced email validation with typo detection
export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

// Common TLD typos and their corrections
const TLD_TYPOS: Record<string, string> = {
  'con': 'com',
  'cpm': 'com',
  'co': 'com',
  'cm': 'com',
  'c0m': 'com',
  'c0n': 'com',
  'ogr': 'org',
  'n3t': 'net',
  'ed': 'edu',
  'edv': 'edu',
  'edh': 'edu',
  'edj': 'edu',
  'edk': 'edu',
  'edl': 'edu',
  'edn': 'edu',
  'edm': 'edu',
  'edb': 'edu',
  'edg': 'edu',
  'edf': 'edu',
  'edr': 'edu',
  'edt': 'edu',
  'edy': 'edu',
  'edc': 'edu',
  'edx': 'edu',
  'edz': 'edu',
  'edw': 'edu',
  'edq': 'edu',
  'edp': 'edu',
  'eds': 'edu',
  'ed1': 'edu',
  'ed2': 'edu',
  'ed3': 'edu',
  'ed4': 'edu',
  'ed5': 'edu',
  'ed6': 'edu',
  'ed7': 'edu',
  'ed8': 'edu',
  'ed9': 'edu',
  'ed0': 'edu',
  'g0v': 'gov',
};

// Common domain typos and their corrections
const DOMAIN_TYPOS: Record<string, string> = {
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.co': 'gmail.com',
  'yahoo.con': 'yahoo.com',
  'hotmail.con': 'hotmail.com',
  'outlook.con': 'outlook.com',
  // Common .edu typos
  'gmail.ed': 'gmail.edu',
  'gmail.edv': 'gmail.edu',
  'gmail.edh': 'gmail.edu',
  'gmail.edj': 'gmail.edu',
  'gmail.edk': 'gmail.edu',
  'gmail.edl': 'gmail.edu',
  'gmail.edn': 'gmail.edu',
  'gmail.edm': 'gmail.edu',
  'gmail.edb': 'gmail.edu',
  'gmail.edg': 'gmail.edu',
  'gmail.edf': 'gmail.edu',
  'gmail.edr': 'gmail.edu',
  'gmail.edt': 'gmail.edu',
  'gmail.edy': 'gmail.edu',
  'gmail.edc': 'gmail.edu',
  'gmail.edx': 'gmail.edu',
  'gmail.edz': 'gmail.edu',
  'gmail.edw': 'gmail.edu',
  'gmail.edq': 'gmail.edu',
  'gmail.edp': 'gmail.edu',
  'gmail.eds': 'gmail.edu',
  'gmail.ed1': 'gmail.edu',
  'gmail.ed2': 'gmail.edu',
  'gmail.ed3': 'gmail.edu',
  'gmail.ed4': 'gmail.edu',
  'gmail.ed5': 'gmail.edu',
  'gmail.ed6': 'gmail.edu',
  'gmail.ed7': 'gmail.edu',
  'gmail.ed8': 'gmail.edu',
  'gmail.ed9': 'gmail.edu',
  'gmail.ed0': 'gmail.edu',
  // Common university domain typos
  'harvard.ed': 'harvard.edu',
  'mit.ed': 'mit.edu',
  'stanford.ed': 'stanford.edu',
  'berkeley.ed': 'berkeley.edu',
  'ucla.ed': 'ucla.edu',
  'yale.ed': 'yale.edu',
  'princeton.ed': 'princeton.edu',
  'columbia.ed': 'columbia.edu',
  'cornell.ed': 'cornell.edu',
  'duke.ed': 'duke.edu',
  'northwestern.ed': 'northwestern.edu',
  'brown.ed': 'brown.edu',
  'dartmouth.ed': 'dartmouth.edu',
  'vanderbilt.ed': 'vanderbilt.edu',
  'rice.ed': 'rice.edu',
  'washington.ed': 'washington.edu',
  'georgetown.ed': 'georgetown.edu',
  'emory.ed': 'emory.edu',
  'carnegie.ed': 'carnegie.edu',
  'nyu.ed': 'nyu.edu',
  'usc.ed': 'usc.edu',
  'tufts.ed': 'tufts.edu',
  'wake.ed': 'wake.edu',
  'virginia.ed': 'virginia.edu',
  'unc.ed': 'unc.edu',
  'michigan.ed': 'michigan.edu',
  'wisconsin.ed': 'wisconsin.edu',
  'illinois.ed': 'illinois.edu',
  'purdue.ed': 'purdue.edu',
  'indiana.ed': 'indiana.edu',
  'ohio.ed': 'ohio.edu',
  'penn.ed': 'penn.edu',
  'rutgers.ed': 'rutgers.edu',
  'maryland.ed': 'maryland.edu',
  'georgia.ed': 'georgia.edu',
  'florida.ed': 'florida.edu',
  'texas.ed': 'texas.edu',
  'arizona.ed': 'arizona.edu',
  'california.ed': 'california.edu',
  'oregon.ed': 'oregon.edu',
};

// Common email provider typos
const PROVIDER_TYPOS: Record<string, string> = {
  'gmial': 'gmail',
  'gmaill': 'gmail',
  'gmai': 'gmail',
  'gmail.': 'gmail',
  'yahooo': 'yahoo',
  'yaho': 'yahoo',
  'hotmial': 'hotmail',
  'hotmai': 'hotmail',
  'outlok': 'outlook',
  'outloo': 'outlook',
  'outlook.': 'outlook',
};

export const validateEmailWithTypoDetection = (email: string): EmailValidationResult => {
  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic format validation
  if (!ValidationPatterns.email.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  const [localPart, domain] = trimmedEmail.split('@');
  
  if (!localPart || !domain) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  // Check for common TLD typos
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  // Check for exact domain typos (like gmail.con -> gmail.com)
  if (domain in DOMAIN_TYPOS) {
    return {
      isValid: false,
      error: 'Please check your email address for typos'
    };
  }

  // Check for exact TLD typos (like .con -> .com)
  if (tld in TLD_TYPOS) {
    return {
      isValid: false,
      error: 'Please check your email address for typos'
    };
  }

  // Check for common provider typos in the domain (be more specific to avoid false positives)
  for (const [typo, correction] of Object.entries(PROVIDER_TYPOS)) {
    // Only flag if the typo is present and the correction is not already in the domain
    if (domain.includes(typo) && !domain.includes(correction)) {
      return {
        isValid: false,
        error: 'Please check your email address for typos'
      };
    }
  }

  // Check for double dots or other common issues
  if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return {
      isValid: false,
      error: 'Email address contains invalid characters or formatting'
    };
  }

  // Check for suspicious patterns
  if (localPart.length > 64 || domain.length > 253) {
    return {
      isValid: false,
      error: 'Email address is too long'
    };
  }

  // Check for consecutive special characters
  if (/(\.{2,}|_{2,}|-{2,})/.test(localPart)) {
    return {
      isValid: false,
      error: 'Email address contains invalid consecutive characters'
    };
  }

  return {
    isValid: true
  };
};

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
    custom: (value: string): string | null => {
      const result = validateEmailWithTypoDetection(value);
      if (!result.isValid) {
        return result.error || 'Invalid email address';
      }
      return null;
    },
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
