import type { DetectorEvent, SampleEvent } from './contracts';
import type { Phase } from './contracts';
import { useSessionStore } from '../useSessionStore';

/**
 * Caliberator Detection Algorithm
 * - 10-second median-based frozen baseline
 * - Adaptive recalibration every 2 seconds
 * - Detection threshold: 250-700mA range
 * - Requires 2 consecutive samples + 500ms debounce
 */

// Caliberator Detection Constants
const BASELINE_TIME_MS = 10000;                    // 10 seconds baseline collection
const ARMING_DELAY_MS = 3000;                      // 3 seconds arming delay
const RECALIBRATION_INTERVAL_MS = 2000;            // Recalibrate every 2s
const RECALIBRATION_IDLE_WINDOW_MS = 5000;         // Use last 5s of idle samples
const ADAPTIVE_MIN_PERCENTAGE = 0.12;              // 12% of expected samples
const ABSOLUTE_MIN_SAMPLES = 5;                    // Absolute minimum samples
const BASELINE_SPREAD_TOLERANCE = 1500;            // Max p95-p5 spread (mA)
const BASELINE_MIN = -3000;                        // Plausible lower bound (mA)
const BASELINE_MAX = 500;                          // Plausible upper bound (mA)
const DETECTION_THRESHOLD_MA = 250;                // Minimum drop for detection
const MAX_DETECTION_THRESHOLD_MA = 700;            // Maximum drop (filters spikes)
const RELEASE_THRESHOLD_MA = 150;                  // Release threshold
const DEBOUNCE_MS = 500;                           // Debounce time
const CONSECUTIVE_SAMPLES = 2;                     // Required consecutive samples

interface DetectorState {
  // EXISTING (keep for compatibility):
  buffer: number[];
  anchor_mA: number | null;
  anchorTime: number | null;
  isHeating: boolean;
  isVerifying: boolean;
  verifyCount: number;
  sampleCount: number;
  
  // NEW (from caliberator):
  frozenBaseline: number | null;
  baselineEstablished: boolean;
  startTime: number | null;
  baselineEstablishedTime: number | null;
  lastRecalibrationTime: number | null;
  idleSamples: Array<{ value: number; timestamp: number }>;
  lastSampleTs: number | null;
  lastSampleValue: number | null;
  triggerStartTime: number | null;
  releaseStartTime: number | null;
  consecutiveBelowThreshold: number;
  baselineStatus: string;
  baselineSamples: number[];
}

export class CurrentDetector {
  private state: DetectorState;
  private listeners: Array<(event: DetectorEvent) => void> = [];
  private currentPhase: Phase = 'IDLE';

  constructor() {
    this.state = {
      buffer: [],
      anchor_mA: null,
      anchorTime: null,
      isHeating: false,
      isVerifying: false,
      verifyCount: 0,
      sampleCount: 0,
      frozenBaseline: null,
      baselineEstablished: false,
      startTime: null,
      baselineEstablishedTime: null,
      lastRecalibrationTime: null,
      idleSamples: [],
      lastSampleTs: null,
      triggerStartTime: null,
      releaseStartTime: null,
      consecutiveBelowThreshold: 0,
      baselineStatus: 'Initializing...',
      baselineSamples: [],
    };
  }

  setPhase(phase: Phase) {
    const oldPhase = this.currentPhase;
    this.currentPhase = phase;

    // Reset detection state when returning to IDLE (but keep baseline for faster re-detection)
    if (phase === 'IDLE' && oldPhase !== 'IDLE') {
      this.state.isHeating = false;
      this.state.triggerStartTime = null;
      this.state.releaseStartTime = null;
      this.state.consecutiveBelowThreshold = 0;
      // Keep frozenBaseline for faster re-detection
      console.log('[Detector] 🔄 Phase changed to IDLE - resetting detection state (keeping baseline)');
    }

    // Block new detection during active phases
    // NOTE: END_HEAT monitoring still works (checked in processSample)
    if (phase === 'COOLDOWN' || phase === 'HEATUP' || 
        phase === 'TREATMENT' || phase === 'DONE') {
      // Don't reset isHeating here - let END_HEAT logic handle it
      // Just block new START_HEAT events (handled by allowNewDetection in processSample)
      this.state.triggerStartTime = null;
      this.state.consecutiveBelowThreshold = 0;
      console.log(`[Detector] 🧊 Phase changed to ${phase} - blocking new detection (END_HEAT monitoring active)`);
    }

    // On ABORT, reset detection state
    if (phase === 'ABORT') {
      this.state.isHeating = false;
      this.state.triggerStartTime = null;
      this.state.releaseStartTime = null;
      this.state.consecutiveBelowThreshold = 0;
      console.log('[Detector] 🚨 Phase changed to ABORT - resetting detection state');
    }
  }

