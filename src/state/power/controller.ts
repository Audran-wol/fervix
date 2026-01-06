/**
 * Power Controller - Facade for simulator/native selection
 * Single entry point for all power monitoring functionality
 */

import { PowerSimulator } from './simulator';
import { NativePowerAdapter } from './nativeAdapter';
import type {
  IPowerController,
  SampleHandler,
  DetectorHandler,
  PhaseChangedHandler,
  UsbHandler,
  RecalibrationHandler,
} from './contracts';

// Feature flag - set to false to use native implementation
export const USE_POWER_SIM = false; // Native mode for real hardware detection

/**
 * Singleton power controller instance
 * Automatically selects simulator or native based on USE_POWER_SIM flag
 */
class PowerControllerSingleton implements IPowerController {
  private implementation: IPowerController;

  constructor() {
    if (USE_POWER_SIM) {
      // Use simulator for development/testing
      this.implementation = new PowerSimulator();
      if (__DEV__) {
        console.log('[PowerController] Using simulator implementation');
      }
    } else {
      // Use native implementation
      this.implementation = new NativePowerAdapter();
      if (__DEV__) {
        console.log('[PowerController] Using native implementation');
      }
    }
  }

  startSession(params: { presetId: string; ambientC?: number }): void {
    this.implementation.startSession(params);
  }

  stopSession(): void {
    this.implementation.stopSession();
  }

  subscribe(event: 'Sample', handler: SampleHandler): () => void;
  subscribe(event: 'Detector', handler: DetectorHandler): () => void;
  subscribe(event: 'PhaseChanged', handler: PhaseChangedHandler): () => void;
  subscribe(event: 'Usb', handler: UsbHandler): () => void;
  subscribe(event: 'Recalibration', handler: RecalibrationHandler): () => void;
  subscribe(event: any, handler: any): () => void {
    return this.implementation.subscribe(event, handler);
  }

  getSnapshot() {
    return this.implementation.getSnapshot();
  }

  setDeviceDetectionThreshold(threshold: number): void {
    if ('setDeviceDetectionThreshold' in this.implementation) {
      (this.implementation as any).setDeviceDetectionThreshold(threshold);
    } else {
      console.warn('[PowerController] setDeviceDetectionThreshold not available in current implementation');
    }
  }

  setDeviceDetectionEndThreshold(threshold: number): void {
    if ('setDeviceDetectionEndThreshold' in this.implementation) {
      (this.implementation as any).setDeviceDetectionEndThreshold(threshold);
    } else {
      console.warn('[PowerController] setDeviceDetectionEndThreshold not available in current implementation');
    }
  }

  enablePeriodicRecalibration(): void {
    if ('enablePeriodicRecalibration' in this.implementation) {
      (this.implementation as any).enablePeriodicRecalibration();
    } else {
      console.warn('[PowerController] enablePeriodicRecalibration not available in current implementation');
    }
  }

  disablePeriodicRecalibration(): void {
    if ('disablePeriodicRecalibration' in this.implementation) {
      (this.implementation as any).disablePeriodicRecalibration();
    } else {
      console.warn('[PowerController] disablePeriodicRecalibration not available in current implementation');
    }
  }

  performRecalibration(): void {
    if ('performRecalibration' in this.implementation) {
      (this.implementation as any).performRecalibration();
    } else {
      console.warn('[PowerController] performRecalibration not available in current implementation');
    }
  }

  /**
   * Manually trigger START_HEAT detection (for testing/debugging)
   * This bypasses automatic detection and directly emits START_HEAT event
   */
  triggerManualDetection(): void {
    if ('triggerManualDetection' in this.implementation) {
      (this.implementation as any).triggerManualDetection();
    } else {
      console.warn('[PowerController] triggerManualDetection not available in current implementation');
    }
  }
}

// Export singleton instance
export const PowerController = new PowerControllerSingleton();

