/**
 * Native Power Adapter
 * Bridges React Native native module to IPowerController interface
 * Processes raw samples through TypeScript detector for variance-based detection
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { CurrentDetector } from './detector';
import type {
  IPowerController,
  Phase,
  SampleHandler,
  DetectorHandler,
  PhaseChangedHandler,
  UsbHandler,
  RecalibrationHandler,
  SampleEvent,
  DetectorEvent,
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
 * Processes raw samples through TypeScript detector
 */
export class NativePowerAdapter implements IPowerController {
  private subscriptions: Map<string, any> = new Map();
  private detector: CurrentDetector;
  private sampleListeners: SampleHandler[] = [];
  private detectorListeners: DetectorHandler[] = [];

  constructor() {
    this.detector = new CurrentDetector();
    
    // Subscribe to detector events and forward them
    this.detector.subscribe((event: DetectorEvent) => {
      this.emitDetectorEvent(event);
      
      // Trigger native HEATUP phase when START_HEAT is detected
      if (event.type === 'START_HEAT' && FervixNativePower) {
        if (__DEV__) {
          console.log('[NativePowerAdapter] 🔥 START_HEAT detected - triggering native HEATUP phase');
        }
        FervixNativePower.triggerHeatupPhase()
          .then(() => {
            if (__DEV__) {
              console.log('[NativePowerAdapter] ✅ Native HEATUP phase triggered successfully');
            }
          })
          .catch((error: Error) => {
            console.error('[NativePowerAdapter] ❌ Failed to trigger HEATUP phase:', error);
          });
      }
    });
  }

  startSession(params: { presetId: string; ambientC?: number }): void {
    if (__DEV__) {
      console.log('[NativePowerAdapter] Starting session with params:', params);
    }
    
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available:', LINKING_ERROR);
      return;
    }
    
    // Reset detector for new session
    this.detector.reset();
    // CRITICAL: Force phase to IDLE when starting session (ensures detection works on HomeScreen)
    this.detector.setPhase('IDLE');
    
    FervixNativePower.startSession(params)
      .then(() => {
        if (__DEV__) {
          console.log('[NativePowerAdapter] ✅ Session started successfully');
        }
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
    
    FervixNativePower.stopSession()
      .then(() => {
        if (__DEV__) {
          console.log('[NativePowerAdapter] Session stopped successfully');
        }
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
    // Handle PhaseChanged events - update detector phase to disable detection during active phases
    if (event === 'PhaseChanged') {
      const subscription = eventEmitter?.addListener('PhaseChanged', (data: { phase: Phase }) => {
        // Update detector phase to disable detection during active phases
        this.detector.setPhase(data.phase);
        handler(data);
      });
      const key = `PhaseChanged-${Date.now()}`;
      this.subscriptions.set(key, subscription);
      return () => {
        subscription?.remove();
        this.subscriptions.delete(key);
      };
    }
    if (!FervixNativePower || !eventEmitter) {
      console.error('[NativePowerAdapter] Native module not available for subscription');
      return () => {}; // Return empty unsubscribe function
    }
    
    // Handle Sample events - process through detector
    if (event === 'Sample') {
      this.sampleListeners.push(handler);
      
      // Subscribe to native Sample events and process through detector
      const subscription = eventEmitter.addListener('Sample', (data: SampleEvent) => {
        // Forward to listeners
        handler(data);
        
        // Process through TypeScript detector
        this.detector.processSample(data);
      });
      
      const key = `Sample-${Date.now()}`;
      this.subscriptions.set(key, subscription);
      
      return () => {
        subscription.remove();
        this.subscriptions.delete(key);
        this.sampleListeners = this.sampleListeners.filter(h => h !== handler);
      };
    }
    
    // Handle Detector events - forward from TypeScript detector
    if (event === 'Detector') {
      this.detectorListeners.push(handler);
      
      return () => {
        this.detectorListeners = this.detectorListeners.filter(h => h !== handler);
      };
    }
    
    // Handle other events - forward directly from native
    const subscription = eventEmitter.addListener(event, (data) => {
      handler(data);
    });
    const key = `${event}-${Date.now()}`;
    this.subscriptions.set(key, subscription);

    return () => {
      subscription.remove();
      this.subscriptions.delete(key);
    };
  }

  private emitDetectorEvent(event: DetectorEvent) {
    this.detectorListeners.forEach(handler => handler(event));
  }

  /**
   * Manually trigger START_HEAT detection (for testing/debugging)
   * DISABLED: Manual detection removed in favor of automatic median-filtered detection
   */
  triggerManualDetection(): void {
    if (__DEV__) {
      console.log('[NativePowerAdapter] ⚠️ Manual detection disabled - using automatic detection only');
    }
    // No-op: Manual detection has been removed
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
    
    FervixNativePower.setDeviceDetectionThreshold(threshold)
      .then(() => {
        if (__DEV__) {
          console.log(`[NativePowerAdapter] ✅ Threshold set successfully to ${threshold}mA`);
        }
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
    
    FervixNativePower.setDeviceDetectionEndThreshold(threshold)
      .then(() => {
        if (__DEV__) {
          console.log(`[NativePowerAdapter] ✅ END threshold set successfully to ${threshold}mA`);
        }
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
    
    FervixNativePower.enablePeriodicRecalibration()
      .then(() => {
        if (__DEV__) {
          console.log('[NativePowerAdapter] ✅ Periodic recalibration enabled');
        }
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
    
    FervixNativePower.disablePeriodicRecalibration()
      .then(() => {
        if (__DEV__) {
          console.log('[NativePowerAdapter] ✅ Periodic recalibration disabled');
        }
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] ❌ Failed to disable periodic recalibration:', error);
      });
  }

  performRecalibration(): void {
    if (!FervixNativePower) {
      console.error('[NativePowerAdapter] Native module not available for performRecalibration');
      return;
    }
    
    FervixNativePower.performRecalibration()
      .then(() => {
        if (__DEV__) {
          console.log('[NativePowerAdapter] ✅ Manual recalibration completed');
        }
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] ❌ Failed to perform manual recalibration:', error);
      });
  }
}

