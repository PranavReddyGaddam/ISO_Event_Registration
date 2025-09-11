/**
 * Check-in page - React component for QR code scanning and manual check-in.
 */

import React, { useState, useRef, useEffect } from 'react';
import { AttendeeResponse, ApiStatus } from '../types';
import { useApiClient } from '../hooks/useApiClient';

const CheckIn: React.FC = () => {
  const [status, setStatus] = useState<ApiStatus>(ApiStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<AttendeeResponse | null>(null);
  const [alreadyCheckedInData, setAlreadyCheckedInData] = useState<AttendeeResponse | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerInitializing, setScannerInitializing] = useState(false);
  const [manualQrId, setManualQrId] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState<AttendeeResponse[]>([]);

  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const apiClient = useApiClient();

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setScannerInitializing(true);
      setError(null);

      // Dynamic import for HTML5-QRCode
      const { Html5Qrcode } = await import('html5-qrcode');
      
      setScannerActive(true);

      // Wait for the DOM to update and the container to be rendered
      setTimeout(async () => {
        console.log('Checking for container ref:', containerRef.current);
        console.log('Container element by ID:', document.getElementById('qr-scanner-container'));
        
        if (!containerRef.current) {
          console.error('QR scanner container ref not found');
          setError('Failed to start QR code scanner. Please try manual check-in.');
          setScannerActive(false);
          setScannerInitializing(false);
          return;
        }

        try {
          const html5Qrcode = new Html5Qrcode('qr-scanner-container');
          
          // Try to start with back camera first, then fallback to any camera
          let cameraStarted = false;
          
          try {
            // Try back camera first
            await html5Qrcode.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
              },
              (decodedText: string) => {
                handleQrCodeScanned(decodedText);
                stopScanner();
              },
              (error: string) => {
                // Handle specific camera permission errors
                if (error.includes('Permission denied') || error.includes('NotAllowedError')) {
                  setError('Camera permission denied. Please allow camera access and try again.');
                  stopScanner();
                } else if (error.includes('NotFoundError') || error.includes('No camera')) {
                  setError('No camera found. Please ensure you have a camera connected.');
                  stopScanner();
                } else if (error.includes('NotReadableError')) {
                  setError('Camera is already in use by another application.');
                  stopScanner();
                } else {
                  // Silent error handling for other scanning errors
                  console.debug('QR scan error:', error);
                }
              }
            );
            cameraStarted = true;
          } catch (backCameraError) {
            console.log('Back camera failed, trying default camera:', backCameraError);
            
            // Fallback to default camera
            try {
              await html5Qrcode.start(
                { facingMode: "user" },
                {
                  fps: 10,
                  qrbox: { width: 250, height: 250 },
                  aspectRatio: 1.0,
                },
                (decodedText: string) => {
                  handleQrCodeScanned(decodedText);
                  stopScanner();
                },
                (error: string) => {
                  // Handle specific camera permission errors
                  if (error.includes('Permission denied') || error.includes('NotAllowedError')) {
                    setError('Camera permission denied. Please allow camera access and try again.');
                    stopScanner();
                  } else if (error.includes('NotFoundError') || error.includes('No camera')) {
                    setError('No camera found. Please ensure you have a camera connected.');
                    stopScanner();
                  } else if (error.includes('NotReadableError')) {
                    setError('Camera is already in use by another application.');
                    stopScanner();
                  } else {
                    // Silent error handling for other scanning errors
                    console.debug('QR scan error:', error);
                  }
                }
              );
              cameraStarted = true;
            } catch (defaultCameraError) {
              console.error('Default camera also failed:', defaultCameraError);
              throw defaultCameraError;
            }
          }

          if (cameraStarted) {
            scannerRef.current = html5Qrcode;
            setScannerInitializing(false);
          }
        } catch (scannerError) {
          console.error('Error creating scanner:', scannerError);
          setError('Failed to start QR code scanner. Please try manual check-in.');
          setScannerActive(false);
          setScannerInitializing(false);
        }
      }, 200); // Increased delay to ensure DOM is updated
    } catch (error) {
      console.error('Error starting scanner:', error);
      setError('Failed to start QR code scanner. Please try manual check-in.');
      setScannerActive(false);
      setScannerInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
    setScannerInitializing(false);
    
    // Clear the container content
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  };

  const handleQrCodeScanned = async (qrCodeId: string) => {
    await checkInAttendee(qrCodeId);
  };

  const handleManualCheckIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualQrId.trim()) return;

    await checkInAttendee(manualQrId.trim());
    setManualQrId('');
  };

  const checkInAttendee = async (qrCodeId: string) => {
    setStatus(ApiStatus.LOADING);
    setError(null);
    setSuccessData(null);
    setAlreadyCheckedInData(null);

    try {
      const response = await apiClient.post<{
        success: boolean;
        attendee: AttendeeResponse;
        message: string;
      }>(`/api/checkin/${qrCodeId}`);

      if (response.success) {
        // This is a successful new check-in
        setSuccessData(response.attendee);
        setStatus(ApiStatus.SUCCESS);
        
        // Add to recent check-ins
        setRecentCheckIns(prev => [response.attendee, ...prev.slice(0, 4)]);
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setSuccessData(null);
          setStatus(ApiStatus.IDLE);
        }, 3000);
      } else {
        // Handle different types of failures
        if (response.message === "Attendee already checked in") {
          setError(`❌ ${response.attendee.name} is already checked in!`);
          setAlreadyCheckedInData(response.attendee);
        } else {
          setError(response.message || 'Check-in failed');
        }
        setStatus(ApiStatus.ERROR);
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      setError(error.message || 'Check-in failed. Please try again.');
      setStatus(ApiStatus.ERROR);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Check-in</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-700">Scan QR codes or manually check in attendees</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* QR Scanner Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">QR Code Scanner</h2>
            
            {!scannerActive ? (
              <div className="text-center">
                <div className="mb-6">
                  <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m-2 0h-2m3-4h2m-6 0h-2v4m-2 0h-2m-1-4V9a2 2 0 012-2h2a2 2 0 012 2v2m4-6V4a2 2 0 00-2-2H9a2 2 0 00-2 2v1m4 0h2m-6 0h2"></path>
                  </svg>
                </div>
                <button
                  onClick={startScanner}
                  disabled={status === ApiStatus.LOADING || scannerInitializing}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {scannerInitializing ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting Scanner...
                    </span>
                  ) : (
                    'Start QR Scanner'
                  )}
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  Click to activate your camera and scan QR codes
                </p>
              </div>
            ) : (
              <div>
                <div className="relative mb-4">
                  <div 
                    id="qr-scanner-container" 
                    ref={containerRef}
                    className="min-h-[300px] bg-black/20 rounded-lg border border-white/10"
                  ></div>
                  
                  {scannerInitializing && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="mb-4">
                          <svg className="animate-spin mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <p className="text-white">Initializing camera...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={stopScanner}
                  disabled={scannerInitializing}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                >
                  Stop Scanner
                </button>
              </div>
            )}
          </div>

          {/* Manual Check-in Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Manual Check-in</h2>
            
            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div>
                <label htmlFor="qr-id" className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code ID
                </label>
                <input
                  type="text"
                  id="qr-id"
                  value={manualQrId}
                  onChange={(e) => setManualQrId(e.target.value)}
                  placeholder="Enter QR code ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={status === ApiStatus.LOADING}
                />
              </div>
              
              <button
                type="submit"
                disabled={status === ApiStatus.LOADING || !manualQrId.trim()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === ApiStatus.LOADING ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking in...
                  </span>
                ) : (
                  'Check In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                QR code IDs can be found in registration emails or on printed tickets
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-6 bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Check-in Failed</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successData && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Check-in Successful!</h3>
                <p className="mt-1 text-sm text-green-700">
                  {successData.name} has been checked in successfully.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Already Checked In Message */}
        {alreadyCheckedInData && (
          <div className="mt-6 bg-yellow-500/10 backdrop-blur-sm border border-yellow-400/30 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Already Checked In</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p><strong>Name:</strong> {alreadyCheckedInData.name}</p>
                  <p><strong>Email:</strong> {alreadyCheckedInData.email}</p>
                  <p><strong>Phone:</strong> {alreadyCheckedInData.phone}</p>
                  {alreadyCheckedInData.checked_in_at && (
                    <p><strong>Checked in at:</strong> {formatDate(alreadyCheckedInData.checked_in_at)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Check-ins */}
        {recentCheckIns.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Recent Check-ins</h2>
            <div className="space-y-3">
              {recentCheckIns.map((attendee) => (
                <div key={attendee.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-white">{attendee.name}</p>
                    <p className="text-sm text-gray-500">{attendee.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Checked In
                    </span>
                    {attendee.checked_in_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(attendee.checked_in_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckIn;