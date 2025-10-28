/**
 * Native Power Adapter
 * Bridges React Native native module to IPowerController interface
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type {
  IPowerController,
  Phase,
  SampleHandler,
  DetectorHandler,
  PhaseChangedHandler,
  UsbHandler,
} from './contracts';

const LINKING_ERROR =
  `The package 'fervix-native-power' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install'\n", default: '' }) +
  '- Rebuild the app after installing the package\n' +
  '- You are running on a physical device (not simulator)\n';

// Access native module - handle gracefully when not available
const FervixNativePower = NativeModules.FervixNativePower || null;

// Create event emitter - handle null module gracefully
const eventEmitter = FervixNativePower ? new NativeEventEmitter(FervixNativePower) : null;

/**
 * Native implementation of IPowerController
 * Forwards calls to Android native module and subscribes to native events
 */
export class NativePowerAdapter implements IPowerController {
  private subscriptions: Map<string, any> = new Map();

  startSession(params: { presetId: string; ambientC?: number }): void {
    console.log('[NativePowerAdapter] === START SESSION DEBUG ===');
    console.log('[NativePowerAdapter] Params:', params);
    console.log('[NativePowerAdapter] FervixNativePower available:', !!FervixNativePower);
    
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available:', LINKING_ERROR);
      return;
    }
    
    console.log('[NativePowerAdapter] Calling native startSession...');
    FervixNativePower.startSession(params)
      .then(() => {
        console.log('[NativePowerAdapter] ✅ Session started successfully');
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] ❌ Failed to start session:', error);
      });
  }

  stopSession(): void {
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available:', LINKING_ERROR);
      return;
    }
    
    console.log('[NativePowerAdapter] Stopping session');
    FervixNativePower.stopSession()
      .then(() => {
        console.log('[NativePowerAdapter] Session stopped successfully');
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] Failed to stop session:', error);
      });
  }

  subscribe(event: 'Sample', handler: SampleHandler): () => void;
  subscribe(event: 'Detector', handler: DetectorHandler): () => void;
  subscribe(event: 'PhaseChanged', handler: PhaseChangedHandler): () => void;
  subscribe(event: 'Usb', handler: UsbHandler): () => void;
  subscribe(event: 'Recalibration', handler: RecalibrationHandler): () => void;
  subscribe(event: string, handler: any): () => void {
    console.log(`[NativePowerAdapter] === SUBSCRIBE DEBUG ===`);
    console.log(`[NativePowerAdapter] Event: ${event}`);
    console.log(`[NativePowerAdapter] FervixNativePower available: ${!!FervixNativePower}`);
    console.log(`[NativePowerAdapter] EventEmitter available: ${!!eventEmitter}`);
    
    if (!FervixNativePower || !eventEmitter) {
      console.error('[NativePowerAdapter] Native module not available for subscription');
      return () => {}; // Return empty unsubscribe function
    }
    
    console.log(`[NativePowerAdapter] Creating subscription for ${event}`);
    
    const subscription = eventEmitter.addListener(event, (data) => {
      console.log(`[NativePowerAdapter] 📡 Received ${event} event:`, data);
      handler(data);
    });
    const key = `${event}-${Date.now()}`;
    this.subscriptions.set(key, subscription);

    console.log(`[NativePowerAdapter] ✅ Subscription created for ${event}`);
    return () => {
      console.log(`[NativePowerAdapter] Unsubscribing from ${event}`);
      subscription.remove();
      this.subscriptions.delete(key);
    };
  }

  getSnapshot() {
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available for snapshot');
      return Promise.resolve({
        phase: 'IDLE' as Phase,
        baseline_mA: 0,
        lastDelta_mA: 0,
      });
    }
    
    return FervixNativePower.getSnapshot()
      .then((data: any) => {
        return {
          phase: 'IDLE' as Phase,
          baseline_mA: data.baseline_mA || 0,
          lastDelta_mA: data.lastDelta_mA || 0,
        };
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] Failed to get snapshot:', error);
        return {
          phase: 'IDLE' as Phase,
          baseline_mA: 0,
          lastDelta_mA: 0,
        };
      });
  }

  setDeviceDetectionThreshold(threshold: number): void {
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available for setDeviceDetectionThreshold');
      return;
    }
    
    console.log(`[NativePowerAdapter] Setting device detection threshold to: ${threshold}mA`);
    FervixNativePower.setDeviceDetectionThreshold(threshold)
      .then(() => {
        console.log(`[NativePowerAdapter] ✅ Threshold set successfully to ${threshold}mA`);
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] ❌ Failed to set threshold:', error);
      });
  }

  setDeviceDetectionEndThreshold(threshold: number): void {
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available for setDeviceDetectionEndThreshold');
      return;
    }
    
    console.log(`[NativePowerAdapter] Setting device detection END threshold to: ${threshold}mA`);
    FervixNativePower.setDeviceDetectionEndThreshold(threshold)
      .then(() => {
        console.log(`[NativePowerAdapter] ✅ END threshold set successfully to ${threshold}mA`);
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] ❌ Failed to set END threshold:', error);
      });
  }

  enablePeriodicRecalibration(): void {
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available for enablePeriodicRecalibration');
      return;
    }
    
    console.log('[NativePowerAdapter] Enabling periodic recalibration');
    FervixNativePower.enablePeriodicRecalibration()
      .then(() => {
        console.log('[NativePowerAdapter] ✅ Periodic recalibration enabled');
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] ❌ Failed to enable periodic recalibration:', error);
      });
  }

  disablePeriodicRecalibration(): void {
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available for disablePeriodicRecalibration');
      return;
    }
    
    console.log('[NativePowerAdapter] Disabling periodic recalibration');
    FervixNativePower.disablePeriodicRecalibration()
      .then(() => {
        console.log('[NativePowerAdapter] ✅ Periodic recalibration disabled');
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] ❌ Failed to disable periodic recalibration:', error);
      });
  }
}

