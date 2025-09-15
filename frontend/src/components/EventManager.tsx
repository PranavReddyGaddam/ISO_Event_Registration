/**
 * EventManager component for managing event details.
 */

import React, { useState, useEffect } from 'react';
import { Event, EventUpdate, ApiStatus } from '../types';
import { useApiClient } from '../hooks/useApiClient';

interface EventManagerProps {
  onEventUpdated?: () => void;
}

const EventManager: React.FC<EventManagerProps> = ({ onEventUpdated }) => {
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    location: ''
  });

  const apiClient = useApiClient();

  useEffect(() => {
    loadCurrentEvent();
  }, []);

  const loadCurrentEvent = async () => {
    setStatus(ApiStatus.LOADING);
    setError(null);

    try {
      const event = await apiClient.get<Event>('/api/events/current');
      setCurrentEvent(event);
      setFormData({
        name: event.name,
        description: event.description,
        event_date: event.event_date,
        location: event.location
      });
      setStatus(ApiStatus.SUCCESS);
    } catch (error: any) {
      console.error('Error loading current event:', error);
      setStatus(ApiStatus.ERROR);
      setError('Failed to load event details. Please try again.');
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    console.log('handleSave called', { currentEvent, formData });
    
    if (!currentEvent) {
      console.log('No current event, returning');
      return;
    }

    setStatus(ApiStatus.LOADING);
    setError(null);

    try {
      const updateData: EventUpdate = {
        name: formData.name,
        description: formData.description,
        event_date: formData.event_date,
        location: formData.location
      };

      console.log('Sending update request:', { eventId: currentEvent.id, updateData });
      const updatedEvent = await apiClient.put<Event>(`/api/events/${currentEvent.id}`, updateData);
      console.log('Update successful:', updatedEvent);
      
      setCurrentEvent(updatedEvent);
      setIsEditing(false);
      setStatus(ApiStatus.SUCCESS);
      
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (error: any) {
      console.error('Error updating event:', error);
      setStatus(ApiStatus.ERROR);
      setError('Failed to update event. Please try again.');
    }
  };

  const handleCancel = () => {
    if (currentEvent) {
      setFormData({
        name: currentEvent.name,
        description: currentEvent.description,
        event_date: currentEvent.event_date,
        location: currentEvent.location
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (status === ApiStatus.LOADING && !currentEvent) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-white/20 rounded"></div>
            <div className="h-4 bg-white/20 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Edit Event
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {currentEvent && (
        <div className="space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event name"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{currentEvent.name}</p>
            )}
          </div>

          {/* Event Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event description"
              />
            ) : (
              <p className="text-gray-700">{currentEvent.description}</p>
            )}
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Date & Time</label>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => handleInputChange('event_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-700">{formatDate(currentEvent.event_date)}</p>
            )}
          </div>

          {/* Event Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event location"
              />
            ) : (
              <p className="text-gray-700">{currentEvent.location}</p>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  console.log('Save button clicked');
                  handleSave();
                }}
                disabled={status === ApiStatus.LOADING}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
              >
                {status === ApiStatus.LOADING ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={status === ApiStatus.LOADING}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Last Updated Info */}
      {currentEvent && currentEvent.updated_at && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs text-gray-500">
            Last updated: {formatDate(currentEvent.updated_at)}
          </p>
        </div>
      )}
    </div>
  );
};

export default EventManager;
