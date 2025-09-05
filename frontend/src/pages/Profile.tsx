/**
 * Profile page - React component for user profile management.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiClient } from '../hooks/useApiClient';
import { UserResponse, ApiStatus } from '../types';
import ChangePasswordForm from '../components/ChangePasswordForm';

const Profile: React.FC = () => {
  const { } = useAuth();
  const apiClient = useApiClient();
  const [userInfo, setUserInfo] = useState<UserResponse | null>(null);
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    setStatus(ApiStatus.LOADING);
    setError(null);

    try {
      const user = await apiClient.get<UserResponse>('/api/auth/me');
      setUserInfo(user);
      setStatus(ApiStatus.SUCCESS);
    } catch (err: any) {
      setStatus(ApiStatus.ERROR);
      setError(err.response?.data?.detail || 'Failed to load user information');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Profile</h1>
          <p className="text-gray-700">Manage your account settings and security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Information */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
            
            {status === ApiStatus.LOADING && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-700 mt-2">Loading...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
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

            {userInfo && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-gray-900 font-medium">{userInfo.full_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900 font-medium">{userInfo.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    userInfo.role === 'president' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    userInfo.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userInfo.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <p className="text-gray-900">{formatDate(userInfo.created_at)}</p>
                </div>
                
                {userInfo.last_login && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                    <p className="text-gray-900">{formatDate(userInfo.last_login)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Password Change */}
          <div>
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
