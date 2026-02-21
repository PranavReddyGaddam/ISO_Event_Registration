/**
 * Volunteer Leaderboard Component
 * Shows top 3 volunteers and current user's rank
 */

import React, { useState, useEffect } from 'react';
import { useApiClient } from '../hooks/useApiClient';

interface LeaderboardVolunteer {
  volunteer_id: string;
  full_name: string;
  team_role: string;
  tickets_sold: number;
  rank: number;
  is_current_user: boolean;
}

interface LeaderboardData {
  top_volunteers: LeaderboardVolunteer[];
  current_user_rank: LeaderboardVolunteer | null;
  total_volunteers: number;
}

interface VolunteerLeaderboardProps {
  refreshTrigger?: number; // Optional prop to trigger refresh
}

const VolunteerLeaderboard: React.FC<VolunteerLeaderboardProps> = ({ refreshTrigger }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, get events to find Rang Barse event ID
      const events = await apiClient.get<{id: string, name: string}[]>('/api/events');
      console.log('Available events:', events);
      const rangBarseEvent = events.find(e => e.name.toLowerCase().includes('rang barse'));
      console.log('Found Rang Barse event:', rangBarseEvent);
      
      // Build URL with Rang Barse event ID if found
      const url = rangBarseEvent 
        ? `/api/volunteers/leaderboard?event_id=${rangBarseEvent.id}`
        : '/api/volunteers/leaderboard';
      console.log('Leaderboard URL:', url);
      
      const response = await apiClient.get<LeaderboardData>(url);
      console.log('Leaderboard response:', response);
      setLeaderboardData(response);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [refreshTrigger]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400 shadow-lg';
      case 2:
        return 'text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400 shadow-md';
      case 3:
        return 'text-amber-800 bg-gradient-to-r from-amber-100 to-amber-200 border-2 border-amber-400 shadow-md';
      default:
        return 'text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 mb-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-red-400/30 p-6 mb-6">
        <div className="text-center text-red-300">
          <p className="font-medium">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="mt-3 px-4 py-2 bg-blue-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-blue-600/80 transition-colors border border-blue-400/30"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!leaderboardData || leaderboardData.total_volunteers === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 mb-6">
        <div className="text-center text-gray-600">
          <p className="font-medium">No volunteers found for leaderboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 mb-6">
      <div className="flex items-center justify-center mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-xl">🏆</span>
          Volunteer Leaderboard
        </h2>
      </div>

      {/* Top 3 Volunteers */}
      <div className="space-y-3 mb-4">
        {leaderboardData.top_volunteers.map((volunteer) => (
          <div
            key={volunteer.volunteer_id}
            className={`flex items-center justify-between p-3 rounded-lg border ${getRankColor(volunteer.rank)} transform hover:scale-105 transition-transform duration-200`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getRankIcon(volunteer.rank)}</span>
              <div>
                <p className="font-bold text-base">{volunteer.full_name}</p>
                <p className="text-xs font-medium opacity-80">{volunteer.team_role}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl">{volunteer.tickets_sold}</p>
              <p className="text-xs font-medium opacity-80">tickets</p>
            </div>
          </div>
        ))}
      </div>

      {/* Current User Rank */}
      {leaderboardData.current_user_rank && (
        <div className="border-t border-white/20 pt-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-400 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <div>
                <p className="font-bold text-base text-blue-800">Your Rank</p>
                <p className="text-xs font-medium text-blue-600">
                  #{leaderboardData.current_user_rank.rank} of {leaderboardData.total_volunteers}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-xl text-blue-800">
                {leaderboardData.current_user_rank.tickets_sold}
              </p>
              <p className="text-xs font-medium text-blue-600">tickets</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VolunteerLeaderboard;
