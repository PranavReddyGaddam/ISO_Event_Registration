/**
 * Registration page - React component.
 */

import React, { useState } from 'react';
import { AttendeeCreate, AttendeeResponse, FormErrors, ApiStatus, TicketCalculationResponse } from '../types';
import { attendeeRegistrationValidator, formatPhoneNumber } from '../utils/validation';
import { useApiClient } from '../hooks/useApiClient';
import { useAuth } from '../contexts/AuthContext';
import EmailInput from '../components/EmailInput';
import VolunteerLeaderboard from '../components/VolunteerLeaderboard';
import VolunteerRankDisplay from '../components/VolunteerRankDisplay';

const Registration: React.FC = () => {
  const [formData, setFormData] = useState<AttendeeCreate>({
    name: '',
    email: '',
    phone: '',
    ticket_quantity: 1,
    payment_mode: 'cash',
    food_option: 'with_food'
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [successData, setSuccessData] = useState<AttendeeResponse | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<TicketCalculationResponse | null>(null);
  const [, setLoadingPricing] = useState(false);
  const [leaderboardRefresh, setLeaderboardRefresh] = useState(0);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);

  const apiClient = useApiClient();
  const { isPresident, isAuthenticated } = useAuth();


  const calculatePrice = async (quantity: number, foodOption: 'with_food' | 'without_food') => {
    if (quantity < 1 || quantity > 20) return;
    
    setLoadingPricing(true);
    try {
      // Get the first available event ID from the backend
      const eventsResponse = await apiClient.get<{id: string, name: string}[]>('/api/events');
      if (eventsResponse && eventsResponse.length > 0) {
        const eventId = eventsResponse[0].id;
        const response = await apiClient.post<TicketCalculationResponse>(`/api/pricing/calculate?event_id=${eventId}`, { 
          quantity, 
          food_option: foodOption 
        });
        setSelectedPricing(response);
      }
    } catch (error) {
      console.error('Failed to calculate price:', error);
      setSelectedPricing(null);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleInputChange = (field: keyof AttendeeCreate, value: string | number) => {
    let processedValue: string | number = value;
    
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value as string);
    } else if (field === 'ticket_quantity') {
      processedValue = Number(value);
      // Calculate price when quantity changes
      calculatePrice(processedValue as number, formData.food_option);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(ApiStatus.LOADING);
    setErrors({});

    // Validate form
    const formDataRecord: Record<string, string> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      ticket_quantity: formData.ticket_quantity.toString(),
    };
    const validationErrors = attendeeRegistrationValidator.validate(formDataRecord);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus(ApiStatus.ERROR);
      return;
    }

    try {
      const response = await apiClient.post<AttendeeResponse>('/api/register', formData);
      setSuccessData(response);
      setStatus(ApiStatus.SUCCESS);
      
      // Refresh leaderboard
      setLeaderboardRefresh(prev => prev + 1);
      
      // Reset form
      setFormData({ name: '', email: '', phone: '', ticket_quantity: 1, payment_mode: 'cash', food_option: 'with_food' });
      setSelectedPricing(null);
    } catch (error: any) {
      console.error('Registration error:', error);
      setStatus(ApiStatus.ERROR);
      
      if (error.response?.status === 409) {
        // Handle duplicate registration
        const errorData = error.response.data.detail;
        if (typeof errorData === 'object' && errorData.details) {
          setErrors({ 
            general: errorData.details,
            existingAttendee: errorData.existing_attendee 
          });
        } else {
          setErrors({ general: 'You are already registered for this event.' });
        }
      } else if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        setErrors({ general: typeof detail === 'string' ? detail : 'Registration failed. Please try again.' });
      } else {
        setErrors({ general: error.message || 'Registration failed. Please try again.' });
      }
    }
  };

  if (status === ApiStatus.SUCCESS && successData) {
    return <SuccessMessage attendee={successData} onReset={() => {
      setStatus(ApiStatus.IDLE);
      setSuccessData(null);
    }} />;
  }

  return (
    <div className="min-h-screen py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm mx-auto sm:max-w-md">
        {/* Compact Rank Display - Always visible for authenticated users */}
        {isAuthenticated() && (
          <VolunteerRankDisplay 
            refreshTrigger={leaderboardRefresh}
            onToggleLeaderboard={setShowFullLeaderboard}
            showFullLeaderboard={showFullLeaderboard}
          />
        )}
        
        {/* Full Leaderboard - Only shown when toggled on */}
        {isAuthenticated() && showFullLeaderboard && (
          <VolunteerLeaderboard refreshTrigger={leaderboardRefresh} />
        )}
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 sm:p-6 text-black">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Event Registration</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-700">Register for the volunteer event and get your QR code</p>
            {!isAuthenticated() && (
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Not authenticated - Please log in first
              </div>
            )}
            {isAuthenticated() && isPresident() && (
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                President Mode - Full Access
              </div>
            )}
            {isAuthenticated() && !isPresident() && (
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Volunteer Mode - Standard Access
              </div>
            )}
          </div>

          {errors.general && (
            <div className="mb-4 p-4 bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-300 text-sm font-medium">{errors.general}</p>
                  {(errors as any).existingAttendee && (
                    <div className="mt-3 text-xs text-red-200 bg-red-500/5 rounded-md p-3 border border-red-400/20">
                      <p className="font-semibold mb-2">Existing Registration Details:</p>
                      <div className="space-y-1">
                        <p><span className="font-medium">Name:</span> {(errors as any).existingAttendee.name}</p>
                        <p><span className="font-medium">Email:</span> {(errors as any).existingAttendee.email}</p>
                        <p><span className="font-medium">Phone:</span> {(errors as any).existingAttendee.phone}</p>
                        <p><span className="font-medium">Registered:</span> {new Date((errors as any).existingAttendee.registered_at).toLocaleDateString()}</p>
                      </div>
                      <p className="mt-2 text-red-300 font-medium">If this is you, please use your existing registration details.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 sm:py-3 bg-white/10 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-gray-900 placeholder-gray-500 text-sm sm:text-base ${
                  errors.name ? 'border-red-400/50' : 'border-white/30'
                }`}
                placeholder="Enter your full name"
                disabled={status === ApiStatus.LOADING}
              />
              {errors.name && <p className="mt-1 text-sm text-red-300">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                Email Address *
              </label>
              <EmailInput
                id="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                placeholder="Enter your email address"
                disabled={status === ApiStatus.LOADING}
                required
                showSuggestion={true}
              />
              {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 sm:py-3 bg-white/10 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-gray-900 placeholder-gray-500 text-sm sm:text-base ${
                  errors.phone ? 'border-red-400/50' : 'border-white/30'
                }`}
                placeholder="Enter your phone number"
                disabled={status === ApiStatus.LOADING}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-300">{errors.phone}</p>}
              <p className="mt-1 text-xs text-gray-600">We'll use this to contact you about the event</p>
            </div>

            <div>
              <label htmlFor="ticket_quantity" className="block text-sm font-medium text-gray-900 mb-1">
                Number of Tickets *
              </label>
              <select
                id="ticket_quantity"
                value={formData.ticket_quantity}
                onChange={(e) => handleInputChange('ticket_quantity', e.target.value)}
                className="w-full px-3 py-2 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-gray-900 text-sm sm:text-base"
                disabled={status === ApiStatus.LOADING}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num} className="bg-white text-gray-900">
                    {num} {num === 1 ? 'ticket' : 'tickets'}
                  </option>
                ))}
              </select>
              {errors.ticket_quantity && <p className="mt-1 text-sm text-red-300">{errors.ticket_quantity}</p>}
            </div>

            <div>
              <label htmlFor="payment_mode" className="block text-sm font-medium text-gray-900 mb-1">
                Payment Mode *
              </label>
              <select
                id="payment_mode"
                value={formData.payment_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value as 'cash' | 'zelle' }))}
                className="w-full px-3 py-2 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-gray-900 text-sm sm:text-base"
                disabled={status === ApiStatus.LOADING}
              >
                <option value="cash" className="bg-white text-gray-900">Cash</option>
                <option value="zelle" className="bg-white text-gray-900" disabled>Zelle (Coming Soon)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Food Option *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="food_option"
                    value="with_food"
                    checked={formData.food_option === 'with_food'}
                    onChange={(e) => {
                      const newFoodOption = e.target.value as 'with_food' | 'without_food';
                      setFormData(prev => ({ ...prev, food_option: newFoodOption }));
                      calculatePrice(formData.ticket_quantity, newFoodOption);
                    }}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={status === ApiStatus.LOADING}
                  />
                  <span className="text-sm text-gray-900">With Food</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="food_option"
                    value="without_food"
                    checked={formData.food_option === 'without_food'}
                    onChange={(e) => {
                      const newFoodOption = e.target.value as 'with_food' | 'without_food';
                      setFormData(prev => ({ ...prev, food_option: newFoodOption }));
                      calculatePrice(formData.ticket_quantity, newFoodOption);
                    }}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={status === ApiStatus.LOADING}
                  />
                  <span className="text-sm text-gray-900">Without Food</span>
                </label>
              </div>
            </div>

            {/* Total Price Preview */}
            {selectedPricing && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Total Price</h3>
                    <p className="text-xs text-gray-700">{selectedPricing.quantity} {selectedPricing.quantity === 1 ? 'ticket' : 'tickets'}</p>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">${selectedPricing.total_price.toFixed(2)}</div>
                </div>
                <p className="mt-1 text-xs text-gray-600">Rate: ${selectedPricing.price_per_ticket.toFixed(2)} each</p>
              </div>
            )}

            {/* Selected Quantity Pricing (kept as total) */}

            <button
              type="submit"
              disabled={status === ApiStatus.LOADING || !isAuthenticated()}
              className="w-full bg-blue-500/20 backdrop-blur-sm text-gray-900 py-3 px-4 sm:py-4 rounded-lg hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base font-medium"
            >
              {!isAuthenticated() ? (
                'Please Log In First'
              ) : status === ApiStatus.LOADING ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                'Register for Event'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

interface SuccessMessageProps {
  attendee: AttendeeResponse;
  onReset: () => void;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ attendee, onReset }) => (
  <div className="min-h-screen py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
    <div className="w-full max-w-sm mx-auto sm:max-w-md">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 sm:p-6 text-center">
        <div className="mb-6">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-500/20 backdrop-blur-sm border border-green-400/30 mb-4">
            <svg className="h-6 w-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
          <p className="text-sm sm:text-base text-gray-700">Thank you for registering, {attendee.name}!</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Registration Details</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Name:</span>
              <span className="text-sm font-medium text-gray-900">{attendee.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Email:</span>
              <span className="text-sm font-medium text-gray-900">{attendee.email}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Tickets:</span>
              <span className="text-sm font-medium text-gray-900">
                {attendee.ticket_quantity} {attendee.ticket_quantity === 1 ? 'ticket' : 'tickets'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Food Option:</span>
              <span className="text-sm font-medium text-gray-900">
                {attendee.food_option === 'with_food' ? 'With Food' : 'Without Food'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Payment:</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{attendee.payment_mode}</span>
            </div>
            
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="text-sm font-medium text-gray-700">Total Paid:</span>
              <span className="text-sm font-bold text-gray-900">${attendee.total_price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50/50 backdrop-blur-sm rounded-lg border border-green-200/30 p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800 mb-1">QR Code Sent to Email</h3>
              <p className="text-sm text-green-700">
                Your QR code has been sent to <span className="font-medium">{attendee.email}</span>. 
                Please check your email and save the QR code for quick check-in at the event.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
            <button
            onClick={onReset}
            className="w-full bg-blue-500/20 backdrop-blur-sm text-gray-900 py-3 px-4 sm:py-4 rounded-lg hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border border-blue-400/30 transition-all duration-200 text-sm sm:text-base font-medium"
            >
              Register Another Person
            </button>
          <a
            href="/checkin"
            className="block w-full bg-white/10 backdrop-blur-sm text-gray-900 py-3 px-4 sm:py-4 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/20 transition-all duration-200 text-center text-sm sm:text-base font-medium"
            >
              Go to Check-in
          </a>
        </div>
      </div>
    </div>
  </div>
);

export default Registration;