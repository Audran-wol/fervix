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
      console.log('[PowerController] Using simulator implementation');
    } else {
      // Use native implementation
      this.implementation = new NativePowerAdapter();
      console.log('[PowerController] Using native implementation');
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
}

// Export singleton instance
export const PowerController = new PowerControllerSingleton();

