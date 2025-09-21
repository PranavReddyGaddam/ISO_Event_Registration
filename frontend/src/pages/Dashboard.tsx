/**
 * Dashboard page - React component for event management.
 */

import React, { useState, useEffect } from "react";
import {
  AttendeeResponse,
  EventStats,
  AttendeeFilter,
  AttendeeFilterParams,
  ApiStatus,
  PaginationMeta,
  PaginatedResponse,
} from "../types";
import { useApiClient } from "../hooks/useApiClient";
import { useAuth } from "../contexts/AuthContext";
import PricingManager from "../components/PricingManager";
import VolunteerApplicationsManager from "../components/VolunteerApplicationsManager";
import EventManager from "../components/EventManager";
import TabbedTables from "../components/TabbedTables";
import UpdateClearedAmountModal from "../components/UpdateClearedAmountModal";

const Dashboard: React.FC = () => {
  const { isPresident, isFinanceDirector } = useAuth();
  const [stats, setStats] = useState<EventStats | null>(null);
  const [attendees, setAttendees] = useState<AttendeeResponse[]>([]);
  const [filter, setFilter] = useState<AttendeeFilter>({
    checked_in: undefined,
    search: "",
    food_option: undefined,
    limit: 50,
    offset: 0,
  });
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [sortBy, setSortBy] = useState<
    | keyof AttendeeResponse
    | "registered_at"
    | "checked_in_date"
    | "checked_in_time"
  >("created_at" as any);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [error, setError] = useState<string | null>(null);
  const [showPricingManager, setShowPricingManager] = useState(false);
  const [showVolunteerApplications, setShowVolunteerApplications] =
    useState(false);
  const [showEventManager, setShowEventManager] = useState(false);
  const [hideKpiValues, setHideKpiValues] = useState(false);
  const [volunteerSummary, setVolunteerSummary] = useState<any[] | null>(null);
  const [attendeesPagination, setAttendeesPagination] =
    useState<PaginationMeta | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any | null>(null);
  const [volunteerDetails, setVolunteerDetails] = useState<any | null>(null);
  const [volunteerAttendees, setVolunteerAttendees] = useState<
    AttendeeResponse[]
  >([]);
  const [volunteerAttendeesPagination, setVolunteerAttendeesPagination] =
    useState<PaginationMeta | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [emailAttendees, setEmailAttendees] = useState<AttendeeResponse[]>([]);
  const [emailAttendeesPagination, setEmailAttendeesPagination] =
    useState<PaginationMeta | null>(null);

  // Cleared amount modal state
  const [showClearedAmountModal, setShowClearedAmountModal] = useState(false);
  const [selectedVolunteerForClearing, setSelectedVolunteerForClearing] =
    useState<any | null>(null);
  const [isUpdatingClearedAmount, setIsUpdatingClearedAmount] = useState(false);

  const apiClient = useApiClient();

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadData = async () => {
    setStatus(ApiStatus.LOADING);
    setError(null);

    try {
      // Clean filter parameters to avoid sending undefined as string
      const cleanFilter: AttendeeFilterParams = {
        search: filter.search || "",
        limit: filter.limit || 50,
        offset: filter.offset || 0,
        ...(filter.checked_in !== undefined && {
          checked_in: filter.checked_in,
        }),
        ...(filter.food_option !== undefined && {
          food_option: filter.food_option,
        }),
      };

      const [statsData, attendeesData, volunteersData] = await Promise.all([
        apiClient.get<EventStats>("/api/stats"),
        apiClient.get<PaginatedResponse<AttendeeResponse>>(
          "/api/attendees",
          cleanFilter
        ),
        apiClient.get<any[]>("/api/volunteers/summary"),
      ]);

      setStats(statsData);
      setAttendees(attendeesData.data);
      setAttendeesPagination(attendeesData.pagination);
      setVolunteerSummary(volunteersData);
      setStatus(ApiStatus.SUCCESS);
    } catch (error: any) {
      console.error("Dashboard data loading error:", error);
      setStatus(ApiStatus.ERROR);
      setError("Failed to load dashboard data. Please try again.");
    }
  };

  const handleSearch = (query: string) => {
    setFilter((prev) => ({
      ...prev,
      search: query,
      offset: 0,
    }));
  };

  const toggleSort = (
    column:
      | keyof AttendeeResponse
      | "registered_at"
      | "checked_in_date"
      | "checked_in_time"
  ) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const handleFilterChange = (
    filterType:
      | "all"
      | "checked_in"
      | "not_checked_in"
      | "with_food"
      | "without_food"
  ) => {
    let checked_in: boolean | undefined;
    let food_option: string | undefined;

    switch (filterType) {
      case "checked_in":
        checked_in = true;
        food_option = undefined;
        break;
      case "not_checked_in":
        checked_in = false;
        food_option = undefined;
        break;
      case "with_food":
        checked_in = undefined;
        food_option = "with_food";
        break;
      case "without_food":
        checked_in = undefined;
        food_option = "without_food";
        break;
      default: // 'all'
        checked_in = undefined;
        food_option = undefined;
    }

    setFilter((prev) => ({
      ...prev,
      checked_in,
      food_option,
      offset: 0,
    }));
  };

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * (filter.limit || 50);
    setFilter((prev) => ({
      ...prev,
      offset: newOffset,
    }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setFilter((prev) => ({
      ...prev,
      limit: pageSize,
      offset: 0,
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const loadVolunteerAttendees = async (
    volunteerId: string,
    offset: number = 0
  ) => {
    try {
      const response = await apiClient.get<PaginatedResponse<AttendeeResponse>>(
        `/api/volunteers/${volunteerId}/attendees`,
        { limit: 50, offset }
      );
      setVolunteerAttendees(response.data);
      setVolunteerAttendeesPagination(response.pagination);
    } catch (error) {
      console.error("Failed to load volunteer attendees:", error);
    }
  };

  const loadVolunteerDetails = async (volunteerId: string) => {
    try {
      const response = await apiClient.get(
        `/api/volunteers/${volunteerId}/details`
      );
      setVolunteerDetails(response);
    } catch (error) {
      console.error("Failed to load volunteer details:", error);
    }
  };

  const handleVolunteerClick = async (volunteer: any) => {
    setSelectedVolunteer(volunteer);
    await Promise.all([
      loadVolunteerDetails(volunteer.volunteer_id),
      loadVolunteerAttendees(volunteer.volunteer_id),
    ]);
  };

  const handleVolunteerAttendeesPageChange = (page: number) => {
    if (selectedVolunteer) {
      const newOffset = (page - 1) * 50;
      loadVolunteerAttendees(selectedVolunteer.volunteer_id, newOffset);
    }
  };

  const handleBackToVolunteers = () => {
    setSelectedVolunteer(null);
    setVolunteerDetails(null);
    setVolunteerAttendees([]);
    setVolunteerAttendeesPagination(null);
  };

  const loadEmailAttendees = async (email: string, offset: number = 0) => {
    try {
      const response = await apiClient.get<PaginatedResponse<AttendeeResponse>>(
        `/api/attendees/by-email/${encodeURIComponent(email)}`,
        { limit: 50, offset }
      );
      setEmailAttendees(response.data);
      setEmailAttendeesPagination(response.pagination);
    } catch (error) {
      console.error("Failed to load email attendees:", error);
    }
  };

  const handleEmailClick = async (email: string) => {
    setSelectedEmail(email);
    await loadEmailAttendees(email);
  };

  const handleEmailAttendeesPageChange = (page: number) => {
    if (selectedEmail) {
      const newOffset = (page - 1) * 50;
      loadEmailAttendees(selectedEmail, newOffset);
    }
  };

  const handleBackToAttendees = () => {
    setSelectedEmail(null);
    setEmailAttendees([]);
    setEmailAttendeesPagination(null);
  };

  const handleUpdateClearedAmount = (volunteer: any) => {
    setSelectedVolunteerForClearing(volunteer);
    setShowClearedAmountModal(true);
  };

  const handleCloseClearedAmountModal = () => {
    setShowClearedAmountModal(false);
    setSelectedVolunteerForClearing(null);
  };

  const handleUpdateClearedAmountSubmit = async (
    volunteerId: string,
    clearedAmount: number
  ) => {
    setIsUpdatingClearedAmount(true);
    try {
      await apiClient.patch(`/api/auth/users/${volunteerId}/cleared-amount`, {
        cleared_amount: clearedAmount,
      });

      // Refresh the volunteer summary to show updated amounts
      await loadData();
    } catch (error) {
      console.error("Failed to update cleared amount:", error);
      throw error;
    } finally {
      setIsUpdatingClearedAmount(false);
    }
  };

  if (status === ApiStatus.LOADING && !stats) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Event Dashboard
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-700">
            Monitor registrations and check-ins in real-time
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Role-based rendering */}
        {stats && (isPresident() || isFinanceDirector()) && (
          <div>
            {/* KPI Toggle Switch */}
            <div className="mb-4 flex justify-end">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setHideKpiValues(!hideKpiValues)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    hideKpiValues ? "bg-gray-300" : "bg-blue-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hideKpiValues ? "translate-x-1" : "translate-x-6"
                    }`}
                  />
                </button>
              </div>
            </div>
            <FinancialStatsCards stats={stats} hideValues={hideKpiValues} />
          </div>
        )}

        {/* Admin Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <div className="flex flex-wrap gap-2 sm:space-x-4 sm:gap-0">
              <button
                onClick={() => setShowEventManager(!showEventManager)}
                className="px-4 py-2 rounded-md shadow-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {showEventManager ? "Hide" : "Manage"} Event Details
              </button>
              <button
                onClick={() => setShowPricingManager(!showPricingManager)}
                className="px-4 py-2 rounded-md shadow-sm bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              >
                {showPricingManager ? "Hide" : "Manage"} Ticket Pricing
              </button>
              <button
                onClick={() =>
                  setShowVolunteerApplications(!showVolunteerApplications)
                }
                className="px-4 py-2 rounded-md shadow-sm bg-blue-400 text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
              >
                {showVolunteerApplications ? "Hide" : "Manage"} Volunteer
                Applications
              </button>
            </div>
          </div>
        </div>

        {/* Event Manager */}
        {showEventManager && (
          <div className="mb-6">
            <EventManager onEventUpdated={loadData} />
          </div>
        )}

        {/* Pricing Manager */}
        {showPricingManager && <PricingManager />}

        {/* Volunteer Applications Manager */}
        {showVolunteerApplications && (
          <div className="mb-6">
            <VolunteerApplicationsManager onApplicationApproved={loadData} />
            <div className="mt-4 text-center text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              💡 <strong>Tip:</strong> Once approved, volunteers will
              automatically appear in the "Volunteers" table below.
            </div>
          </div>
        )}

        {/* Tabbed Tables - Volunteers and Attendees */}
        <TabbedTables
          volunteerSummary={volunteerSummary}
          attendees={attendees}
          attendeesPagination={attendeesPagination}
          formatDate={formatDate}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          selectedVolunteer={selectedVolunteer}
          volunteerDetails={volunteerDetails}
          volunteerAttendees={volunteerAttendees}
          volunteerAttendeesPagination={volunteerAttendeesPagination}
          onVolunteerClick={handleVolunteerClick}
          onVolunteerAttendeesPageChange={handleVolunteerAttendeesPageChange}
          onBackToVolunteers={handleBackToVolunteers}
          selectedEmail={selectedEmail}
          emailAttendees={emailAttendees}
          emailAttendeesPagination={emailAttendeesPagination}
          onEmailClick={handleEmailClick}
          onEmailAttendeesPageChange={handleEmailAttendeesPageChange}
          onBackToAttendees={handleBackToAttendees}
          filter={{
            checked_in: filter.checked_in,
            food_option: filter.food_option,
            offset: filter.offset,
          }}
          searchQuery={filter.search ?? ""}
          onFilterChange={handleFilterChange}
          onSearchChange={handleSearch}
          onRefresh={loadData}
          isLoading={status === ApiStatus.LOADING}
          onUpdateClearedAmount={handleUpdateClearedAmount}
        />

        {/* Update Cleared Amount Modal */}
        <UpdateClearedAmountModal
          isOpen={showClearedAmountModal}
          onClose={handleCloseClearedAmountModal}
          volunteer={selectedVolunteerForClearing}
          onUpdate={handleUpdateClearedAmountSubmit}
          isLoading={isUpdatingClearedAmount}
        />
      </div>
    </div>
  );
};

// Stats Cards Component
interface StatsCardsProps {
  stats: EventStats;
  hideValues?: boolean;
}

// Financial Stats Cards (President + Finance Director)
const FinancialStatsCards: React.FC<StatsCardsProps> = ({
  stats,
  hideValues = false,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-8 w-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            ></path>
          </svg>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Registered
            </dt>
            <dd className="text-3xl font-bold text-gray-900">
              {hideValues ? "***" : stats.total_registered}
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"
            ></path>
          </svg>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Revenue (Cash)
            </dt>
            <dd className="text-3xl font-bold text-gray-900">
              {hideValues ? "***" : `$${stats.revenue_cash.toFixed(2)}`}
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-8 w-8 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"
            ></path>
          </svg>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Revenue (Zelle)
            </dt>
            <dd className="text-3xl font-bold text-gray-900">
              {hideValues ? "***" : `$${stats.revenue_zelle.toFixed(2)}`}
            </dd>
          </dl>
        </div>
      </div>
    </div>

    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            ></path>
          </svg>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Revenue
            </dt>
            <dd className="text-3xl font-bold text-gray-900">
              {hideValues ? "***" : `$${stats.total_revenue.toFixed(2)}`}
            </dd>
            <dd className="text-sm text-gray-500">
              {hideValues
                ? "*** tickets sold"
                : `${stats.total_tickets_sold} tickets sold`}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

// Loading State Component
const LoadingState: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <svg
        className="animate-spin h-12 w-12 mx-auto text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p className="mt-4 text-gray-600">Loading dashboard...</p>
    </div>
  </div>
);

export default Dashboard;
