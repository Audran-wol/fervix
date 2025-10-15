/**
 * Power simulator - no-device mode
 * Drives detector with synthetic traces and emits phase events
 */

import { CurrentDetector } from './detector';
import { getTrace } from './traces';
import { DETECTOR_CONFIG, PRESETS } from './contracts';
import type {
  IPowerController,
  Phase,
  SampleEvent,
  DetectorEvent,
  PhaseChangedEvent,
  SampleHandler,
  DetectorHandler,
  PhaseChangedHandler,
  UsbHandler,
  PresetConfig,
} from './contracts';

export class PowerSimulator implements IPowerController {
  private detector: CurrentDetector;
  private phase: Phase = 'IDLE';
  private currentPreset: PresetConfig | null = null;
  
  private sampleListeners: SampleHandler[] = [];
  private detectorListeners: DetectorHandler[] = [];
  private phaseListeners: PhaseChangedHandler[] = [];
  private usbListeners: UsbHandler[] = [];
  
  private traceIndex = 0;
  private trace: SampleEvent[] = [];
  private sampleTimer: NodeJS.Timeout | null = null;
  private phaseTimer: NodeJS.Timeout | null = null;
  
  private sessionStartTime = 0;
  private heatStartDetected = false;

  constructor() {
    this.detector = new CurrentDetector();
    
    // Subscribe to detector events
    this.detector.subscribe((event: DetectorEvent) => {
      this.handleDetectorEvent(event);
      this.emitDetectorEvent(event);
    });
  }

  startSession(params: { presetId: string; ambientC?: number }): void {
    const preset = PRESETS[params.presetId];
    if (!preset) {
      console.error(`Unknown preset: ${params.presetId}`);
      return;
    }

    this.currentPreset = preset;
    this.sessionStartTime = Date.now();
    this.heatStartDetected = false;
    this.traceIndex = 0;
    
    // Generate trace and convert to SampleEvents
    const rawTrace = getTrace('full');
    this.trace = rawTrace.map(sample => ({
      tMillis: this.sessionStartTime + sample.t,
      current_mA: sample.mA,
    }));
    
    // Reset detector
    this.detector.reset();
    
    // Start in PREHEAT_DETECT phase
    this.setPhase('PREHEAT_DETECT');
    
    // Start sampling
    this.startSampling();
  }

  stopSession(): void {
    this.stopSampling();
    
    if (this.phase !== 'IDLE' && this.phase !== 'DONE') {
      this.setPhase('ABORT', 'USER_ABORT');
    }
    
    this.currentPreset = null;
    this.heatStartDetected = false;
  }

  subscribe(event: 'Sample', handler: SampleHandler): () => void;
  subscribe(event: 'Detector', handler: DetectorHandler): () => void;
  subscribe(event: 'PhaseChanged', handler: PhaseChangedHandler): () => void;
  subscribe(event: 'Usb', handler: UsbHandler): () => void;
  subscribe(event: string, handler: any): () => void {
    if (event === 'Sample') {
      this.sampleListeners.push(handler);
      return () => {
        this.sampleListeners = this.sampleListeners.filter(h => h !== handler);
      };
    } else if (event === 'Detector') {
      this.detectorListeners.push(handler);
      return () => {
        this.detectorListeners = this.detectorListeners.filter(h => h !== handler);
      };
    } else if (event === 'PhaseChanged') {
      this.phaseListeners.push(handler);
      return () => {
        this.phaseListeners = this.phaseListeners.filter(h => h !== handler);
      };
    } else if (event === 'Usb') {
      this.usbListeners.push(handler);
      return () => {
        this.usbListeners = this.usbListeners.filter(h => h !== handler);
      };
    }
    
    return () => {};
  }

  getSnapshot() {
    const detectorState = this.detector.getSnapshot();
    return {
      phase: this.phase,
      baseline_mA: detectorState.baseline_mA,
      lastDelta_mA: detectorState.lastDelta_mA,
    };
  }

  private startSampling() {
    this.sampleTimer = setInterval(() => {
      if (this.traceIndex >= this.trace.length) {
        // Trace finished - end session gracefully
        this.stopSampling();
        if (this.phase !== 'DONE' && this.phase !== 'ABORT') {
          this.setPhase('DONE', 'COMPLETED');
        }
        return;
      }

      const sample = this.trace[this.traceIndex];
      this.traceIndex++;

      // Emit sample event
      this.emitSampleEvent(sample);

      // Process through detector
      this.detector.processSample(sample);
    }, DETECTOR_CONFIG.sampleMs);
  }

  private stopSampling() {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private handleDetectorEvent(event: DetectorEvent) {
    if (!this.currentPreset) return;

    if (event.type === 'START_HEAT' && !this.heatStartDetected) {
      this.heatStartDetected = true;
      
      // Transition to HEATUP phase
      this.setPhase('HEATUP', undefined, this.currentPreset.heatupDurationMs);
      
      // Schedule transition to TREATMENT
      this.phaseTimer = setTimeout(() => {
        if (this.phase === 'HEATUP') {
          this.setPhase('TREATMENT', undefined, this.currentPreset!.treatmentDurationMs);
          
          // Schedule transition to COOLDOWN
          this.phaseTimer = setTimeout(() => {
            if (this.phase === 'TREATMENT') {
              this.setPhase('COOLDOWN', undefined, this.currentPreset!.cooldownDurationMs);
              
              // Schedule transition to DONE
              this.phaseTimer = setTimeout(() => {
                if (this.phase === 'COOLDOWN') {
                  this.setPhase('DONE', 'COMPLETED');
                }
              }, this.currentPreset!.cooldownDurationMs);
            }
          }, this.currentPreset!.treatmentDurationMs);
        }
      }, this.currentPreset.heatupDurationMs);
    } else if (event.type === 'END_HEAT' && this.heatStartDetected) {
      // Unexpected end - abort if we're still in active phases
      if (this.phase === 'HEATUP' || this.phase === 'TREATMENT') {
        this.setPhase('ABORT', 'LOST_SIGNAL');
      }
    }
  }

  private setPhase(newPhase: Phase, reason?: string, remainingMs?: number) {
    this.phase = newPhase;
    
    const event: PhaseChangedEvent = {
      phase: newPhase,
      remainingMs,
      reason: reason as any,
    };
    
    this.emitPhaseChangedEvent(event);
    
    // If entering DONE or ABORT, stop sampling
    if (newPhase === 'DONE' || newPhase === 'ABORT') {
      this.stopSampling();
    }
  }

  private emitSampleEvent(event: SampleEvent) {
    this.sampleListeners.forEach(handler => handler(event));
  }

  private emitDetectorEvent(event: DetectorEvent) {
    this.detectorListeners.forEach(handler => handler(event));
  }

  private emitPhaseChangedEvent(event: PhaseChangedEvent) {
    this.phaseListeners.forEach(handler => handler(event));
  }
}

