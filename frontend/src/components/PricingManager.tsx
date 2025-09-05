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
    price_per_ticket: 0
  });

  const apiClient = useApiClient();

  useEffect(() => {
    loadPricingTiers();
  }, []);

  const loadPricingTiers = async () => {
    setLoading(true);
    try {
      // Get the first available event ID
      const eventsResponse = await apiClient.get<{id: string, name: string}[]>('/api/attendees/events');
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
      setNewTier({ event_id: newTier.event_id, quantity_from: 1, quantity_to: 1, price_per_ticket: 0 });
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

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 mb-6 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Ticket Pricing Management</h2>
      
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
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateTier(tier.id, {
                          quantity_from: editingTier.quantity_from,
                          quantity_to: editingTier.quantity_to,
                          price_per_ticket: editingTier.price_per_ticket
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
