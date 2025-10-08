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
} from './contracts';

const LINKING_ERROR =
  `The package 'fervix-native-power' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install'\n", default: '' }) +
  '- Rebuild the app after installing the package\n' +
  '- You are running on a physical device (not simulator)\n';

// Access native module
const FervixNativePower = NativeModules.FervixNativePower
  ? NativeModules.FervixNativePower
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Create event emitter
const eventEmitter = new NativeEventEmitter(FervixNativePower);

/**
 * Native implementation of IPowerController
 * Forwards calls to Android native module and subscribes to native events
 */
export class NativePowerAdapter implements IPowerController {
  private subscriptions: Map<string, any> = new Map();

  startSession(params: { presetId: string; ambientC?: number }): void {
    console.log('[NativePowerAdapter] Starting session:', params);
    FervixNativePower.startSession(params)
      .then(() => {
        console.log('[NativePowerAdapter] Session started successfully');
      })
      .catch((error: Error) => {
        console.error('[NativePowerAdapter] Failed to start session:', error);
      });
  }

  stopSession(): void {
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
  subscribe(event: string, handler: any): () => void {
    console.log(`[NativePowerAdapter] Subscribing to ${event}`);
    
    const subscription = eventEmitter.addListener(event, handler);
    const key = `${event}-${Date.now()}`;
    this.subscriptions.set(key, subscription);

    return () => {
      console.log(`[NativePowerAdapter] Unsubscribing from ${event}`);
      subscription.remove();
      this.subscriptions.delete(key);
    };
  }

  getSnapshot() {
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
}