  private getMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const half = Math.floor(sorted.length / 2);
    if (values.length % 2) return sorted[half];
    return (sorted[half - 1] + sorted[half]) / 2.0;
  }

  private getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  private getPhase(): Phase {
    const sessionStore = useSessionStore.getState();
    return sessionStore.backendPhase || this.currentPhase;
  }

  processSample(sampleEvent: SampleEvent): DetectorEvent | null {
    const { tMillis, current_mA } = sampleEvent;
    if (current_mA === undefined || !Number.isFinite(current_mA)) return null;

    const current = current_mA;
    const now = tMillis || Date.now();

    // 1. INPUT VALIDATION
    if (Math.abs(current) > 10000) {
      console.log(`[Detector] ⚠️ Sensor error: ${current.toFixed(2)} mA - skipping`);
      return null;
    }

    // 2. PHASE-AWARE DETECTION BLOCKING (CRITICAL!)
    // Block NEW detection during active phases, but allow END_HEAT monitoring
    const phase = this.getPhase();
    const isActivePhase = phase === 'HEATUP' || phase === 'TREATMENT' || 
                          phase === 'COOLDOWN' || phase === 'DONE';
    const allowNewDetection = !isActivePhase && phase !== 'ABORT';

    // 3. BASELINE ESTABLISHMENT PHASE
    if (!this.state.baselineEstablished) {
      if (this.state.startTime === null) {
        this.state.startTime = now;
        this.state.baselineSamples = [];
        this.state.baselineStatus = 'Collecting baseline...';
        console.log('[Detector] 📊 Starting baseline collection (10 seconds)');
      }

      // Collect samples for baseline
      this.state.baselineSamples.push(current);
      this.state.lastSampleTs = now;

      // Check if baseline time has elapsed
      const elapsed = now - this.state.startTime;
      const remaining = Math.max(0, BASELINE_TIME_MS - elapsed);
      
      if (remaining > 0) {
        const secondsRemaining = Math.ceil(remaining / 1000);
        this.state.baselineStatus = `Collecting baseline... ${secondsRemaining}s`;
        return null;
      }

      // Calculate median baseline
      if (this.state.baselineSamples.length > 0) {
        const medianBaseline = this.getMedian(this.state.baselineSamples);
        
        // Validate baseline is in reasonable range
        if (medianBaseline >= BASELINE_MIN && medianBaseline <= BASELINE_MAX) {
          // Check spread (p95 - p5)
          const p5 = this.getPercentile(this.state.baselineSamples, 5);
          const p95 = this.getPercentile(this.state.baselineSamples, 95);
          const spread = p95 - p5;

          if (spread <= BASELINE_SPREAD_TOLERANCE) {
            this.state.frozenBaseline = medianBaseline;
            this.state.baselineEstablished = true;
            this.state.baselineEstablishedTime = now;
            this.state.lastRecalibrationTime = now;
            this.state.baselineStatus = 'Baseline established';
            console.log(`[Detector] ✅ Baseline established: ${medianBaseline.toFixed(2)}mA (spread: ${spread.toFixed(2)}mA)`);
          } else {
            console.log(`[Detector] ⚠️ Baseline spread too large: ${spread.toFixed(2)}mA (max: ${BASELINE_SPREAD_TOLERANCE}mA) - resetting`);
            this.state.startTime = null;
            this.state.baselineSamples = [];
            return null;
          }
        } else {
          console.log(`[Detector] ⚠️ Baseline out of range: ${medianBaseline.toFixed(2)}mA - resetting`);
          this.state.startTime = null;
          this.state.baselineSamples = [];
          return null;
        }
      }

      return null; // No detection yet
    }

    // 4. ARMING DELAY
    if (this.state.baselineEstablishedTime !== null) {
      const timeSinceBaseline = now - this.state.baselineEstablishedTime;
      if (timeSinceBaseline < ARMING_DELAY_MS) {
        const remaining = Math.ceil((ARMING_DELAY_MS - timeSinceBaseline) / 1000);
        this.state.baselineStatus = `Arming... ${remaining}s`;
        return null;
      }
    }

    // Update last sample timestamp and value
    this.state.lastSampleTs = now;
    this.state.lastSampleValue = current;

    // 5. ADAPTIVE BASELINE RECALIBRATION
    // Only when NOT detected and NOT in blocked phases
    if (!this.state.isHeating && this.state.frozenBaseline !== null && allowNewDetection) {
      // Collect idle samples
      this.state.idleSamples.push({ value: current, timestamp: now });
      
      // Remove samples older than RECALIBRATION_IDLE_WINDOW_MS
      const cutoffTime = now - RECALIBRATION_IDLE_WINDOW_MS;
      this.state.idleSamples = this.state.idleSamples.filter(s => s.timestamp >= cutoffTime);

      // Check if it's time for recalibration
      if (this.state.lastRecalibrationTime !== null && 
          (now - this.state.lastRecalibrationTime >= RECALIBRATION_INTERVAL_MS)) {
        
        if (this.state.idleSamples.length > 0) {
          // Calculate expected samples (based on sampling rate)
          const windowDuration = Math.min(RECALIBRATION_IDLE_WINDOW_MS, now - (this.state.idleSamples[0]?.timestamp || now));
          const expectedSamples = Math.floor(windowDuration / 100); // Assuming ~100Hz (10ms per sample)
          
          // Adaptive sample count
          const adaptiveCount = Math.max(
            ABSOLUTE_MIN_SAMPLES,
            Math.floor(expectedSamples * ADAPTIVE_MIN_PERCENTAGE)
          );

          if (this.state.idleSamples.length >= adaptiveCount) {
            // Use last N samples for recalibration
            const recentSamples = this.state.idleSamples
              .slice(-adaptiveCount)
              .map(s => s.value);
            
            const newBaseline = this.getMedian(recentSamples);
            
            // Validate new baseline
            if (newBaseline >= BASELINE_MIN && newBaseline <= BASELINE_MAX) {
              const p5 = this.getPercentile(recentSamples, 5);
              const p95 = this.getPercentile(recentSamples, 95);
              const spread = p95 - p5;

              if (spread <= BASELINE_SPREAD_TOLERANCE) {
                const oldBaseline = this.state.frozenBaseline;
                this.state.frozenBaseline = newBaseline;
                this.state.lastRecalibrationTime = now;
                console.log(`[Detector] 🔄 Baseline recalibrated: ${oldBaseline.toFixed(2)}mA → ${newBaseline.toFixed(2)}mA (${recentSamples.length} samples)`);
              }
            }
          }
        }

        this.state.lastRecalibrationTime = now;
      }
    }

    // 6. CALCULATE DELTA
    if (this.state.frozenBaseline === null) {
      return null;
    }

    const currentDelta = current - this.state.frozenBaseline;

    // 7. DETECTION LOGIC (NEW DETECTION - Only when allowed)
    if (allowNewDetection && !this.state.isHeating) {
      // Range check: currentDelta <= -DETECTION_THRESHOLD && >= -MAX_DETECTION_THRESHOLD
      const meetsThreshold = currentDelta <= -DETECTION_THRESHOLD_MA && 
                             currentDelta >= -MAX_DETECTION_THRESHOLD_MA;

      if (meetsThreshold) {
        this.state.consecutiveBelowThreshold++;

        if (this.state.consecutiveBelowThreshold >= CONSECUTIVE_SAMPLES) {
          if (this.state.triggerStartTime === null) {
            this.state.triggerStartTime = now;
          }

          const triggerDuration = now - this.state.triggerStartTime;
          if (triggerDuration >= DEBOUNCE_MS) {
            // Double-check phase hasn't changed
            const currentPhaseCheck = this.getPhase();
            if (currentPhaseCheck === 'COOLDOWN' || currentPhaseCheck === 'HEATUP' || 
                currentPhaseCheck === 'TREATMENT' || currentPhaseCheck === 'DONE') {
              console.log(`[Detector] ⛔ START blocked - phase changed to ${currentPhaseCheck}`);
              this.state.triggerStartTime = null;
              this.state.consecutiveBelowThreshold = 0;
              return null;
            }

            this.state.isHeating = true;
            this.state.triggerStartTime = null;
            this.state.consecutiveBelowThreshold = 0;

            console.log(`[Detector] 🔴 START_HEAT! Delta: ${currentDelta.toFixed(0)}mA`);

            // Emit START_HEAT event
            const event: DetectorEvent = {
              type: 'START_HEAT',
              tMillis: now,
              delta_mA: currentDelta,
            };

            this.emitEvent(event);
            return event;
          }
        }
      } else {
        // Reset counters if threshold not met
        this.state.triggerStartTime = null;
        this.state.consecutiveBelowThreshold = 0;
      }
    }

    // 8. RELEASE/ABORT LOGIC (END_HEAT - Works even during active phases!)
    // CRITICAL: This must work during HEATUP/TREATMENT to detect unplug
    if (this.state.isHeating) {
      // Check if current returned to baseline (device unplugged or released)
      if (currentDelta > -RELEASE_THRESHOLD_MA) {
        // Start or continue release timer
        if (this.state.releaseStartTime === null) {
          this.state.releaseStartTime = now;
        }

        const releaseDuration = now - this.state.releaseStartTime;
        if (releaseDuration >= DEBOUNCE_MS) {
          this.state.isHeating = false;
          this.state.releaseStartTime = null;
          this.state.consecutiveBelowThreshold = 0;

          console.log(`[Detector] ⚪ END_HEAT! Delta: ${currentDelta.toFixed(0)}mA`);

          // Emit END_HEAT event (triggers abort screen during active phases)
          const event: DetectorEvent = {
            type: 'END_HEAT',
            tMillis: now,
            delta_mA: currentDelta,
          };

          this.emitEvent(event);

          // If during active phase, this END_HEAT will trigger abort
          // UI (HeatingScreen/TreatmentScreen) will handle navigation to AbortedScreen

          return event;
        }
      } else {
        // Reset release timer if still below threshold (device still pressed)
        this.state.releaseStartTime = null;
      }
    }

    return null;
  }

  private emitEvent(event: DetectorEvent) {
    this.listeners.forEach(listener => listener(event));
  }

  subscribe(handler: (event: DetectorEvent) => void): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  reset() {
    this.state = {
      buffer: [],
      anchor_mA: null,
      anchorTime: null,
      isHeating: false,
      isVerifying: false,
      verifyCount: 0,
      sampleCount: 0,
      frozenBaseline: null,
      baselineEstablished: false,
      startTime: null,
      baselineEstablishedTime: null,
      lastRecalibrationTime: null,
      idleSamples: [],
      lastSampleTs: null,
      lastSampleValue: null,
      triggerStartTime: null,
      releaseStartTime: null,
      consecutiveBelowThreshold: 0,
      baselineStatus: 'Initializing...',
      baselineSamples: [],
    };
  }
  
  getSnapshot() {
    // Calculate last delta from the most recent sample
    let lastDelta = 0;
    if (this.state.frozenBaseline !== null && this.state.lastSampleValue !== null) {
      lastDelta = this.state.lastSampleValue - this.state.frozenBaseline;
    }
    
    return {
      baseline_mA: this.state.frozenBaseline || 0,
      filtered_mA: 0,
      lastDelta_mA: lastDelta,
      isHeating: this.state.isHeating,
    };
  }
}
