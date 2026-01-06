

/**
 * Device Signature Detection Hook
 * 
 * Learns the unique current signature of the Fervix device through calibration,
 * then uses pattern matching to detect device presses with high confidence.
 * 
 * This eliminates false positives from natural phone current variations.
 */

interface DeviceSignature {
  // Amplitude characteristics
  minAmplitude: number; // Minimum current drop in mA
  maxAmplitude: number; // Maximum current drop in mA
  avgAmplitude: number; // Average current drop in mA
  
  // Slope characteristics
  initialSlope: number; // Initial rapid drop rate (mA/sample)
  sustainedSlope: number; // Sustained drop rate (mA/sample)
  
  // Temporal characteristics
  riseTime: number; // Time to reach peak (ms)
  sustainedDuration: number; // How long peak is sustained (ms)
  
  // Shape characteristics
  smoothnessScore: number; // How smooth the curve is (0-1)
  
  // Calibration metadata
  sampleCount: number; // How many calibration samples collected
  confidence: number; // Confidence in learned signature (0-1)
}

interface CalibrationSample {
  amplitudes: number[];
  slopes: number[];
  durations: number[];
  riseTimes: number[];
}

interface DetectionResult {
  detected: boolean;
  confidence: number;
  reason: string;
}

const DEFAULT_SIGNATURE: DeviceSignature = {
  minAmplitude: 300,
  maxAmplitude: 500,
  avgAmplitude: 400,
  initialSlope: -30,
  sustainedSlope: -5,
  riseTime: 200,
  sustainedDuration: 500,
  smoothnessScore: 0.8,
  sampleCount: 0,
  confidence: 0,
};

