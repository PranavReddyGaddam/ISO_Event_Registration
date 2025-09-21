import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Navigation } from "./components";
import { ProtectedRoute } from "./components";

// Import page components
import Registration from "./pages/Registration";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import CheckIn from "./pages/CheckIn";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

import "./styles/main.css";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen relative app-gradient">
          {/* Light Rays Background */}
          {/* Background grids removed in favor of gradient */}

          {/* Navigation */}
          <Navigation />

          {/* Main Content */}
          <main className="flex-1 relative z-10 bg-transparent">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to={localStorage.getItem('volunteer_app_token') ? window.location.pathname || '/registration' : '/login'} replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/registration"
                element={
                  <ProtectedRoute allowedRoles={["president", "volunteer", "finance_director"]}>
                    <Registration />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/checkin"
                element={
                  <ProtectedRoute allowedRoles={["president", "volunteer", "finance_director"]}>
                    <CheckIn />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["president", "finance_director"]}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={["president", "volunteer", "finance_director"]}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

// NotFound Component
const NotFound: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full text-center">
      <div className="mb-8">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600">
          The page you're looking for doesn't exist.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a href="/registration" className="btn btn-primary">
          Go to Registration
        </a>
        <a href="/login" className="btn btn-secondary">
          Admin Login
        </a>
      </div>
    </div>
  </div>
);

// Footer Component
const Footer: React.FC = () => (
  <footer className="bg-black/50 backdrop-blur-sm border-t border-gray-200 mt-auto relative z-10">
    <div className="container py-6">
      <div className="text-center text-sm text-white">
        <p>
          &copy; 2025 Volunteer Event Check-in System. Built with React,
          FastAPI, TypeScript, and Tailwind CSS.
        </p>
        
      </div>
    </div>
  </footer>
);

export default App;
