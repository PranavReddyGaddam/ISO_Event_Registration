/**
 * TabbedTables component - Combined Volunteers and Attendees tables with tab interface.
 */

import React, { useState } from 'react';
import { AttendeeResponse, PaginationMeta } from '../types';

interface TabbedTablesProps {
  // Role-based permissions
  
  // Volunteers data
  volunteerSummary: any[] | null;
  
  // Attendees data
  attendees: AttendeeResponse[];
  attendeesPagination: PaginationMeta | null;
  formatDate: (date: string) => string;
  sortBy: keyof AttendeeResponse | 'registered_at' | 'checked_in_date' | 'checked_in_time';
  sortDir: 'asc' | 'desc';
  onSort: (column: keyof AttendeeResponse | 'registered_at' | 'checked_in_date' | 'checked_in_time') => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  
  // Volunteer drill-down data
  selectedVolunteer: any | null;
  volunteerAttendees: AttendeeResponse[];
  volunteerAttendeesPagination: PaginationMeta | null;
  onVolunteerClick: (volunteer: any) => void;
  onVolunteerAttendeesPageChange: (page: number) => void;
  onBackToVolunteers: () => void;
  
  // Email drill-down data
  selectedEmail: string | null;
  emailAttendees: AttendeeResponse[];
  emailAttendeesPagination: PaginationMeta | null;
  onEmailClick: (email: string) => void;
  onEmailAttendeesPageChange: (page: number) => void;
  onBackToAttendees: () => void;
  
  // Filter props
  filter: {
    checked_in?: boolean;
    food_option?: string;
    offset?: number;
  };
  searchQuery: string;
  onFilterChange: (filterType: "all" | "checked_in" | "not_checked_in" | "with_food" | "without_food") => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  
  // Cleared amount update
  onUpdateClearedAmount: (volunteer: any) => void;
}

