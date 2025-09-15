import React, { useState } from 'react';
import { useApiClient } from '../hooks/useApiClient';
import { VolunteerApplicationCreate, TEAM_ROLES } from '../types/volunteerApplication';
import { ApiStatus } from '../types/api';

interface VolunteerSignupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const VolunteerSignupForm: React.FC<VolunteerSignupFormProps> = ({ onSuccess, onCancel }) => {
  const apiClient = useApiClient();
  const [formData, setFormData] = useState<VolunteerApplicationCreate>({
    name: '',
    email: '',
    phone: '',
    team_role: '' as any
  });
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof VolunteerApplicationCreate, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const digitsOnly = formData.phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        newErrors.phone = 'Phone number must have at least 10 digits';
      }
    }

    if (!formData.team_role || (formData.team_role as any) === '') {
      newErrors.team_role = 'Team role is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setStatus(ApiStatus.ERROR);
      return;
    }

    setStatus(ApiStatus.LOADING);

    try {
      await apiClient.publicPost('/api/volunteer-applications/signup', formData);
      setStatus(ApiStatus.SUCCESS);
      
      // Reset form
      setFormData({ name: '', email: '', phone: '', team_role: '' as any });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setStatus(ApiStatus.ERROR);
      
      if (error.response?.status === 409) {
        setErrors({ 
          general: 'An application with this email already exists or you already have an account.' 
        });
      } else if (error.response?.data?.detail) {
        setErrors({ general: error.response.data.detail });
      } else {
        setErrors({ general: 'Failed to submit volunteer application. Please try again.' });
      }
    }
  };

  if (status === ApiStatus.SUCCESS) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 sm:p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Application Submitted!</h3>
          <p className="text-gray-300 mb-4">
            Thank you for your interest in volunteering. Your application has been submitted and will be reviewed by our team.
          </p>
          <p className="text-gray-400 text-sm">
            You will receive an email notification once your application has been reviewed.
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 sm:p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Volunteer Signup</h2>
        <p className="text-gray-300">Join our volunteer team and help make the event amazing!</p>
      </div>

      {errors.general && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-md mb-4">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 bg-white/10 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Enter your full name"
            disabled={status === ApiStatus.LOADING}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 bg-white/10 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Enter your email address"
            disabled={status === ApiStatus.LOADING}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-3 py-2 bg-white/10 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Enter your phone number"
            disabled={status === ApiStatus.LOADING}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
          )}
        </div>

        {/* Team Role (optional) */}
        <div>
          <label htmlFor="team_role" className="block text-sm font-medium text-gray-300 mb-2">
            Team Role *
          </label>
          <select
            id="team_role"
            value={(formData.team_role as string) || ''}
            onChange={(e) => handleInputChange('team_role', e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-600"
            disabled={status === ApiStatus.LOADING}
          >
            <option value="">Select a role</option>
            {TEAM_ROLES.map(role => (
              <option key={role} value={role} className="bg-gray-900 text-white">{role}</option>
            ))}
          </select>
          {errors.team_role && (
            <p className="mt-1 text-sm text-red-400">{errors.team_role}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={status === ApiStatus.LOADING}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === ApiStatus.LOADING ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </div>
            ) : (
              'Submit Application'
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={status === ApiStatus.LOADING}
              className="flex-1 sm:flex-none bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-md">
        <h4 className="text-blue-200 font-medium mb-2">What happens next?</h4>
        <ul className="text-blue-100 text-sm space-y-1">
          <li>• Your application will be reviewed by our team</li>
          <li>• You'll receive an email notification of the decision</li>
          <li>• If approved, you'll get login credentials to access volunteer features</li>
        </ul>
      </div>
    </div>
  );
};

export default VolunteerSignupForm;
