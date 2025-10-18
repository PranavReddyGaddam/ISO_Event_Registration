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
            <Link to="/registration" className="cursor-pointer">
              <img 
                src="/Regis.png" 
                alt="Regis Logo" 
                className="h-12 sm:h-16 w-auto hover:opacity-80 transition-opacity duration-200"
              />
            </Link>
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
                <Link 
                  to="/checkin" 
                  className={`nav-item ${isActivePath('/checkin') ? 'nav-item-active' : 'nav-item-inactive'}`}
                >
                  Check-in
                </Link>
                
                {(isPresident() || isFinanceDirector()) && (
                  <>
                    <Link 
                      to="/dashboard" 
                      className={`nav-item ${isActivePath('/dashboard') ? 'nav-item-active' : 'nav-item-inactive'}`}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/uploads" 
                      className={`nav-item ${isActivePath('/uploads') ? 'nav-item-active' : 'nav-item-inactive'}`}
                    >
                      Uploads
                    </Link>
                  </>
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
              className="text-gray-800 hover:text-gray-900 p-2 rounded-md transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg
                className={`w-6 h-6 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isMobileMenuOpen ? 'rotate-90' : 'rotate-0'
                }`}
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
          <div
            className={`md:hidden overflow-hidden will-change-[max-height,opacity,transform] transition-all ${
              isMobileMenuOpen
                ? 'duration-[2000ms] ease-[cubic-bezier(0.22,1,0.36,1)] max-h-[90vh] opacity-100 translate-y-0'
                : 'duration-[550ms] ease-[cubic-bezier(0.4,0,1,1)] max-h-0 opacity-0 -translate-y-2 pointer-events-none'
            }`}
            aria-hidden={!isMobileMenuOpen}
          >
            <div
              className={`px-2 pt-2 pb-3 space-y-1 bg-white/80 backdrop-blur-sm text-gray-900 rounded-lg border border-white/20 shadow-xl transition-all ${
                isMobileMenuOpen
                  ? 'duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)] opacity-100 scale-100'
                  : 'duration-[500ms] ease-[cubic-bezier(0.4,0,1,1)] opacity-0 scale-95'
              }`}
            >
              <Link
                to="/registration"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActivePath('/registration')
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                Registration
              </Link>

              {isAuthenticated() ? (
                <>
                  <Link
                    to="/checkin"
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActivePath('/checkin')
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                    }`}
                  >
                    Check-in
                  </Link>

                  {(isPresident() || isFinanceDirector()) && (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={closeMobileMenu}
                        className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                          isActivePath('/dashboard')
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                        }`}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/uploads"
                        onClick={closeMobileMenu}
                        className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                          isActivePath('/uploads')
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                        }`}
                      >
                        Uploads
                      </Link>
                    </>
                  )}

                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActivePath('/profile')
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                    }`}
                  >
                    Profile
                  </Link>

                  <div className="border-t border-white/30 pt-3 mt-3">
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-700">
                        {currentUser?.full_name} ({currentUser?.role})
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        closeMobileMenu();
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
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
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        
      </div>
    </nav>
  );
};