const TabbedTables: React.FC<TabbedTablesProps> = ({
  volunteerSummary,
  attendees,
  attendeesPagination,
  formatDate,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onPageSizeChange,
  selectedVolunteer,
  volunteerAttendees,
  volunteerAttendeesPagination,
  onVolunteerClick,
  onVolunteerAttendeesPageChange,
  onBackToVolunteers,
  selectedEmail,
  emailAttendees,
  emailAttendeesPagination,
  onEmailClick,
  onEmailAttendeesPageChange,
  onBackToAttendees,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onRefresh,
  isLoading,
  onUpdateClearedAmount,
}) => {
  const [activeTab, setActiveTab] = useState<'volunteers' | 'attendees'>('volunteers');
  const [volunteerSearchQuery, setVolunteerSearchQuery] = useState('');

  const formatTimeOnly = (ts?: string) => (ts ? new Date(ts).toLocaleTimeString() : '-');
  
  // Show financial data for all roles
  const showFinancialData = true;

  // Filter volunteers based on search query
  const filteredVolunteers = volunteerSummary?.filter(volunteer => {
    if (!volunteerSearchQuery) return true;
    const query = volunteerSearchQuery.toLowerCase();
    return (
      (volunteer.full_name?.toLowerCase().includes(query)) ||
      (volunteer.email?.toLowerCase().includes(query)) ||
      (volunteer.team_role?.toLowerCase().includes(query))
    );
  }) || [];

  // Sort attendees for display
  const sortedAttendees = [...attendees].sort((a, b) => {
    const get = (x: AttendeeResponse, key: any) => {
      if (key === 'registered_at' || key === 'created_at') return new Date(x.created_at).getTime();
      if (key === 'checked_in_date' || key === 'checked_in_time') return x.checked_in_at ? new Date(x.checked_in_at).getTime() : 0;
      return (x as any)[key] ?? '';
    };
    const av = get(a, sortBy);
    const bv = get(b, sortBy);
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const SortBtn: React.FC<{label: string; column: any}> = ({ label, column }) => (
    <button onClick={() => onSort(column)} className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900">
      {label}
      <span className="text-xs">{sortBy === column ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );

  // If a volunteer is selected, show their attendees
  if (selectedVolunteer) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Header with back button */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToVolunteers}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Volunteers
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedVolunteer.full_name || 'Unnamed Volunteer'}
                </h3>
                <p className="text-sm text-gray-600">{selectedVolunteer.email}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Attendees</div>
              <div className="text-2xl font-bold text-gray-900">{selectedVolunteer.total_attendees}</div>
            </div>
          </div>
        </div>

        {/* Volunteer Attendees Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {volunteerAttendees.map((attendee) => (
                <tr key={attendee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attendee.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendee.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendee.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendee.ticket_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendee.payment_mode === 'cash' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {attendee.payment_mode.charAt(0).toUpperCase() + attendee.payment_mode.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendee.food_option === 'with_food' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {attendee.food_option === 'with_food' ? 'With Food' : 'Without Food'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendee.is_checked_in 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {attendee.is_checked_in ? 'Checked In' : 'Not Checked In'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(attendee.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination for volunteer attendees */}
        {volunteerAttendeesPagination && volunteerAttendeesPagination.total_pages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {volunteerAttendeesPagination.offset + 1} to {Math.min(volunteerAttendeesPagination.offset + volunteerAttendeesPagination.limit, volunteerAttendeesPagination.total)} of {volunteerAttendeesPagination.total} attendees
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onVolunteerAttendeesPageChange(volunteerAttendeesPagination.current_page - 1)}
                  disabled={!volunteerAttendeesPagination.has_prev}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {volunteerAttendeesPagination.current_page} of {volunteerAttendeesPagination.total_pages}
                </span>
                <button
                  onClick={() => onVolunteerAttendeesPageChange(volunteerAttendeesPagination.current_page + 1)}
                  disabled={!volunteerAttendeesPagination.has_next}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If an email is selected, show their individual registrations
  if (selectedEmail) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Header with back button */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToAttendees}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Attendees
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Individual Registrations
                </h3>
                <p className="text-sm text-gray-600">{selectedEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Registrations</div>
              <div className="text-2xl font-bold text-gray-900">{emailAttendeesPagination?.total || 0}</div>
            </div>
          </div>
        </div>

        {/* Email Attendees Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {emailAttendees.map((attendee) => (
                <tr key={attendee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attendee.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendee.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendee.ticket_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendee.payment_mode === 'cash' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {attendee.payment_mode.charAt(0).toUpperCase() + attendee.payment_mode.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendee.food_option === 'with_food' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {attendee.food_option === 'with_food' ? 'With Food' : 'Without Food'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendee.is_checked_in 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {attendee.is_checked_in ? 'Checked In' : 'Not Checked In'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(attendee.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination for email attendees */}
        {emailAttendeesPagination && emailAttendeesPagination.total_pages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {emailAttendeesPagination.offset + 1} to {Math.min(emailAttendeesPagination.offset + emailAttendeesPagination.limit, emailAttendeesPagination.total)} of {emailAttendeesPagination.total} registrations
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEmailAttendeesPageChange(emailAttendeesPagination.current_page - 1)}
                  disabled={!emailAttendeesPagination.has_prev}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {emailAttendeesPagination.current_page} of {emailAttendeesPagination.total_pages}
                </span>
                <button
                  onClick={() => onEmailAttendeesPageChange(emailAttendeesPagination.current_page + 1)}
                  disabled={!emailAttendeesPagination.has_next}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 overflow-hidden">
      {/* Tab Headers */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/20">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'volunteers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/10'
            }`}
          >
            Sales Team ({volunteerSummary?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'attendees'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900 hover:bg-white/10'
            }`}
          >
            Attendees ({attendees.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'volunteers' ? (
          // Volunteers Tab Content
          volunteerSummary && volunteerSummary.length > 0 ? (
            <>
              {/* Search Bar */}
              <div className="px-4 sm:px-6 py-4 border-b border-white/20">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search sales team by name, email, or role..."
                    value={volunteerSearchQuery}
                    onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Desktop Volunteers Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Person</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      {showFinancialData && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash (count/amount)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zelle (count/amount)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cleared</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVolunteers.map((v) => (
                      <tr key={v.volunteer_id} className={`hover:bg-gray-50 ${v.user_role === 'president' ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                          <div className="flex items-center">
                            {v.full_name || '-'}
                            {v.user_role === 'president' && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                President
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                          {v.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                          {v.team_role || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                          {v.total_attendees}
                        </td>
                        {showFinancialData && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                              {v.cash_count} / ${v.cash_amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                              {v.zelle_count} / ${v.zelle_amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                              <div className="flex items-center">
                                <span className="text-green-600 font-semibold">
                                  ${(v.cleared_amount || 0).toFixed(2)}
                                </span>
                                {v.user_role === 'volunteer' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateClearedAmount(v);
                                    }}
                                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                                  >
                                    Update
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                              <div className={`font-semibold ${
                                (v.pending_amount || 0) === 0 
                                  ? 'text-green-600' 
                                  : (v.pending_amount || 0) === (v.total_collected || 0)
                                    ? 'text-red-600'
                                    : 'text-yellow-600'
                              }`}>
                                ${(v.pending_amount || 0).toFixed(2)}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Volunteers Cards */}
              <div className="lg:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredVolunteers.map((v) => (
                    <div key={v.volunteer_id} className={`p-4 cursor-pointer hover:bg-gray-50 ${v.user_role === 'president' ? 'bg-blue-50' : 'bg-white'}`} onClick={() => onVolunteerClick(v)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">{v.full_name || 'Unnamed Volunteer'}</h3>
                            {v.user_role === 'president' && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                President
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{v.email || '-'}</p>
                          {v.team_role && (
                            <p className="text-xs text-gray-600 mt-1">Role: {v.team_role}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{v.total_attendees}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                      
                      {showFinancialData && (
                        <>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-green-50 p-3 rounded-lg">
                              <div className="text-green-800 font-medium">Cash</div>
                              <div className="text-green-600">{v.cash_count} registrations</div>
                              <div className="text-green-600">${v.cash_amount.toFixed(2)}</div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="text-blue-800 font-medium">Zelle</div>
                              <div className="text-blue-600">{v.zelle_count} registrations</div>
                              <div className="text-blue-600">${v.zelle_amount.toFixed(2)}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                            <div className="bg-emerald-50 p-3 rounded-lg">
                              <div className="text-emerald-800 font-medium">Cleared</div>
                              <div className="text-emerald-600 font-semibold">${(v.cleared_amount || 0).toFixed(2)}</div>
                              {v.user_role === 'volunteer' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateClearedAmount(v);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                                >
                                  Update
                                </button>
                              )}
                            </div>
                            <div className={`p-3 rounded-lg ${
                              (v.pending_amount || 0) === 0 
                                ? 'bg-green-50' 
                                : (v.pending_amount || 0) === (v.total_collected || 0)
                                  ? 'bg-red-50'
                                  : 'bg-yellow-50'
                            }`}>
                              <div className={`font-medium ${
                                (v.pending_amount || 0) === 0 
                                  ? 'text-green-800' 
                                  : (v.pending_amount || 0) === (v.total_collected || 0)
                                    ? 'text-red-800'
                                    : 'text-yellow-800'
                              }`}>
                                Pending
                              </div>
                              <div className={`font-semibold ${
                                (v.pending_amount || 0) === 0 
                                  ? 'text-green-600' 
                                  : (v.pending_amount || 0) === (v.total_collected || 0)
                                    ? 'text-red-600'
                                    : 'text-yellow-600'
                              }`}>
                                ${(v.pending_amount || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-12 text-center text-gray-500">
              {volunteerSearchQuery ? 'No sales team members match your search criteria.' : 'No sales team members found.'}
            </div>
          )
        ) : (
          // Attendees Tab Content
          <>
            {/* Attendees Filter and Search */}
            <div className="px-4 sm:px-6 py-4 border-b border-white/20">
              <div className="flex flex-col space-y-4">
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onFilterChange('all')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter.checked_in === undefined && filter.food_option === undefined
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => onFilterChange('checked_in')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter.checked_in === true
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Checked In
                  </button>
                  <button
                    onClick={() => onFilterChange('not_checked_in')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter.checked_in === false
                        ? 'bg-yellow-600 text-black shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Not Checked In
                  </button>
                  <button
                    onClick={() => onFilterChange('with_food')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter.food_option === 'with_food'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    With Food
                  </button>
                  <button
                    onClick={() => onFilterChange('without_food')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter.food_option === 'without_food'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Without Food
                  </button>
                </div>

                {/* Search and Refresh */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search attendees..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Attendees Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Name" column="name"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Email" column="email"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Total Tickets" column="total_tickets_per_person"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Total Registrations" column="total_registrations"/></th>
                    {showFinancialData && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Summary</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food Summary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Last Registered" column="registered_at"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Check-in Time" column="checked_in_time"/></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                        No attendees found.
                      </td>
                    </tr>
                  ) : (
                    sortedAttendees.map((attendee) => (
                      <tr key={attendee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{attendee.name}</div>
                          <div className="text-sm text-gray-500">{attendee.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => onEmailClick(attendee.email)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {attendee.email}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {attendee.volunteer_name ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{attendee.volunteer_name}</div>
                              <div className="text-xs text-gray-500">{attendee.volunteer_team_role || 'Volunteer'}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {attendee.total_tickets_per_person || attendee.ticket_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {attendee.total_registrations || 1}
                        </td>
                        {showFinancialData && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="space-y-1">
                              {attendee.cash_registrations && attendee.cash_registrations > 0 && (
                                <div className="text-green-600">
                                  Cash: {attendee.cash_registrations} (${attendee.total_cash_amount?.toFixed(2) || '0.00'})
                                </div>
                              )}
                              {attendee.zelle_registrations && attendee.zelle_registrations > 0 && (
                                <div className="text-blue-600">
                                  Zelle: {attendee.zelle_registrations} (${attendee.total_zelle_amount?.toFixed(2) || '0.00'})
                                </div>
                              )}
                              {!attendee.cash_registrations && !attendee.zelle_registrations && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  attendee.payment_mode === 'cash'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {attendee.payment_mode.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {attendee.with_food_registrations && attendee.with_food_registrations > 0 && (
                              <div className="text-orange-600">With Food: {attendee.with_food_registrations}</div>
                            )}
                            {attendee.without_food_registrations && attendee.without_food_registrations > 0 && (
                              <div className="text-purple-600">Without Food: {attendee.without_food_registrations}</div>
                            )}
                            {!attendee.with_food_registrations && !attendee.without_food_registrations && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                attendee.food_option === 'with_food'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {attendee.food_option === 'with_food' ? 'With Food' : 'Without Food'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {attendee.checked_in_registrations && attendee.checked_in_registrations > 0 && (
                              <div className="text-green-600">Checked In: {attendee.checked_in_registrations}</div>
                            )}
                            {attendee.total_registrations && attendee.checked_in_registrations && (
                              <div className="text-gray-600">
                                Not Checked In: {(attendee.total_registrations - attendee.checked_in_registrations)}
                              </div>
                            )}
                            {!attendee.checked_in_registrations && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                attendee.is_checked_in
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {attendee.is_checked_in ? 'Checked In' : 'Registered'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={attendee.created_at}>
                          {formatDate(attendee.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={attendee.checked_in_at || ''}>
                          {formatTimeOnly(attendee.checked_in_at || undefined)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Attendees Cards */}
            <div className="lg:hidden">
              {sortedAttendees.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500">
                  No attendees found.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sortedAttendees.map((attendee) => (
                    <div key={attendee.id} className="p-4 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{attendee.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{attendee.phone}</p>
                        </div>
                        <div className="flex flex-col space-y-1 text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {attendee.total_tickets_per_person || attendee.ticket_quantity} tickets
                          </div>
                          <div className="text-xs text-gray-500">
                            {attendee.total_registrations || 1} registrations
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <button
                            onClick={() => onEmailClick(attendee.email)}
                            className="ml-2 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {attendee.email}
                          </button>
                        </div>
                        <div>
                          <span className="text-gray-500">Sold By:</span>
                          <span className="ml-2 text-gray-900">
                            {attendee.volunteer_name ? (
                              <div>
                                <div className="font-medium">{attendee.volunteer_name}</div>
                                <div className="text-xs text-gray-500">{attendee.volunteer_team_role || 'Volunteer'}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unknown</span>
                            )}
                          </span>
                        </div>
                        {showFinancialData && (
                          <div>
                            <span className="text-gray-500">Payment Summary:</span>
                            <div className="ml-2 text-gray-900">
                              {attendee.cash_registrations && attendee.cash_registrations > 0 && (
                                <div className="text-green-600">
                                  Cash: {attendee.cash_registrations} (${attendee.total_cash_amount?.toFixed(2) || '0.00'})
                                </div>
                              )}
                              {attendee.zelle_registrations && attendee.zelle_registrations > 0 && (
                                <div className="text-blue-600">
                                  Zelle: {attendee.zelle_registrations} (${attendee.total_zelle_amount?.toFixed(2) || '0.00'})
                                </div>
                              )}
                              {!attendee.cash_registrations && !attendee.zelle_registrations && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  attendee.payment_mode === 'cash'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {attendee.payment_mode.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Food Summary:</span>
                          <div className="ml-2 text-gray-900">
                            {attendee.with_food_registrations && attendee.with_food_registrations > 0 && (
                              <div className="text-orange-600">With Food: {attendee.with_food_registrations}</div>
                            )}
                            {attendee.without_food_registrations && attendee.without_food_registrations > 0 && (
                              <div className="text-purple-600">Without Food: {attendee.without_food_registrations}</div>
                            )}
                            {!attendee.with_food_registrations && !attendee.without_food_registrations && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                attendee.food_option === 'with_food'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {attendee.food_option === 'with_food' ? 'With Food' : 'Without Food'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Check-in Status:</span>
                          <div className="ml-2 text-gray-900">
                            {attendee.checked_in_registrations && attendee.checked_in_registrations > 0 && (
                              <div className="text-green-600">Checked In: {attendee.checked_in_registrations}</div>
                            )}
                            {attendee.total_registrations && attendee.checked_in_registrations && (
                              <div className="text-gray-600">
                                Not Checked In: {(attendee.total_registrations - attendee.checked_in_registrations)}
                              </div>
                            )}
                            {!attendee.checked_in_registrations && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                attendee.is_checked_in
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {attendee.is_checked_in ? 'Checked In' : 'Registered'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Registered:</span>
                          <span className="ml-2 text-gray-900">{formatDate(attendee.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination for Attendees */}
            {attendeesPagination && (
              <div className="px-4 sm:px-6 py-4 border-t border-white/20">
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                  {/* Page info */}
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{attendeesPagination.offset + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(attendeesPagination.offset + attendeesPagination.limit, attendeesPagination.total)}</span> of{' '}
                    <span className="font-medium">{attendeesPagination.total}</span> results
                  </div>

                  {/* Page size selector */}
                  <div className="flex items-center space-x-2">
                    <label htmlFor="page-size" className="text-sm text-gray-700">
                      Show:
                    </label>
                    <select
                      id="page-size"
                      value={attendeesPagination.limit}
                      onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {[10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-700">per page</span>
                  </div>

                  {/* Pagination controls */}
                  <div className="flex items-center space-x-1">
                    {/* Previous button */}
                    <button
                      onClick={() => onPageChange(attendeesPagination.current_page - 1)}
                      disabled={!attendeesPagination.has_prev}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      Previous
                    </button>

                    {/* Page numbers */}
                    {(() => {
                      const pages: (number | string)[] = [];
                      const maxVisiblePages = 5;
                      const { current_page, total_pages } = attendeesPagination;
                      
                      if (total_pages <= maxVisiblePages) {
                        for (let i = 1; i <= total_pages; i++) {
                          pages.push(i);
                        }
                      } else {
                        if (current_page <= 3) {
                          for (let i = 1; i <= 4; i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(total_pages);
                        } else if (current_page >= total_pages - 2) {
                          pages.push(1);
                          pages.push('...');
                          for (let i = total_pages - 3; i <= total_pages; i++) {
                            pages.push(i);
                          }
                        } else {
                          pages.push(1);
                          pages.push('...');
                          for (let i = current_page - 1; i <= current_page + 1; i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(total_pages);
                        }
                      }
                      
                      return pages.map((page, index) => (
                        <React.Fragment key={index}>
                          {page === '...' ? (
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                          ) : (
                            <button
                              onClick={() => onPageChange(page as number)}
                              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                                page === current_page
                                  ? 'text-blue-600 bg-blue-50 border-blue-300'
                                  : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          )}
                        </React.Fragment>
                      ));
                    })()}

                    {/* Next button */}
                    <button
                      onClick={() => onPageChange(attendeesPagination.current_page + 1)}
                      disabled={!attendeesPagination.has_next}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TabbedTables;
