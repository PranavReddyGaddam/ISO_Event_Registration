import React, { useState, useEffect } from 'react';
import { useApiClient } from '../hooks/useApiClient';
import { 
  VolunteerApplication, 
  ApplicationStats, 
  VolunteerApplicationRejection 
} from '../types/volunteerApplication';

interface VolunteerApplicationsManagerProps {
  onApplicationApproved?: () => void;
}

const VolunteerApplicationsManager: React.FC<VolunteerApplicationsManagerProps> = ({ onApplicationApproved }) => {
  const apiClient = useApiClient();
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showRejectModal, setShowRejectModal] = useState<VolunteerApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = selectedStatus === 'all' ? undefined : { status: selectedStatus };
      const response = await apiClient.get<VolunteerApplication[]>('/api/volunteer-applications', params);
      setApplications(response);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get<ApplicationStats>('/api/volunteer-applications/stats/summary');
      setStats(response);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadApplications();
    loadStats();
  }, [selectedStatus]);

  const handleApprove = async (application: VolunteerApplication) => {
    if (!confirm(`Are you sure you want to approve ${application.name}'s volunteer application?`)) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.put(`/api/volunteer-applications/${application.id}/approve`);
      await loadApplications();
      await loadStats();
      
      // Notify parent component to refresh volunteers table
      if (onApplicationApproved) {
        onApplicationApproved();
      }
    } catch (error) {
      console.error('Failed to approve application:', error);
      alert('Failed to approve application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectionReason.trim()) {
      return;
    }

    setLoading(true);
    try {
      const rejectionData: VolunteerApplicationRejection = {
        status: 'rejected',
        rejection_reason: rejectionReason.trim()
      };
      
      await apiClient.put(`/api/volunteer-applications/${showRejectModal.id}/reject`, rejectionData);
      await loadApplications();
      await loadStats();
      
      setShowRejectModal(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject application:', error);
      alert('Failed to reject application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Volunteer Applications</h2>
          <p className="text-gray-700">Review and approve pending volunteer applications</p>
        </div>
        
        {/* Status Filter - Only show Pending by default */}
        <div className="flex space-x-2 mt-4 sm:mt-0">
          {['pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status as any)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Simple Stats - Only show pending count */}
      {stats && selectedStatus === 'pending' && (
        <div className="mb-6">
          <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
            <div className="text-sm text-yellow-700">Pending Applications</div>
          </div>
        </div>
      )}

      {/* Applications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-700 mt-2">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-700">No {selectedStatus} applications found.</p>
          </div>
        ) : (
          applications.map((application) => (
            <div key={application.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                    <h3 className="text-lg font-semibold text-gray-900">{application.name}</h3>
                    <span className={getStatusBadge(application.status)}>
                      {application.status}
                    </span>
                  </div>
                  {/* Action Buttons */}
                  {application.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(application)}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectModal(application)}
                        disabled={loading}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  <p><span className="font-medium">Email:</span> {application.email}</p>
                  <p><span className="font-medium">Phone:</span> {application.phone}</p>
                  <p><span className="font-medium">Applied:</span> {formatDate(application.created_at)}</p>
                  {application.reviewed_at && (
                    <p><span className="font-medium">Reviewed:</span> {formatDate(application.reviewed_at)}</p>
                  )}
                  {application.rejection_reason && (
                    <p className="sm:col-span-2"><span className="font-medium">Reason:</span> {application.rejection_reason}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

                  {/* Rejection Modal */}
            {showRejectModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Reject Application - {showRejectModal.name}
                  </h3>
                  <div className="mb-4">
                    <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Please provide a reason for rejection..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={handleReject}
                      disabled={loading || !rejectionReason.trim()}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {loading ? 'Rejecting...' : 'Reject Application'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectModal(null);
                        setRejectionReason('');
                      }}
                      disabled={loading}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
};

export default VolunteerApplicationsManager;
