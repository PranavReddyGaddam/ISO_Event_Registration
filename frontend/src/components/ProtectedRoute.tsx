import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, hasAccess } = useAuth();

  // Not authenticated - redirect to login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but no access - show access denied
  if (!hasAccess(allowedRoles)) {
    return <AccessDenied />;
  }

  // Has access - render children
  return <>{children}</>;
};

const AccessDenied: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full text-center">
      <div className="mb-8">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Insufficient Permissions</h2>
        <p className="text-gray-600">You don't have permission to access this page.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href="/registration" className="btn btn-primary">
          Go to Registration
        </a>
        <a href="/login" className="btn btn-secondary">
          Login
        </a>
      </div>
    </div>
  </div>
);
