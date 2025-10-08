/**
 * Power monitoring contracts and types
 * Stable API shared between simulator and native implementations
 */

// Phase enum - represents the current state of the treatment session
export type Phase = 
  | 'IDLE'
  | 'PREHEAT_DETECT'
  | 'HEATUP'
  | 'TREATMENT'
  | 'COOLDOWN'
  | 'DONE'
  | 'ABORT';

// End reasons - why a session ended
export type EndReason = 
  | 'COMPLETED'
  | 'USER_ABORT'
  | 'LOST_SIGNAL'
  | 'TIMEOUT'
  | 'ERROR';

// Events emitted by the backend

export interface SampleEvent {
  tMillis: number;
  current_mA: number;
}

export interface DetectorEvent {
  type: 'START_HEAT' | 'END_HEAT' | 'ACCESSORY_CONNECTED' | 'ACCESSORY_DISCONNECTED';
  tMillis: number;
  delta_mA: number;
}

export interface PhaseChangedEvent {
  phase: Phase;
  remainingMs?: number;
  reason?: EndReason;
}

// Event handler types
export type SampleHandler = (event: SampleEvent) => void;
export type DetectorHandler = (event: DetectorEvent) => void;
export type PhaseChangedHandler = (event: PhaseChangedEvent) => void;

// Controller interface - the only API the app should use
export interface IPowerController {
  startSession(params: { presetId: string; ambientC?: number }): void;
  stopSession(): void;
  subscribe(event: 'Sample', handler: SampleHandler): () => void;
  subscribe(event: 'Detector', handler: DetectorHandler): () => void;
  subscribe(event: 'PhaseChanged', handler: PhaseChangedHandler): () => void;
  getSnapshot(): { 
    phase: Phase; 
    baseline_mA?: number; 
    lastDelta_mA?: number; 
  };
}

// Detector configuration constants
export const DETECTOR_CONFIG = {
  sampleMs: 80,           // Sample interval in milliseconds
  alpha: 0.25,            // IIR filter coefficient for fast tracking
  beta: 0.02,             // IIR filter coefficient for baseline
  thStart: 260,           // Start threshold in mA (negative delta)
  thEnd: 150,             // End threshold in mA (return to baseline)
  startDebounceMs: 900,   // Debounce time for start detection
  endDebounceMs: 1200,    // Debounce time for end detection
};

// Preset definitions (child vs adult profiles)
export interface PresetConfig {
  id: string;
  heatupDurationMs: number;
  treatmentDurationMs: number;
  cooldownDurationMs: number;
  targetTemp?: number;
}

export const PRESETS: Record<string, PresetConfig> = {
  child: {
    id: 'child',
    heatupDurationMs: 15000,    // 15 seconds
    treatmentDurationMs: 20000,  // 20 seconds
    cooldownDurationMs: 10000,   // 10 seconds
    targetTemp: 40,
  },
  adult: {
    id: 'adult',
    heatupDurationMs: 15000,    // 15 seconds
    treatmentDurationMs: 20000,  // 20 seconds
    cooldownDurationMs: 10000,   // 10 seconds
    targetTemp: 45,
  },
};

