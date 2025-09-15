import React, { useState, useEffect } from 'react';
import { TicketPricingResponse, TicketPricingCreate, TicketPricingUpdate } from '../types';
import { useApiClient } from '../hooks/useApiClient';

const PricingManager: React.FC = () => {
  const [pricingTiers, setPricingTiers] = useState<TicketPricingResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTier, setEditingTier] = useState<TicketPricingResponse | null>(null);
  const [newTier, setNewTier] = useState<TicketPricingCreate>({
    event_id: '', // Will be set dynamically
    quantity_from: 1,
    quantity_to: 1,
    price_per_ticket: 0,
    is_active: true,
    food_option: 'without_food'
  });

  const apiClient = useApiClient();

  useEffect(() => {
    loadPricingTiers();
  }, []);

  const loadPricingTiers = async () => {
    setLoading(true);
    try {
      // Get the first available event ID
      const eventsResponse = await apiClient.get<{id: string, name: string}[]>('/api/events');
      if (eventsResponse && eventsResponse.length > 0) {
        const eventId = eventsResponse[0].id;
        setNewTier(prev => ({ ...prev, event_id: eventId }));
        const response = await apiClient.get<TicketPricingResponse[]>(`/api/pricing/admin/tiers?event_id=${eventId}`);
        setPricingTiers(response);
      }
    } catch (error) {
      console.error('Failed to load pricing tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTier = async () => {
    if (!newTier.event_id) {
      console.error('No event ID available');
      return;
    }
    try {
      await apiClient.post<TicketPricingResponse>('/api/pricing/admin/tiers', newTier);
      setNewTier({ event_id: newTier.event_id, quantity_from: 1, quantity_to: 1, price_per_ticket: 0, is_active: true, food_option: 'without_food' });
      loadPricingTiers();
    } catch (error) {
      console.error('Failed to create pricing tier:', error);
    }
  };

  const handleUpdateTier = async (tierId: string, updates: TicketPricingUpdate) => {
    try {
      await apiClient.put<TicketPricingResponse>(`/api/pricing/admin/tiers/${tierId}`, updates);
      setEditingTier(null);
      loadPricingTiers();
    } catch (error) {
      console.error('Failed to update pricing tier:', error);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (window.confirm('Are you sure you want to delete this pricing tier?')) {
      try {
        await apiClient.delete(`/api/pricing/admin/tiers/${tierId}`);
        loadPricingTiers();
      } catch (error) {
        console.error('Failed to delete pricing tier:', error);
      }
    }
  };

  const handleCreateDefaultTiers = async () => {
    if (!newTier.event_id) {
      alert('No event found. Please try again.');
      return;
    }

    if (window.confirm('This will create default pricing tiers: $15 without food, $18 with food. Continue?')) {
      setLoading(true);
      try {
        await apiClient.post(`/api/pricing/admin/create-default-tiers?event_id=${newTier.event_id}`);
        alert('Default pricing tiers created successfully!');
        loadPricingTiers();
      } catch (error: any) {
        console.error('Failed to create default pricing tiers:', error);
        alert(error.response?.data?.detail || 'Failed to create default pricing tiers');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 mb-6 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Ticket Pricing Management</h2>
      
      {/* Create Default Tiers */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Setup</h3>
        <p className="text-sm text-gray-600 mb-4">Create default pricing tiers: $15 without food, $18 with food</p>
        <button
          onClick={handleCreateDefaultTiers}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Default Tiers'}
        </button>
      </div>

      {/* Create New Tier */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Create New Pricing Tier</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Quantity</label>
            <input
              type="number"
              min="1"
              value={newTier.quantity_from}
              onChange={(e) => setNewTier(prev => ({ ...prev, quantity_from: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Quantity</label>
            <input
              type="number"
              min="1"
              value={newTier.quantity_to}
              onChange={(e) => setNewTier(prev => ({ ...prev, quantity_to: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Ticket</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newTier.price_per_ticket}
              onChange={(e) => setNewTier(prev => ({ ...prev, price_per_ticket: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Food Option</label>
            <select
              value={newTier.food_option}
              onChange={(e) => setNewTier(prev => ({ ...prev, food_option: e.target.value as 'with_food' | 'without_food' }))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="without_food">Without Food</option>
              <option value="with_food">With Food</option>
            </select>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              onClick={handleCreateTier}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
            >
              Create Tier
            </button>
          </div>
        </div>
      </div>

      {/* Existing Tiers */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Pricing Tiers</h3>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {pricingTiers.map((tier) => (
              <div key={tier.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                {editingTier?.id === tier.id ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <input
                        type="number"
                        min="1"
                        value={editingTier.quantity_from}
                        onChange={(e) => setEditingTier(prev => prev ? { ...prev, quantity_from: parseInt(e.target.value) } : null)}
                        className="w-full sm:w-20 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="From"
                      />
                      <span className="text-gray-600 text-sm">to</span>
                      <input
                        type="number"
                        min="1"
                        value={editingTier.quantity_to}
                        onChange={(e) => setEditingTier(prev => prev ? { ...prev, quantity_to: parseInt(e.target.value) } : null)}
                        className="w-full sm:w-20 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="To"
                      />
                      <span className="text-gray-600 text-sm">tickets:</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingTier.price_per_ticket}
                        onChange={(e) => setEditingTier(prev => prev ? { ...prev, price_per_ticket: parseFloat(e.target.value) } : null)}
                        className="w-full sm:w-24 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Price"
                      />
                      <span className="text-gray-600 text-sm">each</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <select
                        value={editingTier.food_option}
                        onChange={(e) => setEditingTier(prev => prev ? { ...prev, food_option: e.target.value as 'with_food' | 'without_food' } : null)}
                        className="w-full sm:w-32 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="without_food">Without Food</option>
                        <option value="with_food">With Food</option>
                      </select>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingTier.is_active}
                          onChange={(e) => setEditingTier(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-600 text-sm">Active</span>
                      </label>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateTier(tier.id, {
                          quantity_from: editingTier.quantity_from,
                          quantity_to: editingTier.quantity_to,
                          price_per_ticket: editingTier.price_per_ticket,
                          is_active: editingTier.is_active,
                          food_option: editingTier.food_option
                        })}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors shadow-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTier(null)}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors shadow-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                      <span className="text-gray-900 font-medium">
                        {tier.quantity_from === tier.quantity_to 
                          ? `${tier.quantity_from} ticket`
                          : `${tier.quantity_from}-${tier.quantity_to} tickets`
                        }
                      </span>
                      <span className="text-gray-500 hidden sm:inline">→</span>
                      <span className="text-gray-900 font-medium">${tier.price_per_ticket.toFixed(2)} each</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tier.food_option === 'with_food' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {tier.food_option === 'with_food' ? 'With Food' : 'Without Food'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tier.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingTier(tier)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTier(tier.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingManager;