export function useDeviceSignature() {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [signature, setSignature] = useState<DeviceSignature>(DEFAULT_SIGNATURE);
  const calibrationSamplesRef = useRef<CalibrationSample>({
    amplitudes: [],
    slopes: [],
    durations: [],
    riseTimes: [],
  });
  
  // Active detection state
  const detectionStartTimeRef = useRef<number | null>(null);
  const peakAmplitudeRef = useRef<number>(0);
  const initialSlopeRef = useRef<number>(0);
  
  /**
   * Start calibration mode - user will press device 3-5 times
   */
  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    calibrationSamplesRef.current = {
      amplitudes: [],
      slopes: [],
      durations: [],
      riseTimes: [],
    };
    console.log('[DeviceSignature] 🎯 Calibration started - press device 3-5 times');
  }, []);
  
  /**
   * Record a calibration press
   */
  const recordCalibrationPress = useCallback((
    amplitude: number,
    slope: number,
    duration: number,
    riseTime: number
  ) => {
    calibrationSamplesRef.current.amplitudes.push(amplitude);
    calibrationSamplesRef.current.slopes.push(slope);
    calibrationSamplesRef.current.durations.push(duration);
    calibrationSamplesRef.current.riseTimes.push(riseTime);
    
    const count = calibrationSamplesRef.current.amplitudes.length;
    console.log(`[DeviceSignature] 📊 Calibration sample ${count}: amp=${amplitude.toFixed(1)}mA slope=${slope.toFixed(1)}mA/s`);
    
    if (count >= 3) {
      // Enough samples - calculate signature
      finishCalibration();
    }
  }, []);
  
  /**
   * Finish calibration and calculate device signature
   */
  const finishCalibration = useCallback(() => {
    const samples = calibrationSamplesRef.current;
    
    if (samples.amplitudes.length < 3) {
      console.log('[DeviceSignature] ❌ Not enough calibration samples');
      return;
    }
    
    // Calculate statistics
    const avgAmp = samples.amplitudes.reduce((a, b) => a + b, 0) / samples.amplitudes.length;
    const minAmp = Math.min(...samples.amplitudes);
    const maxAmp = Math.max(...samples.amplitudes);
    const avgSlope = samples.slopes.reduce((a, b) => a + b, 0) / samples.slopes.length;
    const avgDuration = samples.durations.reduce((a, b) => a + b, 0) / samples.durations.length;
    const avgRiseTime = samples.riseTimes.reduce((a, b) => a + b, 0) / samples.riseTimes.length;
    
    // Calculate variance (for smoothness/consistency)
    const ampVariance = samples.amplitudes.reduce((sum, x) => sum + Math.pow(x - avgAmp, 2), 0) / samples.amplitudes.length;
    const ampStdDev = Math.sqrt(ampVariance);
    const consistencyScore = 1 - Math.min(ampStdDev / avgAmp, 1); // Higher = more consistent
    
    const newSignature: DeviceSignature = {
      minAmplitude: Math.max(minAmp - 50, 200), // Add 50mA margin below
      maxAmplitude: Math.min(maxAmp + 50, 800), // Add 50mA margin above
      avgAmplitude: avgAmp,
      initialSlope: avgSlope * 0.7, // 70% of average slope (margin for variation)
      sustainedSlope: avgSlope * 0.3, // Sustained rate is lower
      riseTime: avgRiseTime,
      sustainedDuration: avgDuration,
      smoothnessScore: consistencyScore,
      sampleCount: samples.amplitudes.length,
      confidence: Math.min(consistencyScore * samples.amplitudes.length / 5, 1), // Max confidence at 5 samples
    };
    
    setSignature(newSignature);
    setIsCalibrating(false);
    
    console.log('[DeviceSignature] ✅ Calibration complete!');
    console.log(`  📊 Amplitude: ${minAmp.toFixed(1)}-${maxAmp.toFixed(1)}mA (avg: ${avgAmp.toFixed(1)}mA)`);
    console.log(`  📊 Slope: ${avgSlope.toFixed(1)}mA/sample`);
    console.log(`  📊 Confidence: ${(newSignature.confidence * 100).toFixed(0)}%`);
  }, []);
  
  /**
   * Check if current behavior matches device signature
   */
  const matchesSignature = useCallback((
    currentDelta: number, // in mA
    currentSlope: number, // in mA/sample
    sustainedTime: number // in ms
  ): DetectionResult => {
    if (signature.confidence < 0.5) {
      // Not calibrated yet - use default thresholds
      const detected = (
        Math.abs(currentDelta) >= 350 && // 350mA from spec
        currentSlope < -20 && // Rapid drop
        sustainedTime >= 300 // Sustained for 300ms
      );
      
      return {
        detected,
        confidence: detected ? 0.5 : 0,
        reason: detected ? 'Default threshold (not calibrated)' : 'Below default threshold',
      };
    }
    
    // Calculate confidence score based on how well it matches signature
    let confidenceScore = 0;
    const weights = {
      amplitude: 0.4,
      slope: 0.3,
      duration: 0.2,
      smoothness: 0.1,
    };
    
    // Amplitude match (most important)
    const ampDelta = Math.abs(currentDelta);
    if (ampDelta >= signature.minAmplitude && ampDelta <= signature.maxAmplitude) {
      // Perfect match
      confidenceScore += weights.amplitude;
    } else if (ampDelta >= signature.minAmplitude * 0.8) {
      // Partial match (80% of minimum)
      confidenceScore += weights.amplitude * 0.5;
    }
    
    // Slope match
    if (currentSlope <= signature.initialSlope) {
      // Rapid drop detected
      confidenceScore += weights.slope;
    } else if (currentSlope <= signature.sustainedSlope) {
      // Slower sustained drop
      confidenceScore += weights.slope * 0.5;
    }
    
    // Duration match
    if (sustainedTime >= signature.sustainedDuration) {
      confidenceScore += weights.duration;
    } else if (sustainedTime >= signature.sustainedDuration * 0.5) {
      confidenceScore += weights.duration * 0.5;
    }
    
    // Smoothness (consistent behavior)
    confidenceScore += weights.smoothness * signature.smoothnessScore;
    
    const detected = confidenceScore >= 0.70; // 70% confidence threshold
    
    return {
      detected,
      confidence: confidenceScore,
      reason: detected 
        ? `Pattern matched (${(confidenceScore * 100).toFixed(0)}% confidence)` 
        : `Pattern mismatch (${(confidenceScore * 100).toFixed(0)}% confidence - need 70%)`,
    };
  }, [signature]);
  
  return {
    signature,
    isCalibrating,
    startCalibration,
    recordCalibrationPress,
    finishCalibration,
    matchesSignature,
  };
}

