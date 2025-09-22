/**
 * Uploads page - View transaction screenshots for Zelle payments.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiClient } from '../hooks/useApiClient';

interface TransactionScreenshot {
  attendee_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string;
  ticket_quantity: number;
  total_price: number;
  payment_mode: string;
  transaction_screenshot_url: string;
  created_at: string;
  created_by?: string;
  volunteer_name?: string;
  volunteer_email?: string;
  volunteer_role?: string;
}

const Uploads: React.FC = () => {
  const [screenshots, setScreenshots] = useState<TransactionScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<TransactionScreenshot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'volunteer'>('all');

  const apiClient = useApiClient();
  const { isPresident, isFinanceDirector } = useAuth();

  useEffect(() => {
    if (isPresident() || isFinanceDirector()) {
      fetchScreenshots();
    }
  }, [isPresident, isFinanceDirector]);

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<TransactionScreenshot[]>('/api/transaction-screenshots');
      setScreenshots(response || []);
    } catch (error) {
      console.error('Failed to fetch screenshots:', error);
      setError('Failed to load transaction screenshots');
    } finally {
      setLoading(false);
    }
  };

  const filteredScreenshots = screenshots.filter(screenshot => {
    const matchesSearch = 
      screenshot.attendee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screenshot.attendee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screenshot.volunteer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screenshot.volunteer_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = (() => {
      switch (filterBy) {
        case 'recent':
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return new Date(screenshot.created_at) > oneWeekAgo;
        case 'volunteer':
          return screenshot.volunteer_name;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!isPresident() && !isFinanceDirector()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only Presidents and Finance Directors can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Screenshots</h1>
            <p className="text-gray-600">Review Zelle payment transaction screenshots uploaded by volunteers</p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by attendee name, email, or volunteer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter
                </label>
                <select
                  id="filter"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as 'all' | 'recent' | 'volunteer')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Screenshots</option>
                  <option value="recent">Last 7 Days</option>
                  <option value="volunteer">With Volunteer Info</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading transaction screenshots...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Screenshots Grid */}
          {!loading && !error && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Showing {filteredScreenshots.length} of {screenshots.length} transaction screenshots
                </p>
              </div>

              {filteredScreenshots.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Screenshots Found</h3>
                  <p className="text-gray-600">
                    {searchTerm || filterBy !== 'all' 
                      ? 'No transaction screenshots match your current filters.'
                      : 'No Zelle transaction screenshots have been uploaded yet.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredScreenshots.map((screenshot) => (
                    <div
                      key={screenshot.attendee_id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedScreenshot(screenshot)}
                    >
                      {/* Screenshot Preview */}
                      <div className="aspect-video bg-gray-100 relative">
                        <img
                          src={screenshot.transaction_screenshot_url}
                          alt={`Transaction screenshot for ${screenshot.attendee_name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="absolute inset-0 hidden items-center justify-center bg-gray-100">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>

                      {/* Screenshot Details */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 truncate">{screenshot.attendee_name}</h3>
                          <span className="text-sm font-medium text-green-600">{formatCurrency(screenshot.total_price)}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{screenshot.attendee_email}</p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{screenshot.ticket_quantity} ticket{screenshot.ticket_quantity !== 1 ? 's' : ''}</span>
                          <span>{formatDate(screenshot.created_at)}</span>
                        </div>

                        {screenshot.volunteer_name && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              Processed by: <span className="font-medium">{screenshot.volunteer_name}</span>
                              {screenshot.volunteer_role && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                                  {screenshot.volunteer_role.replace('_', ' ')}
                                </span>
                              )}
                            </p>
                            {screenshot.volunteer_email && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{screenshot.volunteer_email}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Screenshot Modal */}
          {selectedScreenshot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Transaction Screenshot - {selectedScreenshot.attendee_name}
                  </h2>
                  <button
                    onClick={() => setSelectedScreenshot(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Screenshot */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Screenshot</h3>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selectedScreenshot.transaction_screenshot_url}
                          alt={`Transaction screenshot for ${selectedScreenshot.attendee_name}`}
                          className="w-full h-auto"
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Transaction Details</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Attendee</label>
                          <p className="text-sm text-gray-900">{selectedScreenshot.attendee_name}</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                          <p className="text-sm text-gray-900">{selectedScreenshot.attendee_email}</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                          <p className="text-sm text-gray-900">{selectedScreenshot.attendee_phone}</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tickets</label>
                          <p className="text-sm text-gray-900">{selectedScreenshot.ticket_quantity} ticket{selectedScreenshot.ticket_quantity !== 1 ? 's' : ''}</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amount</label>
                          <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedScreenshot.total_price)}</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment Method</label>
                          <p className="text-sm text-gray-900 capitalize">{selectedScreenshot.payment_mode}</p>
                        </div>

                        {(selectedScreenshot.volunteer_name || selectedScreenshot.created_by) && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sold By</label>
                            <div className="text-sm text-gray-900">
                              {selectedScreenshot.volunteer_name || 'Unknown'}
                            </div>
                            {selectedScreenshot.volunteer_email && (
                              <p className="text-xs text-gray-500">{selectedScreenshot.volunteer_email}</p>
                            )}
                            {selectedScreenshot.volunteer_role && (
                              <div className="mt-0.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                                {selectedScreenshot.volunteer_role.replace('_', ' ')}
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transaction Date</label>
                          <p className="text-sm text-gray-900">{formatDate(selectedScreenshot.created_at)}</p>
                        </div>

                        {selectedScreenshot.volunteer_name && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Processed By</label>
                            <div className="text-sm text-gray-900">{selectedScreenshot.volunteer_name}</div>
                            {selectedScreenshot.volunteer_role && (
                              <div className="mt-0.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                                {selectedScreenshot.volunteer_role.replace('_', ' ')}
                              </div>
                            )}
                            {selectedScreenshot.volunteer_email && (
                              <p className="text-xs text-gray-500 mt-1">{selectedScreenshot.volunteer_email}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Uploads;
