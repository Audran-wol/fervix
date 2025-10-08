/**
 * Synthetic current traces for simulator
 * Represents realistic device behavior: idle → heating spike → idle with noise
 */

export interface TraceSample {
  t: number;    // Time in milliseconds from start
  mA: number;   // Current in milliamps (negative = discharge)
}

/**
 * Baseline trace: idle state with small random fluctuations
 * Simulates device plugged in but not heating
 */
const idleTrace = (durationMs: number, startT: number = 0): TraceSample[] => {
  const samples: TraceSample[] = [];
  const sampleInterval = 80; // Match DETECTOR_CONFIG.sampleMs
  
  for (let t = startT; t < startT + durationMs; t += sampleInterval) {
    // Idle current: 10-50 mA with random noise
    const baseline = 30;
    const noise = (Math.random() - 0.5) * 20;
    samples.push({ t, mA: baseline + noise });
  }
  
  return samples;
};

/**
 * Heating trace: sharp drop to -420mA representing active heating
 */
const heatingTrace = (durationMs: number, startT: number): TraceSample[] => {
  const samples: TraceSample[] = [];
  const sampleInterval = 80;
  
  for (let t = startT; t < startT + durationMs; t += sampleInterval) {
    // Heating current: -400 to -440 mA with small noise
    const heatingLevel = -420;
    const noise = (Math.random() - 0.5) * 40;
    samples.push({ t, mA: heatingLevel + noise });
  }
  
  return samples;
};

/**
 * False blip: brief spike that should be filtered out by debounce
 */
const falseBlipTrace = (startT: number): TraceSample[] => {
  const samples: TraceSample[] = [];
  const sampleInterval = 80;
  
  // 3 samples of brief spike (240ms total - less than debounce)
  for (let i = 0; i < 3; i++) {
    samples.push({ 
      t: startT + (i * sampleInterval), 
      mA: -350 + (Math.random() - 0.5) * 50 
    });
  }
  
  return samples;
};

/**
 * Complete trace: idle → heat → idle with false blip
 * Simulates full treatment cycle
 */
export const generateFullTrace = (): TraceSample[] => {
  const trace: TraceSample[] = [];
  
  // 1. Initial idle (2 seconds)
  trace.push(...idleTrace(2000, 0));
  
  // 2. First heating phase (15 seconds) - triggers START_HEAT
  trace.push(...heatingTrace(15000, 2000));
  
  // 3. Brief return to idle (1 second) - simulates between phases
  trace.push(...idleTrace(1000, 17000));
  
  // 4. Treatment phase heating (20 seconds)
  trace.push(...heatingTrace(20000, 18000));
  
  // 5. Return to idle (2 seconds)
  trace.push(...idleTrace(2000, 38000));
  
  // 6. False blip (should be ignored by debounce)
  trace.push(...falseBlipTrace(40000));
  
  // 7. Continue idle (3 seconds)
  trace.push(...idleTrace(3000, 40240));
  
  // 8. Cooldown phase (10 seconds) - can be heating or idle depending on device
  trace.push(...idleTrace(10000, 43240));
  
  // 9. Final idle (5 seconds)
  trace.push(...idleTrace(5000, 53240));
  
  return trace;
};

/**
 * Simple trace for quick testing: idle → heat → idle
 */
export const generateSimpleTrace = (): TraceSample[] => {
  const trace: TraceSample[] = [];
  
  // Initial idle (1 second)
  trace.push(...idleTrace(1000, 0));
  
  // Heating (3 seconds)
  trace.push(...heatingTrace(3000, 1000));
  
  // Final idle (1 second)
  trace.push(...idleTrace(1000, 4000));
  
  return trace;
};

/**
 * Get trace by name
 */
export const getTrace = (name: 'full' | 'simple' = 'full'): TraceSample[] => {
  return name === 'full' ? generateFullTrace() : generateSimpleTrace();
};

