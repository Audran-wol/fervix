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
  tMillis?: number;
  current_mA?: number;
  voltage_V?: number;
  power_W?: number;
  battery_level?: number;
  charging_status?: string;
  is_charging?: boolean;
  device_detected?: boolean;
  baseline_current?: number;
  delta_mA?: number;
  detection_threshold?: number;
  calibration_complete?: boolean;
  timestamp?: string;
}

export interface DetectorEvent {
  type: 'START_HEAT' | 'END_HEAT' | 'ACCESSORY_CONNECTED' | 'ACCESSORY_DISCONNECTED';
  tMillis: number;
  delta_mA: number;
}

export interface RecalibrationEvent {
  type: 'PERIODIC_UPDATE' | 'MANUAL_UPDATE';
  oldBaseline: number;
  newBaseline: number;
  oldStartThreshold: number;
  newStartThreshold: number;
  oldEndThreshold: number;
  newEndThreshold: number;
  timestamp: string;
}

export interface PhaseChangedEvent {
  phase: Phase;
  remainingMs?: number;
  reason?: EndReason;
}

export interface UsbEvent {
  type: 'USB_PORT_CHANGED' | 'USB_DEVICE_ATTACHED' | 'USB_DEVICE_DETACHED' | 'USB_STATE';
  timestamp: string;
  connected?: boolean;
  powerRole?: 'SOURCE' | 'SINK' | 'UNKNOWN';
  dataRole?: 'HOST' | 'DEVICE' | 'UNKNOWN';
  canSourcePower?: boolean;
  isHost?: boolean;
  host_connected?: boolean;
  configured?: boolean;
  functions?: string;
}

// Event handler types
export type SampleHandler = (event: SampleEvent) => void;
export type DetectorHandler = (event: DetectorEvent) => void;
export type PhaseChangedHandler = (event: PhaseChangedEvent) => void;
export type UsbHandler = (event: UsbEvent) => void;
export type RecalibrationHandler = (event: RecalibrationEvent) => void;

// Controller interface - the only API the app should use
export interface IPowerController {
  startSession(params: { presetId: string; ambientC?: number }): void;
  stopSession(): void;
  subscribe(event: 'Sample', handler: SampleHandler): () => void;
  subscribe(event: 'Detector', handler: DetectorHandler): () => void;
  subscribe(event: 'PhaseChanged', handler: PhaseChangedHandler): () => void;
  subscribe(event: 'Usb', handler: UsbHandler): () => void;
  subscribe(event: 'Recalibration', handler: RecalibrationHandler): () => void;
  getSnapshot(): { 
    phase: Phase; 
    baseline_mA?: number; 
    lastDelta_mA?: number; 
  };
  setDeviceDetectionThreshold?(threshold: number): void;
  setDeviceDetectionEndThreshold?(threshold: number): void;
  enablePeriodicRecalibration?(): void;
  disablePeriodicRecalibration?(): void;
  performRecalibration?(): void;
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

