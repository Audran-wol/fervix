import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const ACTIVATION_KEY = '@fervix_activation_status';
const API_URL = 'https://fervix-admin-dashboard.vercel.app/api';

interface ActivationData {
  isActivated: boolean;
  serialCode: string | null;
  deviceId: string | null;
  activationDate: string | null;
  batchName?: string;
  scanCount?: number;
  maxScans?: number;
  remainingScans?: number;
}

interface ActivationStore extends ActivationData {
  // Actions
  checkActivation: () => Promise<boolean>;
  activateDevice: (serialCode: string) => Promise<ActivationResult>;
  clearActivation: () => Promise<void>;
  isLoading: boolean;
}

interface ActivationResult {
  success: boolean;
  message: string;
  data?: {
    serialCode: string;
    batchName: string;
    scanCount: number;
    maxScans: number;
    remainingScans: number;
    activatedAt: string;
    deviceId: string;
  };
}

export const useActivationStore = create<ActivationStore>((set, get) => ({
  isActivated: false,
  serialCode: null,
  deviceId: null,
  activationDate: null,
  batchName: null,
  scanCount: 0,
  maxScans: 5,
  remainingScans: 0,
  isLoading: false,

  checkActivation: async () => {
    try {
      set({ isLoading: true });
      const stored = await AsyncStorage.getItem(ACTIVATION_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        set({
          isActivated: data.isActivated || false,
          serialCode: data.serialCode || null,
          deviceId: data.deviceId || null,
          activationDate: data.activationDate || null,
          batchName: data.batchName || null,
          scanCount: data.scanCount || 0,
          maxScans: data.maxScans || 5,
          remainingScans: data.remainingScans || 0,
          isLoading: false,
        });
        return data.isActivated || false;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Error checking activation:', error);
      set({ isLoading: false });
      return false;
    }
  },

  activateDevice: async (scannedCode: string): Promise<ActivationResult> => {
    try {
      set({ isLoading: true });

      // Validate serial code format (FV + 8 digits)
      const serialCodeRegex = /^FV\d{8}$/;
      if (!serialCodeRegex.test(scannedCode)) {
        set({ isLoading: false });
        return {
          success: false,
          message: 'Invalid QR code format. Please scan a valid FERVIX QR code.',
        };
      }

      // Get unique device ID
      let deviceId = get().deviceId;
      if (!deviceId) {
        try {
          deviceId = await DeviceInfo.getUniqueId();
        } catch (error) {
          // Fallback to timestamp-based ID
          deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
      }

      // Get device info
      const deviceInfo = {
        platform: DeviceInfo.getSystemName(),
        version: DeviceInfo.getVersion(),
        model: `${DeviceInfo.getBrand()} ${DeviceInfo.getModel()}`,
        osVersion: DeviceInfo.getSystemVersion(),
      };

      console.log('Attempting activation with:', {
        serialCode: scannedCode,
        deviceId,
        deviceInfo,
      });

      // Call activation API
      const response = await fetch(`${API_URL}/activate-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serialCode: scannedCode,
          deviceId,
          deviceInfo,
        }),
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        // Save activation data locally
        const activationData = {
          isActivated: true,
          serialCode: result.data.serialCode,
          deviceId: deviceId,
          activationDate: new Date().toISOString(),
          batchName: result.data.batchName,
          scanCount: result.data.scanCount,
          maxScans: result.data.maxScans,
          remainingScans: result.data.remainingScans,
        };

        await AsyncStorage.setItem(ACTIVATION_KEY, JSON.stringify(activationData));

        set({
          ...activationData,
          isLoading: false,
        });

        return {
          success: true,
          message: result.message || 'Device activated successfully!',
          data: result.data,
        };
      } else {
        set({ isLoading: false });
        return {
          success: false,
          message: result.message || 'Activation failed. Please try again.',
        };
      }
    } catch (error) {
      console.error('Activation error:', error);
      set({ isLoading: false });
      
      let errorMessage = 'Network error. Please check your internet connection.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  clearActivation: async () => {
    try {
      await AsyncStorage.removeItem(ACTIVATION_KEY);
      set({
        isActivated: false,
        serialCode: null,
        deviceId: null,
        activationDate: null,
        batchName: null,
        scanCount: 0,
        maxScans: 5,
        remainingScans: 0,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error clearing activation:', error);
    }
  },
}));
