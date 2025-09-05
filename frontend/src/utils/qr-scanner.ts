/**
 * QR code scanner utilities with TypeScript.
 */

import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeData, QRScannerConfig } from '@/types';

export interface QRScanResult {
  success: boolean;
  data?: QRCodeData;
  error?: string;
}

export interface QRScannerCallbacks {
  onSuccess: (data: QRCodeData) => void;
  onError: (error: string) => void;
}

export class QRCodeScanner {
  private scanner: Html5QrcodeScanner | null = null;
  private config: QRScannerConfig;
  private callbacks: QRScannerCallbacks;

  constructor(config: Partial<QRScannerConfig> = {}, callbacks: QRScannerCallbacks) {
    this.config = {
      fps: config.fps || 10,
      qrbox: config.qrbox || 250,
      aspectRatio: config.aspectRatio || 1.0,
      disableFlip: config.disableFlip || false,
    };
    this.callbacks = callbacks;
  }

  public start(elementId: string): void {
    if (this.scanner) {
      this.stop();
    }

    const scannerConfig: any = {
      fps: this.config.fps,
      qrbox: {
        width: this.config.qrbox,
        height: this.config.qrbox,
      },
      aspectRatio: this.config.aspectRatio,
      disableFlip: this.config.disableFlip,
    };

    this.scanner = new Html5QrcodeScanner(elementId, scannerConfig, false);

    this.scanner.render(
      (decodedText) => this.onScanSuccess(decodedText),
      (errorMessage) => this.onScanFailure(errorMessage)
    );
  }

  public stop(): void {
    if (this.scanner) {
      this.scanner.clear()
        .then(() => {
          this.scanner = null;
        })
        .catch((error) => {
          console.error('Error stopping QR scanner:', error);
          this.scanner = null;
        });
    }
  }

  private onScanSuccess(decodedText: string): void {
    try {
      // Try to parse as QR code ID (UUID format)
      const qrCodeData = this.parseQRCodeData(decodedText);
      
      if (qrCodeData) {
        this.callbacks.onSuccess(qrCodeData);
      } else {
        this.callbacks.onError('Invalid QR code format');
      }
    } catch (error) {
      this.callbacks.onError(
        error instanceof Error ? error.message : 'Failed to parse QR code'
      );
    }
  }

  private onScanFailure(errorMessage: string): void {
    // Only log actual errors, not scanning attempts
    if (!errorMessage.includes('No QR code found')) {
      console.warn('QR scan error:', errorMessage);
    }
  }

  private parseQRCodeData(decodedText: string): QRCodeData | null {
    // Check if it's a UUID (our QR code ID format)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (uuidPattern.test(decodedText)) {
      return {
        qr_code_id: decodedText,
      };
    }

    // Try to parse as JSON (future extension)
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === 'object' && parsed.qr_code_id) {
        return parsed as QRCodeData;
      }
    } catch {
      // Not JSON, continue
    }

    return null;
  }

  public isScanning(): boolean {
    return this.scanner !== null;
  }
}

// Utility functions for QR code handling
export const validateQRCodeId = (qrCodeId: string): boolean => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(qrCodeId);
};

export const formatQRCodeData = (data: QRCodeData): string => {
  return JSON.stringify(data, null, 2);
};

// Check if device supports camera
export const checkCameraSupport = async (): Promise<boolean> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
};

// Request camera permission
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch {
    return false;
  }
};
