/**
 * Authentication types for the frontend.
 */

export enum UserRole {
  PRESIDENT = 'president',
  VOLUNTEER = 'volunteer'
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserResponse | null;
  token: string | null;
}
