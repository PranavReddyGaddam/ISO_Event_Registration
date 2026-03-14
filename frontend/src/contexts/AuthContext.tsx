import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserLogin, LoginResponse, UserResponse, AuthState, UserRole } from '../types';

interface AuthContextType {
  authState: AuthState;
  isLoading: boolean;
  login: (credentials: UserLogin) => Promise<LoginResponse>;
  logout: () => void;
  isAuthenticated: () => boolean;
  getCurrentUser: () => UserResponse | null;
  isPresident: () => boolean;
  isVolunteer: () => boolean;
  isFinanceDirector: () => boolean;
  hasAccess: (allowedRoles: string[]) => boolean;
  hasVolunteerRegistrationAccess: () => boolean;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'volunteer_app_token';
const USER_DATA_KEY = 'volunteer_app_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    loadAuthFromStorage();
  }, []);

  const loadAuthFromStorage = (): void => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const userData = localStorage.getItem(USER_DATA_KEY);

      if (token && userData) {
        const user = JSON.parse(userData) as UserResponse;
        setAuthState({
          isAuthenticated: true,
          user,
          token
        });
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthToStorage = (token: string, user: UserResponse): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  };

  const clearAuth = (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
  };

  const login = async (credentials: UserLogin): Promise<LoginResponse> => {
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
      setAuthState({
        isAuthenticated: true,
        user: loginData.user,
        token: loginData.access_token
      });

      // Save to localStorage
      saveAuthToStorage(loginData.access_token, loginData.user);

      return loginData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = (): void => {
    clearAuth();
  };

  const isAuthenticated = (): boolean => {
    return authState.isAuthenticated;
  };

  const getCurrentUser = (): UserResponse | null => {
    return authState.user;
  };

  const isPresident = (): boolean => {
    return authState.user?.role === UserRole.PRESIDENT;
  };

  const isVolunteer = (): boolean => {
    return authState.user?.role === UserRole.VOLUNTEER;
  };

  const isFinanceDirector = (): boolean => {
    return authState.user?.role === UserRole.FINANCE_DIRECTOR;
  };


  const hasAccess = (allowedRoles: string[]): boolean => {
    const user = authState.user;
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const hasVolunteerRegistrationAccess = (): boolean => {
    const user = authState.user;
    if (!user) return false;
    
    // Presidents always have access regardless of team_role
    if (user.role === UserRole.PRESIDENT) {
      return true;
    }
    
    // TEMPORARY: Specific emails for registration desk access (March 14, 2026)
    const temporaryAccessEmails = [
      'eashita.bhardwaj@sjsu.edu',
      'mrunalsuhas.kotkar@sjsu.edu',
      'zeniadilip.malani@sjsu.edu',
      'pratiksha.kaushik@sjsu.edu',
      'vanshikahardik.shah@sjsu.edu',
      'mannat.bhargavaa@gmail.com',
      'raghav.sareen@sjsu.edu',
      'mithil.patel@sjsu.edu',
      'mishaumeshkumar.patel@sjsu.edu',
      'diyaashok.jhawar@sjsu.edu',
      'rohan.mansukhani@sjsu.edu',
      'zohazubair.dhanani@sjsu.edu',
      'sohamsachin.joshi@sjsu.edu',
      'snehil.raut@sjsu.edu'
    ];
    
    if (temporaryAccessEmails.includes(user.email)) {
      return true;
    }
    
    // Normalize team_role for case-insensitive comparison
    const normalizedTeamRole = (user.team_role || '').trim().toLowerCase();
    
    // Directors and Secretaries always have access (case-insensitive)
    if (normalizedTeamRole === 'director' || normalizedTeamRole === 'secretary') {
      return true;
    }
    
    const allowedRoles = ['director', 'secretary', 'president', 'vice president'];
    return allowedRoles.includes(normalizedTeamRole);
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (authState.token) {
      headers['Authorization'] = `Bearer ${authState.token}`;
    }

    return headers;
  };

  const value: AuthContextType = {
    authState,
    isLoading,
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    isPresident,
    isVolunteer,
    isFinanceDirector,
    hasAccess,
    hasVolunteerRegistrationAccess,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
