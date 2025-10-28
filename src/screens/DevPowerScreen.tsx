/**
 * Development/QA screen for power monitoring
 * - Adds a simple "Calibrate & Measure (5s + 10s)" flow under the Samples card.
 * - Uses existing live samples; no new native events required.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PowerController, USE_POWER_SIM } from '../state/power';
import type { SampleEvent, Phase, RecalibrationEvent } from '../state/power';
import { useSessionStore } from '../state';
import { useTheme } from '../theme/useTheme';

type CalState = 'IDLE' | 'BASELINE' | 'BASELINE_DONE' | 'MEASURE' | 'DONE';

export const DevPowerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { profile } = useSessionStore();

  const [currentPhase, setCurrentPhase] = useState<Phase>('IDLE');
  const [baseline_mA, setBaseline_mA] = useState<number>(0);
  const [lastDelta_mA, setLastDelta_mA] = useState<number>(0);

  const [samples, setSamples] = useState<SampleEvent[]>([]);
  const [deviceDetectionThreshold, setDeviceDetectionThreshold] = useState<number>(260);
  const [deviceDetected, setDeviceDetected] = useState<boolean>(false);

  // ---- Calibration / Measurement states ----
  const [calState, setCalState] = useState<CalState>('IDLE');
  const [countdownMs, setCountdownMs] = useState<number>(0);
  const [savedBaseline_mA, setSavedBaseline_mA] = useState<number | undefined>(undefined);
  const [savedDeviceCurrent_mA, setSavedDeviceCurrent_mA] = useState<number | undefined>(undefined);
  const [calculatedDrainage_mA, setCalculatedDrainage_mA] = useState<number | undefined>(undefined);

  const measureSamplesRef = useRef<number[]>([]);
  const calTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tickerRef = useRef<NodeJS.Timeout | null>(null);

  const BASELINE_MS = 8000; // 8s to build baseline
  const MEASURE_MS  = 20000; // 20s to record device current
  const MIN_SAMPLES = 12;

  // Derived stats
  const [drawAvg_mA, setDrawAvg_mA] = useState<number | undefined>(undefined);
  const [drawMin_mA, setDrawMin_mA] = useState<number | undefined>(undefined);
  const [drawMax_mA, setDrawMax_mA] = useState<number | undefined>(undefined);
  const [drawStd_mA, setDrawStd_mA] = useState<number | undefined>(undefined);
  const [calSaved_mA, setCalSaved_mA] = useState<number | undefined>(undefined);

  // Refs to hold latest values for use in subscriber callbacks
  const thresholdRef = useRef(deviceDetectionThreshold);
  const baselineRef = useRef(0);

  // Utils
  const fmt = (n: any, d = 3) => Number.isFinite(n) ? Number(n).toFixed(d) : '--';
  const stats = (xs: number[]) => {
    if (!xs.length) return { avg: 0, min: 0, max: 0, std: 0 };
    const n = xs.length;
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const avg = xs.reduce((a,b)=>a+b,0) / n;
    const std = Math.sqrt(xs.reduce((a,b)=>a + (b-avg)*(b-avg),0) / n);
    return { avg, min, max, std };
  };

  // Keep refs up-to-date when state changes
  useEffect(() => {
    thresholdRef.current = deviceDetectionThreshold;
    // Push to native each time threshold changes
    try { PowerController.setDeviceDetectionThreshold(deviceDetectionThreshold); } catch {}
    console.log(`[DevPowerScreen] Threshold updated to: ${deviceDetectionThreshold}mA`);
  }, [deviceDetectionThreshold]);

  useEffect(() => {
    baselineRef.current = baseline_mA;
  }, [baseline_mA]);

  // Expose getter method for HomeScreen to sync
  useEffect(() => {
    (window as any).getDevPowerScreenThreshold = () => deviceDetectionThreshold;
    return () => { delete (window as any).getDevPowerScreenThreshold; };
  }, [deviceDetectionThreshold]);

  const maxSamples = 120;

  // Delta magnitude (direction-agnostic)
  const deltaMag = (current: number, baseline: number) =>
    Math.abs((current ?? 0) - (baseline ?? 0));

  // Subscribe & control
  useEffect(() => {
    console.log('[DevPowerScreen] Setting up subscriptions and auto-starting session');

    PowerController.startSession({ presetId: profile });
    
    // Subscribe to Recalibration events for periodic updates
    const unsubRecalibration = PowerController.subscribe('Recalibration', (event: RecalibrationEvent) => {
      console.log('[DevPowerScreen] 🔄 Recalibration event:', event);
      if (event.type === 'PERIODIC_UPDATE') {
        console.log(`[DevPowerScreen] 🔄 Periodic recalibration: baseline ${event.oldBaseline.toFixed(1)}mA → ${event.newBaseline.toFixed(1)}mA`);
        console.log(`[DevPowerScreen] 🔄 Thresholds updated: start ${event.oldStartThreshold.toFixed(1)}mA → ${event.newStartThreshold.toFixed(1)}mA, end ${event.oldEndThreshold.toFixed(1)}mA → ${event.newEndThreshold.toFixed(1)}mA`);
        
        // Update local threshold state to reflect changes
        setDeviceDetectionThreshold(event.newStartThreshold);
      }
    });

    const unsubSample = PowerController.subscribe('Sample', (event: SampleEvent) => {
      const cur = Number.isFinite(event.current_mA) ? event.current_mA : undefined;
      const incomingBaseline = Number.isFinite(event.baseline_current) ? event.baseline_current : undefined;

      if (incomingBaseline !== undefined) setBaseline_mA(incomingBaseline);

      const baseline = incomingBaseline ?? baselineRef.current;
      if (cur !== undefined && Number.isFinite(baseline)) {
        const d = cur - baseline;
        setLastDelta_mA(d);

        // Simple live "connected" check for UI color (doesn't drive phases)
        const thr = thresholdRef.current;
        setDeviceDetected(deltaMag(cur, baseline) >= Math.abs(thr));

        // If in MEASURE, collect actual current values (not deltas)
        if (calState === 'MEASURE') {
          if (Number.isFinite(cur)) {
            measureSamplesRef.current.push(cur);
            // keep bounded
            if (measureSamplesRef.current.length > 600) measureSamplesRef.current.shift();

            const { avg, min, max, std } = stats(measureSamplesRef.current);
            setDrawAvg_mA(avg);
            setDrawMin_mA(min);
            setDrawMax_mA(max);
            setDrawStd_mA(std);
          }
        }
      }

      // Keep samples for UI
      setSamples(prev => [...prev.slice(-maxSamples + 1), {
        current_mA: cur,
        voltage_V: Number.isFinite(event.voltage_V) ? event.voltage_V : undefined,
        power_W: Number.isFinite(event.power_W) ? event.power_W : undefined,
        battery_level: Number.isFinite(event.battery_level) ? event.battery_level : undefined,
        charging_status: typeof event.charging_status === 'string' ? event.charging_status : 'Unknown',
        is_charging: !!event.is_charging,
        device_detected: typeof event.device_detected === 'boolean' ? event.device_detected : undefined,
        baseline_current: incomingBaseline,
        timestamp: event.timestamp || new Date().toISOString(),
      }]);
    });

    const unsubPhase = PowerController.subscribe('PhaseChanged', (event) => {
      setCurrentPhase(event.phase);
    });

    // Snapshot pull (optional)
    const interval = setInterval(() => {
      try {
      const snapshot = PowerController.getSnapshot();
      setCurrentPhase(snapshot.phase);
        if (Number.isFinite(snapshot.baseline_mA)) setBaseline_mA(snapshot.baseline_mA!);
        if (Number.isFinite(snapshot.lastDelta_mA)) setLastDelta_mA(snapshot.lastDelta_mA!);
      } catch {}
    }, 500);

    return () => {
      unsubSample();
      unsubPhase();
      unsubRecalibration();
      clearInterval(interval);
      PowerController.stopSession();
      if (calTimerRef.current) clearTimeout(calTimerRef.current);
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [profile]);

  // Controls
  const handleStopSim = () => PowerController.stopSession();
  const handleClearData = () => setSamples([]);

  // ---- Phase 1: Start Baseline Measurement (8s) ----
  const startBaselineMeasurement = async () => {
    // Reset any previous timers/state
    if (calTimerRef.current) clearTimeout(calTimerRef.current);
    if (tickerRef.current) clearInterval(tickerRef.current);
    measureSamplesRef.current = [];
    setDrawAvg_mA(undefined);
    setDrawMin_mA(undefined);
    setDrawMax_mA(undefined);
    setDrawStd_mA(undefined);
    setCalSaved_mA(undefined);
    setSavedBaseline_mA(undefined);

    // Restart native session to get a clean run
    try { PowerController.stopSession(); } catch {}
    try { await PowerController.startSession({ presetId: profile }); } catch {}

    // Ask native to reset baseline if available
    try { 
      // @ts-ignore - resetBaseline might not be in types yet
      if (PowerController.resetBaseline) {
        // @ts-ignore
        await PowerController.resetBaseline(); 
      }
    } catch (e) {
      console.log('[DevPowerScreen] ResetBaseline not available or failed:', e);
    }

    // Phase 1: BASELINE (8s)
    console.log('[DevPowerScreen] Starting BASELINE phase, countdown:', BASELINE_MS);
    setCalState('BASELINE');
    setCountdownMs(BASELINE_MS);
    tickerRef.current = setInterval(() => {
      setCountdownMs(ms => {
        const newMs = Math.max(0, ms - 100);
        if (newMs % 1000 === 0) { // Log every second
          console.log('[DevPowerScreen] Baseline countdown:', newMs, 'ms');
        }
        return newMs;
      });
    }, 100);

    calTimerRef.current = setTimeout(() => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      console.log('[DevPowerScreen] Baseline measurement complete');
      setCalState('BASELINE_DONE');
      setCountdownMs(0);
    }, BASELINE_MS);
  };

  // ---- Phase 2: Start Device Drainage Measurement (15s) ----
  const startDeviceMeasurement = () => {
    // Validation: Must have saved baseline first
    if (savedBaseline_mA === undefined) {
      console.warn('[DevPowerScreen] Cannot start device measurement without saved baseline!');
      return;
    }

    // Reset measurement samples
    measureSamplesRef.current = [];
    setDrawAvg_mA(undefined);
    setDrawMin_mA(undefined);
    setDrawMax_mA(undefined);
    setDrawStd_mA(undefined);
    setCalSaved_mA(undefined);

    // Phase 2: MEASURE (20s) – device should be plugged now
    console.log('[DevPowerScreen] Starting DEVICE MEASUREMENT phase, countdown:', MEASURE_MS);
    setCalState('MEASURE');
    setCountdownMs(MEASURE_MS);
    tickerRef.current = setInterval(() => {
      setCountdownMs(ms => {
        const newMs = Math.max(0, ms - 100);
        if (newMs % 1000 === 0) { // Log every second
          console.log('[DevPowerScreen] Device measurement countdown:', newMs, 'ms');
        }
        return newMs;
      });
    }, 100);

    calTimerRef.current = setTimeout(() => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      
      // Compute final stats
      const xs = measureSamplesRef.current.slice();
      const { avg, min, max, std } = stats(xs);
      
      // Calculate actual device drainage based on saved baseline
      if (xs.length && savedBaseline_mA !== undefined) {
        const deviceCurrent = avg; // Average current during device measurement
        const drainage = Math.abs(deviceCurrent - savedBaseline_mA); // Absolute difference
        
        setSavedDeviceCurrent_mA(deviceCurrent);
        setCalculatedDrainage_mA(drainage);
        
        console.log('[DevPowerScreen] Device measurement complete.');
        console.log('[DevPowerScreen] Saved baseline:', savedBaseline_mA, 'mA');
        console.log('[DevPowerScreen] Device current:', deviceCurrent, 'mA');
        console.log('[DevPowerScreen] Calculated drainage:', drainage, 'mA');
      }
      
      setDrawAvg_mA(xs.length ? avg : undefined);
      setDrawMin_mA(xs.length ? min : undefined);
      setDrawMax_mA(xs.length ? max : undefined);
      setDrawStd_mA(xs.length ? std : undefined);
      
      setCalState('DONE');
      setCountdownMs(0);
    }, MEASURE_MS);
  };

  const saveBaseline = () => {
    if (Number.isFinite(baseline_mA)) {
      setSavedBaseline_mA(baseline_mA);
      console.log(`[DevPowerScreen] Saved baseline = ${baseline_mA.toFixed(0)}mA`);
    }
  };

  const saveCalibrationAndSuggestThreshold = () => {
    if (!drawAvg_mA) return;
    setCalSaved_mA(drawAvg_mA);
    
    // Calculate both thresholds based on measured device drainage
    const suggestedOn = Math.max(260, Math.round(drawAvg_mA - 50));
    const suggestedOff = Math.round(suggestedOn * 0.5); // 50% hysteresis
    
    // Update both thresholds
    setDeviceDetectionThreshold(suggestedOn);
    PowerController.setDeviceDetectionEndThreshold?.(suggestedOff);
    
    console.log(`[DevPowerScreen] Saved calibration = ${drawAvg_mA.toFixed(0)}mA`);
    console.log(`[DevPowerScreen] Set TH_start=${suggestedOn}mA, TH_end=${suggestedOff}mA`);
  };

  // Styles
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    header: {
      flexDirection: 'row', alignItems: 'center', padding: 16,
      borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    backButton: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
    modeBadge: { backgroundColor: USE_POWER_SIM ? '#10B981' : colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    modeBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    content: { flex: 1, padding: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
    card: {
      backgroundColor: colors.card, borderRadius: 12, padding: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    phaseText: { fontSize: 24, fontWeight: 'bold', color: colors.primary, textAlign: 'center' },
    dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
    dataLabel: { fontSize: 14, color: colors.textMuted },
    dataValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    button: { flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    buttonSecondary: { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
    buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    buttonTextSecondary: { color: colors.textPrimary },
    autoStartNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
    emptyText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic', paddingVertical: 20 },

    // New calibration bits
    calBadge: { marginTop: 8, padding: 10, borderRadius: 8, alignItems: 'center' },
    calBadgeText: { color: '#fff', fontWeight: '700' },
    calHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Power Monitor</Text>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{USE_POWER_SIM ? 'SIMULATOR' : 'NATIVE'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Phase */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Phase</Text>
          <View style={styles.card}><Text style={styles.phaseText}>{currentPhase}</Text></View>
        </View>

        {/* Snapshot Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detector Snapshot</Text>
          <View style={styles.card}>
            <View style={styles.dataRow}><Text style={styles.dataLabel}>Baseline (mA)</Text><Text style={styles.dataValue}>{fmt(baseline_mA, 2)}</Text></View>
            <View style={styles.dataRow}><Text style={styles.dataLabel}>Delta (mA)</Text><Text style={styles.dataValue}>{fmt(lastDelta_mA, 2)}</Text></View>
            <View style={styles.dataRow}><Text style={styles.dataLabel}>Profile</Text><Text style={styles.dataValue}>{profile}</Text></View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Controls</Text>
          <View style={styles.card}>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleStopSim}>
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Stop Session</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleClearData}>
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Clear Data</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.autoStartNote}>📡 Session auto-starts when screen loads</Text>
          </View>
        </View>

        {/* Samples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Samples ({samples.length}/{maxSamples})</Text>
          <View style={styles.card}>
            {samples.length === 0 ? (
              <Text style={styles.emptyText}>No samples yet</Text>
            ) : (
              <>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                  Current: {fmt(samples[samples.length - 1]?.current_mA, 3)} mA • Voltage: {fmt(samples[samples.length - 1]?.voltage_V, 3)} V • Power: {fmt((samples[samples.length - 1]?.power_W ?? NaN) * 1000, 3)} mW
                  </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                  Battery: {samples[samples.length - 1]?.battery_level || 0}% • Status: {samples[samples.length - 1]?.charging_status || 'Unknown'}
                  </Text>
              </>
            )}
          </View>

          {/* === NEW: Calibrate & Measure block (under Samples) === */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Calibrate & Measure (5s + 10s)</Text>

            {/* Status badge */}
            <View
              style={[
                styles.calBadge,
                {
                  backgroundColor:
                    calState === 'IDLE' ? '#6B7280' :
                    calState === 'BASELINE' ? '#3B82F6' :
                    calState === 'BASELINE_DONE' ? '#8B5CF6' :
                    calState === 'MEASURE' ? '#F59E0B' : '#10B981'
                }
              ]}
            >
              <Text style={styles.calBadgeText}>
                {calState === 'IDLE' && 'Ready'}
                {calState === 'BASELINE' && `Building Baseline… ${Math.ceil(countdownMs/1000)}s`}
                {calState === 'BASELINE_DONE' && 'Baseline Ready - Plug Device'}
                {calState === 'MEASURE' && `Measuring Device Draw… ${Math.ceil(countdownMs/1000)}s`}
                {calState === 'DONE' && 'Measurement Complete'}
                  </Text>
            </View>

            {/* Buttons based on state */}
            <View style={styles.buttonRow}>
              {calState === 'IDLE' && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={startBaselineMeasurement}
                >
                  <Text style={styles.buttonText}>📊 Start Baseline Measurement (8s)</Text>
                </TouchableOpacity>
              )}
              
              {calState === 'BASELINE_DONE' && (
                <>
                  <TouchableOpacity
                    style={[styles.button, { flex: 1, marginRight: 6 }]}
                    onPress={saveBaseline}
                  >
                    <Text style={styles.buttonText}>💾 Save Baseline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button, 
                      { flex: 1, marginLeft: 6 },
                      savedBaseline_mA === undefined ? styles.buttonSecondary : {}
                    ]}
                    onPress={startDeviceMeasurement}
                    disabled={savedBaseline_mA === undefined}
                  >
                    <Text style={[
                      styles.buttonText,
                      savedBaseline_mA === undefined ? styles.buttonTextSecondary : {}
                    ]}>
                      🔌 Measure Device (20s)
                  </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {(calState === 'BASELINE' || calState === 'MEASURE') && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  disabled={true}
                >
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                    {calState === 'BASELINE' ? 'Measuring Baseline...' : 'Measuring Device...'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {calState === 'DONE' && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    setCalState('IDLE');
                    setSavedBaseline_mA(undefined);
                    setSavedDeviceCurrent_mA(undefined);
                    setCalculatedDrainage_mA(undefined);
                    setDrawAvg_mA(undefined);
                    setDrawMin_mA(undefined);
                    setDrawMax_mA(undefined);
                    setDrawStd_mA(undefined);
                    setCalSaved_mA(undefined);
                    measureSamplesRef.current = [];
                  }}
                >
                  <Text style={styles.buttonText}>🔄 Start Over</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hints */}
            {calState === 'BASELINE' && (
              <Text style={styles.calHint}>Keep the phone idle. We're stabilizing baseline for 8 seconds…</Text>
            )}
            {calState === 'BASELINE_DONE' && (
              <Text style={styles.calHint}>Baseline measured! Now plug your device and press "Measure Device"</Text>
            )}
            {calState === 'MEASURE' && (
              <Text style={styles.calHint}>Device plugged? We're measuring its current draw for 20 seconds…</Text>
            )}

            {/* Results */}
            <View style={{ marginTop: 12 }}>
              {/* Baseline Results */}
              {savedBaseline_mA !== undefined && (
                <View style={[styles.dataRow, { backgroundColor: '#E3F2FD', padding: 8, borderRadius: 4, marginBottom: 8 }]}>
                  <Text style={[styles.dataLabel, { fontWeight: 'bold' }]}>📊 Saved Baseline</Text>
                  <Text style={[styles.dataValue, { fontWeight: 'bold', color: '#1976D2' }]}>{fmt(savedBaseline_mA, 1)} mA</Text>
                </View>
              )}
              
              {/* Device Drainage Results */}
              {calState === 'DONE' && calculatedDrainage_mA !== undefined && (
                <>
                  {/* Completion Message Banner */}
                  <View style={{ 
                    backgroundColor: '#10B981', 
                    padding: 12, 
                    borderRadius: 8, 
                    marginBottom: 12,
                    alignItems: 'center'
                  }}>
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 16, 
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      ✅ Measurement Complete!
                  </Text>
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 14, 
                      marginTop: 4,
                      textAlign: 'center'
                    }}>
                      Device drains {fmt(calculatedDrainage_mA, 0)} mA based on baseline of {fmt(savedBaseline_mA!, 1)} mA
                  </Text>
                  </View>

                  {/* Main Result: Calculated Drainage */}
                  <View style={[styles.dataRow, { backgroundColor: '#E8F5E8', padding: 8, borderRadius: 4, marginBottom: 8 }]}>
                    <Text style={[styles.dataLabel, { fontWeight: 'bold' }]}>🔌 Device Drainage</Text>
                    <Text style={[styles.dataValue, { fontWeight: 'bold', color: '#2E7D32' }]}>{fmt(calculatedDrainage_mA, 0)} mA</Text>
                  </View>
                  
                  {/* Baseline vs Device Current Comparison */}
                  <View style={[styles.dataRow, { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 4, marginBottom: 8 }]}>
                    <Text style={[styles.dataLabel, { fontWeight: 'bold' }]}>📊 Current Comparison</Text>
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.dataValue}>Baseline: {fmt(savedBaseline_mA!, 1)} mA</Text>
                      <Text style={styles.dataValue}>With Device: {fmt(savedDeviceCurrent_mA!, 1)} mA</Text>
                      <Text style={[styles.dataValue, { fontWeight: 'bold', color: '#2E7D32' }]}>
                        Difference: {fmt(calculatedDrainage_mA, 0)} mA
                  </Text>
                    </View>
                  </View>
                  
                  {/* Statistics */}
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Min / Max Δ (mA)</Text>
                    <Text style={styles.dataValue}>{drawMin_mA ? fmt(drawMin_mA,0) : '--'} / {drawMax_mA ? fmt(drawMax_mA,0) : '--'}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Stability σ (mA)</Text>
                    <Text style={styles.dataValue}>{drawStd_mA ? fmt(drawStd_mA,0) : '--'}</Text>
                </View>
              </>
              )}

              {/* Measurement Done but No Results */}
              {calState === 'DONE' && calculatedDrainage_mA === undefined && (
                <View style={{ backgroundColor: '#F8D7DA', padding: 12, borderRadius: 8, marginTop: 8 }}>
                  <Text style={{ color: '#721C24', fontWeight: 'bold', marginBottom: 4 }}>
                    ⚠️ Measurement Complete but No Results
                  </Text>
                  <Text style={{ color: '#721C24', fontSize: 12 }}>
                    • Make sure you saved the baseline first{'\n'}
                    • Ensure device is plugged in during measurement{'\n'}
                    • Check that samples were collected (debug info below)
                  </Text>
                </View>
              )}

              {/* Debug Info */}
              {calState === 'DONE' && (
                <View style={{ backgroundColor: '#FFF3CD', padding: 8, borderRadius: 4, marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: '#856404' }}>
                    DEBUG: calState={calState}, samples={measureSamplesRef.current.length}, 
                    baseline={savedBaseline_mA !== undefined ? 'saved' : 'missing'}, 
                    drainage={calculatedDrainage_mA !== undefined ? 'calculated' : 'missing'}
                  </Text>
                </View>
              )}

              {/* Live Stats (during measurement) */}
              {(calState === 'BASELINE' || calState === 'MEASURE') && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Current Baseline (mA)</Text>
                  <Text style={styles.dataValue}>{fmt(baseline_mA, 1)}</Text>
                </View>
              )}

              <View style={[styles.buttonRow, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[styles.button, (!drawAvg_mA || (measureSamplesRef.current.length < MIN_SAMPLES)) ? styles.buttonSecondary : {}]}
                  disabled={!drawAvg_mA || (measureSamplesRef.current.length < MIN_SAMPLES)}
                  onPress={saveCalibrationAndSuggestThreshold}
                >
                  <Text style={styles.buttonText}>Save Calibration & Apply TH_on</Text>
                </TouchableOpacity>
              </View>

              {calSaved_mA !== undefined && (
                <Text style={styles.calHint}>
                  Saved calibration: {fmt(calSaved_mA,0)} mA • Suggested TH_on applied (avg−50, min 260)
                </Text>
            )}
          </View>
          </View>
          {/* === END new block === */}
        </View>

        {/* Device Detection Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Detection Settings</Text>
          <View style={styles.card}>
            {/* Status pill */}
            <View style={{
              padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center',
                    backgroundColor: deviceDetected ? '#4CAF50' : '#FF9800'
            }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                      {deviceDetected ? '🔌 Device Connected - Ready for Heating' : '🔌 No Device'}
                    </Text>
                  </View>
              
            {/* Quick thresholds */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 }}>
              Detection Threshold: {fmt(deviceDetectionThreshold, 0)} mA
                </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[260,220,300].map(v => (
                      <TouchableOpacity
                  key={v}
                  style={{
                    flex: 1, padding: 12, borderRadius: 8,
                    backgroundColor: deviceDetectionThreshold === v ? colors.primary : colors.surface,
                    borderWidth: 1, borderColor: deviceDetectionThreshold === v ? colors.primary : (isDark ? '#374151' : '#E5E7EB'),
                    alignItems: 'center'
                  }}
                  onPress={() => setDeviceDetectionThreshold(v)}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: deviceDetectionThreshold === v ? '#fff' : colors.textPrimary }}>
                    {v}mA
                  </Text>
                      </TouchableOpacity>
              ))}
                </View>
                
            {/* Nudge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <TouchableOpacity
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setDeviceDetectionThreshold(v => Math.max(100, v - 10))}
              >
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>-</Text>
                        </TouchableOpacity>
                        
              <View style={{ minWidth: 80, padding: 12, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.textPrimary }}>
                  {fmt(deviceDetectionThreshold, 0)}mA
                          </Text>
                        </View>
                        
                        <TouchableOpacity
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setDeviceDetectionThreshold(v => Math.min(500, v + 10))}
              >
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>+</Text>
                        </TouchableOpacity>
              </View>
              
            {/* Baseline info */}
            <View style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 }}>
                  Baseline Current: {fmt(baseline_mA, 3)} mA
                </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Current drain from baseline: {fmt((samples[samples.length - 1]?.current_mA ?? NaN) - (baseline_mA ?? NaN), 3)} mA
                </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default DevPowerScreen;
