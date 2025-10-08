/**
 * Current detection algorithm
 * IIR low-pass filter with baseline tracking, hysteresis, and debounce
 */

import { DETECTOR_CONFIG } from './contracts';
import type { DetectorEvent, SampleEvent } from './contracts';

interface DetectorState {
  baseline_mA: number;      // Slow-moving baseline (beta filter)
  filtered_mA: number;      // Fast-tracking filtered value (alpha filter)
  lastDelta_mA: number;     // Current delta from baseline
  isHeating: boolean;       // Current heating state
  startCandidateT?: number; // Timestamp of potential start
  endCandidateT?: number;   // Timestamp of potential end
}

export class CurrentDetector {
  private state: DetectorState;
  private config = DETECTOR_CONFIG;
  private listeners: Array<(event: DetectorEvent) => void> = [];

  constructor() {
    this.state = {
      baseline_mA: 0,
      filtered_mA: 0,
      lastDelta_mA: 0,
      isHeating: false,
    };
  }

  /**
   * Process a new current sample
   * Returns detector event if threshold crossed
   */
  processSample(sample: SampleEvent): DetectorEvent | null {
    const { tMillis, current_mA } = sample;

    // Initialize filters on first sample
    if (this.state.baseline_mA === 0 && this.state.filtered_mA === 0) {
      this.state.baseline_mA = current_mA;
      this.state.filtered_mA = current_mA;
      return null;
    }

    // IIR filters
    // Fast filter (alpha) - tracks current changes quickly
    this.state.filtered_mA = 
      this.config.alpha * current_mA + 
      (1 - this.config.alpha) * this.state.filtered_mA;

    // Baseline filter (beta) - slow moving baseline
    this.state.baseline_mA = 
      this.config.beta * current_mA + 
      (1 - this.config.beta) * this.state.baseline_mA;

    // Calculate delta (negative delta = discharge/heating)
    const delta_mA = this.state.filtered_mA - this.state.baseline_mA;
    this.state.lastDelta_mA = delta_mA;

    // State machine with hysteresis and debouncing
    let event: DetectorEvent | null = null;

    if (!this.state.isHeating) {
      // Looking for START condition: delta drops below -thStart
      if (delta_mA < -this.config.thStart) {
        if (!this.state.startCandidateT) {
          // First time below threshold - start debounce timer
          this.state.startCandidateT = tMillis;
        } else if (tMillis - this.state.startCandidateT >= this.config.startDebounceMs) {
          // Debounce passed - confirm start
          this.state.isHeating = true;
          this.state.startCandidateT = undefined;
          this.state.endCandidateT = undefined;
          
          event = {
            type: 'START_HEAT',
            tMillis,
            delta_mA,
          };
        }
      } else {
        // Delta rose back above threshold - reset debounce
        this.state.startCandidateT = undefined;
      }
    } else {
      // Looking for END condition: delta rises above -thEnd
      if (delta_mA > -this.config.thEnd) {
        if (!this.state.endCandidateT) {
          // First time above threshold - start debounce timer
          this.state.endCandidateT = tMillis;
        } else if (tMillis - this.state.endCandidateT >= this.config.endDebounceMs) {
          // Debounce passed - confirm end
          this.state.isHeating = false;
          this.state.endCandidateT = undefined;
          this.state.startCandidateT = undefined;
          
          event = {
            type: 'END_HEAT',
            tMillis,
            delta_mA,
          };
        }
      } else {
        // Delta dropped back below threshold - reset debounce
        this.state.endCandidateT = undefined;
      }
    }

    // Emit event if state changed
    if (event) {
      this.emitEvent(event);
    }

    return event;
  }

  /**
   * Subscribe to detector events
   */
  subscribe(handler: (event: DetectorEvent) => void): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  /**
   * Get current detector state snapshot
   */
  getSnapshot() {
    return {
      baseline_mA: this.state.baseline_mA,
      filtered_mA: this.state.filtered_mA,
      lastDelta_mA: this.state.lastDelta_mA,
      isHeating: this.state.isHeating,
    };
  }

  /**
   * Reset detector state (for new session)
   */
  reset() {
    this.state = {
      baseline_mA: 0,
      filtered_mA: 0,
      lastDelta_mA: 0,
      isHeating: false,
    };
  }

  private emitEvent(event: DetectorEvent) {
    this.listeners.forEach(handler => handler(event));
  }
}

