/**
 * Authentication service for managing user login/logout and auth state.
 */

import { UserLogin, LoginResponse, UserResponse, AuthState, UserRole } from '@/types';

const AUTH_TOKEN_KEY = 'volunteer_app_token';
const USER_DATA_KEY = 'volunteer_app_user';

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null
  };

  constructor() {
    this.loadAuthFromStorage();
  }

  /**
   * Load authentication state from localStorage
   */
  private loadAuthFromStorage(): void {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const userData = localStorage.getItem(USER_DATA_KEY);

      if (token && userData) {
        const user = JSON.parse(userData) as UserResponse;
        this.authState = {
          isAuthenticated: true,
          user,
          token
        };
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
      this.clearAuth();
    }
  }

  /**
   * Save authentication state to localStorage
   */
  private saveAuthToStorage(): void {
    if (this.authState.token && this.authState.user) {
      localStorage.setItem(AUTH_TOKEN_KEY, this.authState.token);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(this.authState.user));
    }
  }

  /**
   * Clear authentication from localStorage
   */
  private clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null
    };
  }

  /**
   * Login user with email and password
   */
  async login(credentials: UserLogin): Promise<LoginResponse> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(errorData.detail || 'Login failed');
      }

      const loginData: LoginResponse = await response.json();
      
      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user: loginData.user,
        token: loginData.access_token
      };

      // Save to localStorage
      this.saveAuthToStorage();

      return loginData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuth();
    // Redirect to login page
    window.location.href = '/login';
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserResponse | null {
    return this.authState.user;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.authState.token;
  }

  /**
   * Check if current user is president
   */
  isPresident(): boolean {
    return this.authState.user?.role === UserRole.PRESIDENT;
  }

  /**
   * Check if current user is volunteer
   */
  isVolunteer(): boolean {
    return this.authState.user?.role === UserRole.VOLUNTEER;
  }

  /**
   * Check if current user is finance director
   */
  isFinanceDirector(): boolean {
    return this.authState.user?.role === UserRole.FINANCE_DIRECTOR;
  }


  /**
   * Get authorization headers for API calls
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.authState.token) {
      headers['Authorization'] = `Bearer ${this.authState.token}`;
    }

    return headers;
  }

  /**
   * Check if user has access to a specific route
   */
  hasAccess(route: string): boolean {
    const user = this.authState.user;
    if (!user) return false;

    // Dashboard access for president and finance director
    if (route === '/dashboard' || route === '/admin') {
      return user.role === UserRole.PRESIDENT || 
             user.role === UserRole.FINANCE_DIRECTOR;
    }

    // Check-in access for all roles
    if (route === '/checkin') {
      return user.role === UserRole.PRESIDENT || 
             user.role === UserRole.VOLUNTEER || 
             user.role === UserRole.FINANCE_DIRECTOR;
    }

    // Default: allow access
    return true;
  }

  /**
   * Validate token expiration (basic check)
   */
  isTokenValid(): boolean {
    // For now, just check if token exists
    // In a real app, you'd decode the JWT and check expiration
    return !!this.authState.token;
  }
}

// Export singleton instance
export const authService = new AuthService();
