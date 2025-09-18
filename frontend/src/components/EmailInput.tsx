/**
 * Enhanced Email Input component with typo detection and suggestions.
 */

import React, { useState, useEffect } from 'react';
import { validateEmailWithTypoDetection, EmailValidationResult } from '../utils/validation';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  showSuggestion?: boolean;
}

const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = "Enter your email address",
  className = "",
  disabled = false,
  id,
  name,
  required = false,
  showSuggestion = true
}) => {
  const [validationResult, setValidationResult] = useState<EmailValidationResult | null>(null);
  const [showSuggestionBox, setShowSuggestionBox] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);

  // Validate email on change
  useEffect(() => {
    if (value.trim()) {
      const result = validateEmailWithTypoDetection(value);
      setValidationResult(result);
      setShowSuggestionBox(!result.isValid && result.suggestion && showSuggestion);
    } else {
      setValidationResult(null);
      setShowSuggestionBox(false);
    }
  }, [value, showSuggestion]);

  const handleBlur = () => {
    setHasBlurred(true);
    if (onBlur) {
      onBlur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestionBox(false);
  };

  const getInputClassName = () => {
    const baseClasses = "w-full px-3 py-2 sm:py-3 bg-white/10 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-gray-900 placeholder-gray-500 text-sm sm:text-base";
    
    if (validationResult && !validationResult.isValid && hasBlurred) {
      return `${baseClasses} border-red-400/50`;
    } else if (validationResult && validationResult.isValid) {
      return `${baseClasses} border-green-400/50`;
    } else {
      return `${baseClasses} border-white/30`;
    }
  };

  return (
    <div className="relative">
      <input
        type="email"
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => setShowSuggestionBox(validationResult?.suggestion ? true : false)}
        className={getInputClassName()}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="email"
      />
      
      {/* Validation status icon */}
      {value.trim() && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {validationResult?.isValid ? (
            <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : validationResult && !validationResult.isValid ? (
            <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
        </div>
      )}

      {/* Suggestion box */}
      {showSuggestionBox && validationResult?.suggestion && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-3">
            <p className="text-sm text-gray-600 mb-2">
              {validationResult.error}
            </p>
            <button
              type="button"
              onClick={() => handleSuggestionClick(validationResult.suggestion!)}
              className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 text-blue-800 text-sm font-medium transition-colors"
            >
              Use: {validationResult.suggestion}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {validationResult && !validationResult.isValid && hasBlurred && (
        <p className="mt-1 text-sm text-red-300">
          {validationResult.error}
        </p>
      )}

      {/* Success message */}
      {validationResult && validationResult.isValid && (
        <p className="mt-1 text-sm text-green-300">
          ✓ Valid email address
        </p>
      )}
    </div>
  );
};

export default EmailInput;
