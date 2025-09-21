/**
 * ForgotPasswordModal - Modal component for password reset requests.
 */

import React, { useState } from 'react';
import { authService } from '../utils/auth-service';
import { ApiStatus } from '../types';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(ApiStatus.LOADING);
    setError(null);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      setStatus(ApiStatus.SUCCESS);
    } catch (error: any) {
      setStatus(ApiStatus.ERROR);
      setError(error.message || 'Failed to send reset email');
    }
  };

  const handleClose = () => {
    setEmail('');
    setStatus(ApiStatus.IDLE);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Reset Password</h2>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-500/20 border border-green-500/30 mb-4">
              <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Email Sent!</h3>
            <p className="text-white/70 mb-6">
              If an account with that email exists, a password reset link has been sent to <strong>{email}</strong>.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-white text-black py-2 px-4 rounded-md hover:bg-white/90 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                className="w-full px-3 py-2 border border-white/30 rounded-md bg-black/40 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === ApiStatus.LOADING}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-700/90 border border-red-500 p-3">
                <div className="flex">
                  <svg className="h-5 w-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-white">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2 px-4 border border-white/30 text-white rounded-md hover:bg-white/10 transition-colors"
                disabled={status === ApiStatus.LOADING}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === ApiStatus.LOADING}
                className="flex-1 bg-white text-black py-2 px-4 rounded-md hover:bg-white/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {status === ApiStatus.LOADING ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
