/**
 * TabbedTables component - Combined Volunteers and Attendees tables with tab interface.
 */

import React, { useState } from 'react';
import { AttendeeResponse, PaginationMeta } from '../types';

interface TabbedTablesProps {
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
}) => {
  const [activeTab, setActiveTab] = useState<'volunteers' | 'attendees'>('volunteers');

  const formatDateOnly = (ts?: string) => (ts ? new Date(ts).toLocaleDateString() : '-');
  const formatTimeOnly = (ts?: string) => (ts ? new Date(ts).toLocaleTimeString() : '-');

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
            Volunteers ({volunteerSummary?.length || 0})
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
              {/* Desktop Volunteers Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash (count/amount)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zelle (count/amount)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {volunteerSummary.map((v) => (
                      <tr key={v.volunteer_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onVolunteerClick(v)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.full_name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.email || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.total_attendees}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.cash_count} / ${v.cash_amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.zelle_count} / ${v.zelle_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Volunteers Cards */}
              <div className="lg:hidden">
                <div className="divide-y divide-gray-200">
                  {volunteerSummary.map((v) => (
                    <div key={v.volunteer_id} className="p-4 bg-white cursor-pointer hover:bg-gray-50" onClick={() => onVolunteerClick(v)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{v.full_name || 'Unnamed Volunteer'}</h3>
                          <p className="text-xs text-gray-500 mt-1">{v.email || '-'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{v.total_attendees}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                      
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
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-12 text-center text-gray-500">
              No volunteers found.
            </div>
          )
        ) : (
          // Attendees Tab Content
          <>
            {/* Desktop Attendees Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Name" column="name"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Email" column="email"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Phone" column="phone"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Payment Mode" column="payment_mode"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Status" column="is_checked_in"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Registered" column="registered_at"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Check-in Date" column="checked_in_date"/></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><SortBtn label="Check-in Time" column="checked_in_time"/></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No attendees found.
                      </td>
                    </tr>
                  ) : (
                    sortedAttendees.map((attendee) => (
                      <tr key={attendee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{attendee.name}</div>
                          <div className="text-sm text-gray-500">{attendee.qr_code_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendee.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attendee.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attendee.payment_mode === 'cash'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {attendee.payment_mode.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attendee.is_checked_in
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {attendee.is_checked_in ? 'Checked In' : 'Registered'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={attendee.created_at}>
                          {formatDate(attendee.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={attendee.checked_in_at || ''}>
                          {formatDateOnly(attendee.checked_in_at || undefined)}
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
                          <p className="text-xs text-gray-500 mt-1">{attendee.qr_code_id}</p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attendee.payment_mode === 'cash'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {attendee.payment_mode.toUpperCase()}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attendee.is_checked_in
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {attendee.is_checked_in ? 'Checked In' : 'Registered'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2 text-gray-900">{attendee.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2 text-gray-900">{attendee.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Registered:</span>
                          <span className="ml-2 text-gray-900">{formatDate(attendee.created_at)}</span>
                        </div>
                        {attendee.checked_in_at && (
                          <div>
                            <span className="text-gray-500">Checked In:</span>
                            <span className="ml-2 text-gray-900">
                              {formatDateOnly(attendee.checked_in_at)} at {formatTimeOnly(attendee.checked_in_at)}
                            </span>
                          </div>
                        )}
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
