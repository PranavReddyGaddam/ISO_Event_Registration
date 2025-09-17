import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navigation: React.FC = () => {
  const { isAuthenticated, getCurrentUser, logout, isPresident, isFinanceDirector } = useAuth();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActivePath = (path: string): boolean => {
    return location.pathname === path || 
           (path === '/registration' && location.pathname === '/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-transparent backdrop-blur-sm relative z-20 text-gray-900">
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center py-3 sm:py-4">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Regis</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/registration" 
              className={`nav-item ${isActivePath('/registration') ? 'nav-item-active' : 'nav-item-inactive'}`}
            >
              Registration
            </Link>
            
            {isAuthenticated() ? (
              <>
                {import.meta.env.VITE_CHECKIN_ENABLED === 'true' && (
                  <Link 
                    to="/checkin" 
                    className={`nav-item ${isActivePath('/checkin') ? 'nav-item-active' : 'nav-item-inactive'}`}
                  >
                    Check-in
                  </Link>
                )}
                
                {(isPresident() || isFinanceDirector()) && (
                  <Link 
                    to="/dashboard" 
                    className={`nav-item ${isActivePath('/dashboard') ? 'nav-item-active' : 'nav-item-inactive'}`}
                  >
                    Dashboard
                  </Link>
                )}
                
                <div className="flex items-center space-x-2 ml-4">
                  <Link 
                    to="/profile" 
                    className="text-sm text-blue-600 hover:text-blue-700 px-3 py-2 rounded transition-colors"
                  >
                    Profile
                  </Link>
                  <span className="text-sm text-gray-800">
                    {currentUser?.full_name} ({currentUser?.role})
                  </span>
                  <button 
                    onClick={logout}
                    className="text-sm text-red-600 hover:text-red-700 px-3 py-2 rounded transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link 
                to="/login" 
                className={`nav-item ${isActivePath('/login') ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                Admin Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-white hover:text-white/80 p-2 rounded-md transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-black/20 backdrop-blur-sm rounded-lg border border-white/10">
              <Link
                to="/registration"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActivePath('/registration')
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Registration
              </Link>

              {isAuthenticated() ? (
                <>
                  {import.meta.env.VITE_CHECKIN_ENABLED === 'true' && (
                    <Link
                      to="/checkin"
                      onClick={closeMobileMenu}
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActivePath('/checkin')
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Check-in
                    </Link>
                  )}

                  {(isPresident() || isFinanceDirector()) && (
                    <Link
                      to="/dashboard"
                      onClick={closeMobileMenu}
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActivePath('/dashboard')
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Dashboard
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActivePath('/profile')
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Profile
                  </Link>

                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="px-3 py-2">
                      <p className="text-sm text-white/70">
                        {currentUser?.full_name} ({currentUser?.role})
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        closeMobileMenu();
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActivePath('/login')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
