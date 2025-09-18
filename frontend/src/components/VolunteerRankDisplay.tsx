/**
 * Compact Volunteer Rank Display Component
 * Shows current user's rank with toggle button for full leaderboard
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

interface VolunteerRankDisplayProps {
  refreshTrigger?: number;
  onToggleLeaderboard: (show: boolean) => void;
  showFullLeaderboard: boolean;
}

const VolunteerRankDisplay: React.FC<VolunteerRankDisplayProps> = ({ 
  refreshTrigger, 
  onToggleLeaderboard, 
  showFullLeaderboard 
}) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get<LeaderboardData>('/api/volunteers/leaderboard');
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

  const handleToggleClick = () => {
    onToggleLeaderboard(!showFullLeaderboard);
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-3 mb-4">
        <div className="flex items-center justify-center h-12">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error || !leaderboardData || !leaderboardData.current_user_rank) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-medium text-gray-600">Leaderboard</span>
          </div>
          <button
            onClick={handleToggleClick}
            className="px-3 py-1 text-xs bg-blue-500/80 backdrop-blur-sm text-white rounded-md hover:bg-blue-600/80 transition-colors border border-blue-400/30"
          >
            {showFullLeaderboard ? 'Hide' : 'View'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">🏆</span>
          <div>
            <p className="text-sm font-bold text-gray-800">
              Your Rank: #{leaderboardData.current_user_rank.rank}
            </p>
            <p className="text-xs text-gray-600">
              {leaderboardData.current_user_rank.tickets_sold} tickets sold
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleClick}
          className="px-3 py-1 text-xs bg-blue-500/80 backdrop-blur-sm text-white rounded-md hover:bg-blue-600/80 transition-colors border border-blue-400/30"
        >
          {showFullLeaderboard ? 'Hide Leaderboard' : 'View Full Leaderboard'}
        </button>
      </div>
    </div>
  );
};

export default VolunteerRankDisplay;
