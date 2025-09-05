/**
 * Main types export file.
 */

export * from './attendee';
// Re-export only once to avoid duplicate identifier conflicts
export { ApiResponse, ApiError, ValidationError, ApiValidationError, HttpMethod, ApiRequestConfig, ApiClientConfig, ApiStatus, ApiState } from './api';
export * from './auth';

// Global app types
export interface AppConfig {
  apiBaseUrl: string;
  eventName: string;
  eventDate: string;
}

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'tel' | 'password';
  label: string;
  placeholder?: string;
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

export interface FormErrors {
  [key: string]: string;
}

export interface QRScannerConfig {
  fps: number;
  qrbox: number;
  aspectRatio: number;
  disableFlip: boolean;
}

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

export interface ComponentProps {
  className?: string;
  children?: any; // React.ReactNode when migrated to React
}

// Navigation types
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  active?: boolean;
}

export interface PageMeta {
  title: string;
  description?: string;
  keywords?: string[];
}
