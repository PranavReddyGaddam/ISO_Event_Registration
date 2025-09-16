/**
 * Login page - React component for admin authentication.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserLogin, ApiStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import VolunteerSignupForm from '../components/VolunteerSignupForm';

const Login: React.FC = () => {
  const [formData, setFormData] = useState<UserLogin>({
    email: '',
    password: ''
  });
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);

  const { login, isAuthenticated, getCurrentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user?.role === 'president') {
        navigate('/dashboard');
      } else {
        navigate('/registration');
      }
    }
  }, [isAuthenticated, getCurrentUser, navigate]);


  const handleInputChange = (field: keyof UserLogin, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(ApiStatus.LOADING);
    setError(null);

    try {
      const data = await login(formData);
      // Immediate role-based redirect
      if (data.user.role === 'president') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/registration', { replace: true });
      }
      setStatus(ApiStatus.SUCCESS);
      return;
    } catch (error: any) {
      setStatus(ApiStatus.ERROR);
      setError(error.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 sm:space-y-8 bg-black/50 backdrop-blur-md border border-white/20 rounded-xl p-6 sm:p-8 shadow-xl">
        <div>
          <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/30">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-white">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-white">
            Sign in to manage the volunteer event
          </p>
        </div>


        {/* Login Form */}
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-700/90 border border-red-500 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-white">Login Failed</h3>
                  <p className="mt-1 text-sm text-white">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                autoComplete="email" 
                required 
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-white/80 placeholder-white/90 text-white bg-black/40 rounded-t-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white focus:z-10 sm:text-sm" 
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={status === ApiStatus.LOADING}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input 
                id="password" 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                autoComplete="current-password" 
                required 
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-white/80 placeholder-white/90 text-white bg-black/40 rounded-b-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white focus:z-10 sm:text-sm" 
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={status === ApiStatus.LOADING}
              />
              <button 
                type="button" 
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword 
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                    : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></>
                  }
                </svg>
              </button>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={status === ApiStatus.LOADING}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {status === ApiStatus.LOADING ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Sign up button */}
          <div className="mt-4">
            <button 
              type="button"
              onClick={() => setShowSignupForm(true)}
              className="w-full flex justify-center py-2 px-4 border border-white/30 text-sm font-medium rounded-md text-white bg-transparent hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60 transition-colors"
            >
              Want to become a volunteer? Sign up here
            </button>
          </div>

        </form>

        {/* Volunteer Signup Form */}
        {showSignupForm && (
          <div className="mt-6">
            <VolunteerSignupForm 
              onSuccess={() => setShowSignupForm(false)}
              onCancel={() => setShowSignupForm(false)}
            />
          </div>
        )}
        
      </div>
    </div>
  );
};

export default Login;