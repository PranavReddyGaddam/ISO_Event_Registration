/**
 * UpdateClearedAmountModal component - Modal for updating volunteer cleared amounts
 */

import React, { useState } from 'react';

interface UpdateClearedAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: {
    volunteer_id: string;
    full_name: string;
    email: string;
    team_role: string;
    total_collected: number;
    cleared_amount: number;
    pending_amount: number;
  } | null;
  onUpdate: (volunteerId: string, clearedAmount: number) => Promise<void>;
  isLoading: boolean;
}

const UpdateClearedAmountModal: React.FC<UpdateClearedAmountModalProps> = ({
  isOpen,
  onClose,
  volunteer,
  onUpdate,
  isLoading
}) => {
  const [clearedAmount, setClearedAmount] = useState<string>('');

  // Update the input when volunteer changes
  React.useEffect(() => {
    if (volunteer) {
      setClearedAmount(volunteer.cleared_amount.toString());
    }
  }, [volunteer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteer) return;

    const amount = parseFloat(clearedAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > volunteer.total_collected) {
      alert('Cleared amount cannot exceed total collected amount');
      return;
    }

    try {
      await onUpdate(volunteer.volunteer_id, amount);
      onClose();
    } catch (error) {
      console.error('Failed to update cleared amount:', error);
      alert('Failed to update cleared amount. Please try again.');
    }
  };

  const handleClose = () => {
    setClearedAmount('');
    onClose();
  };

  if (!isOpen || !volunteer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Update Cleared Amount
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {volunteer.full_name} ({volunteer.team_role})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Current Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Status</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Collected:</span>
                  <div className="font-semibold text-gray-900">
                    ${volunteer.total_collected.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Currently Cleared:</span>
                  <div className="font-semibold text-green-600">
                    ${volunteer.cleared_amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Pending:</span>
                  <div className={`font-semibold ${
                    volunteer.pending_amount === 0 
                      ? 'text-green-600' 
                      : volunteer.pending_amount === volunteer.total_collected
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}>
                    ${volunteer.pending_amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <div className={`font-semibold ${
                    volunteer.pending_amount === 0 
                      ? 'text-green-600' 
                      : volunteer.pending_amount === volunteer.total_collected
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}>
                    {volunteer.pending_amount === 0 
                      ? 'Fully Cleared' 
                      : volunteer.pending_amount === volunteer.total_collected
                        ? 'Not Cleared'
                        : 'Partially Cleared'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Update Input */}
            <div>
              <label htmlFor="clearedAmount" className="block text-sm font-medium text-gray-700 mb-2">
                New Cleared Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="clearedAmount"
                  value={clearedAmount}
                  onChange={(e) => setClearedAmount(e.target.value)}
                  min="0"
                  max={volunteer.total_collected}
                  step="0.01"
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum: ${volunteer.total_collected.toFixed(2)}
              </p>
            </div>

            {/* Preview */}
            {clearedAmount && !isNaN(parseFloat(clearedAmount)) && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Preview</h4>
                <div className="text-sm text-blue-800">
                  <div>New Cleared: ${parseFloat(clearedAmount).toFixed(2)}</div>
                  <div>New Pending: ${(volunteer.total_collected - parseFloat(clearedAmount)).toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateClearedAmountModal;
