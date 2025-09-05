/**
 * Change Password Form - React component for changing user password.
 */

import React, { useState } from 'react';
import { useApiClient } from '../hooks/useApiClient';
import { ApiStatus } from '../types';

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const ChangePasswordForm: React.FC = () => {
  const [formData, setFormData] = useState<ChangePasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const apiClient = useApiClient();

  const handleInputChange = (field: keyof ChangePasswordData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.current_password.trim()) {
      return 'Current password is required';
    }
    if (!formData.new_password.trim()) {
      return 'New password is required';
    }
    if (formData.new_password.length < 6) {
      return 'New password must be at least 6 characters long';
    }
    if (formData.new_password !== formData.confirm_password) {
      return 'New password and confirmation do not match';
    }
    if (formData.current_password === formData.new_password) {
      return 'New password must be different from current password';
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setStatus(ApiStatus.LOADING);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post('/api/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password
      });

      setStatus(ApiStatus.SUCCESS);
      setSuccess('Password changed successfully!');
      
      // Reset form
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });

    } catch (err: any) {
      setStatus(ApiStatus.ERROR);
      setError(err.response?.data?.detail || 'Failed to change password. Please try again.');
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Password</h2>
        <p className="text-gray-700">
          Update your password to keep your account secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current Password */}
        <div>
          <label htmlFor="current_password" className="block text-sm font-medium text-gray-900 mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              id="current_password"
              value={formData.current_password}
              onChange={(e) => handleInputChange('current_password', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 text-gray-900 placeholder-gray-500"
              placeholder="Enter your current password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.current ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="new_password" className="block text-sm font-medium text-gray-900 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              id="new_password"
              value={formData.new_password}
              onChange={(e) => handleInputChange('new_password', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 text-gray-900 placeholder-gray-500"
              placeholder="Enter your new password (min 6 characters)"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.new ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-900 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              id="confirm_password"
              value={formData.confirm_password}
              onChange={(e) => handleInputChange('confirm_password', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 text-gray-900 placeholder-gray-500"
              placeholder="Confirm your new password"
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPasswords.confirm ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === ApiStatus.LOADING}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === ApiStatus.LOADING ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
