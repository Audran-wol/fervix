/**
 * Development/QA screen for power monitoring
 * Visualizes samples, detector events, and phase transitions
 * Only available in __DEV__ mode
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
import type { SampleEvent, DetectorEvent, Phase } from '../state/power';
import { useSessionStore } from '../state';
import { useTheme } from '../theme/useTheme';

export const DevPowerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { profile } = useSessionStore();

  const [currentPhase, setCurrentPhase] = useState<Phase>('IDLE');
  const [baseline_mA, setBaseline_mA] = useState<number>(0);
  const [lastDelta_mA, setLastDelta_mA] = useState<number>(0);

  const [samples, setSamples] = useState<SampleEvent[]>([]);
  const [deviceDetectionThreshold, setDeviceDetectionThreshold] = useState<number>(-0.7);
  const [deviceDetected, setDeviceDetected] = useState<boolean>(false);

  // Refs to hold latest values for use in subscriber callbacks
  const thresholdRef = useRef(deviceDetectionThreshold);
  const baselineRef = useRef(0);

  // Keep refs up-to-date when state changes
  useEffect(() => {
    thresholdRef.current = deviceDetectionThreshold;
    // Push to native each time threshold changes
    PowerController.setDeviceDetectionThreshold(deviceDetectionThreshold);
    console.log(`[DevPowerScreen] Threshold updated to: ${deviceDetectionThreshold}mA`);
  }, [deviceDetectionThreshold]);

  useEffect(() => {
    baselineRef.current = baseline_mA;
  }, [baseline_mA]);

  // Helper to update threshold
  const updateThreshold = (newThreshold: number) => {
    console.log(`[DevPowerScreen] Setting new threshold: ${newThreshold}mA`);
    setDeviceDetectionThreshold(newThreshold); // updates state, which triggers the effect above
    
    // Also update HomeScreen threshold if available
    if ((window as any).updateHomeScreenThreshold) {
      console.log(`[DevPowerScreen] Syncing threshold to HomeScreen: ${newThreshold}mA`);
      (window as any).updateHomeScreenThreshold(newThreshold);
    }
  };

  // Expose getter method for HomeScreen to sync
  useEffect(() => {
    (window as any).getDevPowerScreenThreshold = () => deviceDetectionThreshold;
    return () => {
      delete (window as any).getDevPowerScreenThreshold;
    };
  }, [deviceDetectionThreshold]);

  const maxSamples = 120;
  const maxEvents = 20;

  // Show numbers safely (no 0.000 fallback). If not a number, show "--".
  const fmt = (n: any, d = 3) => Number.isFinite(n) ? Number(n).toFixed(d) : '--';

  // Detection: "more negative than threshold" means device detected (absolute current)
  // Examples:
  // - current = -0.789, threshold = -0.7 → -0.789 < -0.7 → TRUE (detected)
  // - current = -0.745, threshold = -2.0 → -0.745 < -2.0 → FALSE (not detected)
  // - current = +0.37, threshold = -0.7 → 0.37 < -0.7 → FALSE (not detected)
  const isDetected = (current: number, _baseline: number, threshold: number) =>
    Number.isFinite(current) && Number.isFinite(threshold) &&
    current < threshold;

  useEffect(() => {
    console.log('[DevPowerScreen] Setting up subscriptions and auto-starting session');

    // Auto-start the session when screen loads
    PowerController.startSession({ presetId: profile });
    
    // Subscribe to all power controller events
    const unsubSample = PowerController.subscribe('Sample', (event: SampleEvent) => {
      const cur = Number.isFinite(event.current_mA) ? event.current_mA : undefined;
      const incomingBaseline = Number.isFinite(event.baseline_current) ? event.baseline_current : undefined;

      // Update baseline if provided
      if (incomingBaseline !== undefined) {
        setBaseline_mA(incomingBaseline);
      }

      // Compute delta & detection using the **latest** values from refs
      const baseline = incomingBaseline ?? baselineRef.current;
      if (cur !== undefined && Number.isFinite(baseline)) {
        setLastDelta_mA(cur - baseline);

        const thr = thresholdRef.current; // <-- latest threshold from ref!
        const detected = isDetected(cur, baseline, thr);
        setDeviceDetected(detected);
        
        console.log(`[DevPowerScreen] Detection check: current=${cur}mA, threshold=${thr}mA, detected=${detected}`);
      }

      // Keep samples (for the UI)
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
      console.log('[DevPowerScreen] Received PhaseChanged:', event);
      setCurrentPhase(event.phase);
    });

    // Update snapshot periodically
    const interval = setInterval(() => {
      const snapshot = PowerController.getSnapshot();
      setCurrentPhase(snapshot.phase);
      if (Number.isFinite(snapshot.baseline_mA)) setBaseline_mA(snapshot.baseline_mA);
      if (Number.isFinite(snapshot.lastDelta_mA)) setLastDelta_mA(snapshot.lastDelta_mA);
    }, 500);

    return () => {
      unsubSample();
      unsubPhase();
      clearInterval(interval);
      // Auto-stop when leaving screen
      PowerController.stopSession();
    };
  }, [profile]);

  const handleStartSim = () => {
    PowerController.startSession({ presetId: profile });
  };

  const handleStopSim = () => {
    PowerController.stopSession();
  };

  const handleClearData = () => {
    setSamples([]);
    setDetectorEvents([]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
      flex: 1,
    },
    modeBadge: {
      backgroundColor: USE_POWER_SIM ? '#10B981' : colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    modeBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    phaseText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    dataLabel: {
      fontSize: 14,
      color: colors.textMuted,
    },
    dataValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    button: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonSecondary: {
      backgroundColor: isDark ? '#374151' : '#E5E7EB',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: colors.textPrimary,
    },
    autoStartNote: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
    },
    eventItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#F3F4F6',
    },
    eventType: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    eventTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    
    // Device Detection Styles
    deviceDetectionContainer: {
      padding: 16,
    },
    detectionStatus: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      alignItems: 'center',
    },
    detectionStatusText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    thresholdContainer: {
      marginBottom: 16,
    },
    thresholdLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    thresholdButtons: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    thresholdButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    thresholdButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
        thresholdButtonText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        thresholdButtonTextActive: {
          color: 'white',
        },
    customThresholdContainer: {
      marginTop: 8,
    },
        customThresholdLabel: {
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 8,
        },
        thresholdAdjuster: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        },
        adjustButton: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.primary,
        },
        adjustButtonText: {
          fontSize: 24,
          fontWeight: 'bold',
          color: 'white',
        },
        currentThresholdDisplay: {
          minWidth: 80,
          padding: 12,
          backgroundColor: colors.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        },
        currentThresholdText: {
          fontSize: 16,
          fontWeight: 'bold',
          color: colors.textPrimary,
        },
    baselineInfo: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    baselineLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    baselineDescription: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    eventDelta: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    sampleGraph: {
      height: 100,
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
    },
    sampleText: {
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      fontStyle: 'italic',
      paddingVertical: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Power Monitor</Text>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>
            {USE_POWER_SIM ? 'SIMULATOR' : 'NATIVE'}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Current Phase */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Phase</Text>
          <View style={styles.card}>
            <Text style={styles.phaseText}>{currentPhase}</Text>
          </View>
        </View>

        {/* Snapshot Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detector Snapshot</Text>
          <View style={styles.card}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Baseline (mA)</Text>
              <Text style={styles.dataValue}>{fmt(baseline_mA, 2)}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Delta (mA)</Text>
              <Text style={styles.dataValue}>{fmt(lastDelta_mA, 2)}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Profile</Text>
              <Text style={styles.dataValue}>{profile}</Text>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Controls</Text>
          <View style={styles.card}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleStopSim}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Stop Session
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleClearData}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Clear Data
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.autoStartNote}>
              📡 Session auto-starts when screen loads
            </Text>
          </View>
        </View>


        {/* Sample Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Samples ({samples.length}/{maxSamples})
          </Text>
          <View style={styles.card}>
            {samples.length === 0 ? (
              <Text style={styles.emptyText}>No samples yet</Text>
            ) : (
              <>
                <View style={styles.sampleGraph}>
                  {/* Current Readings */}
                  <Text style={styles.sampleText}>
                    Current: {fmt(samples.at(-1)?.current_mA, 3)} mA
                  </Text>
                  <Text style={styles.sampleText}>
                    Voltage: {fmt(samples.at(-1)?.voltage_V, 3)} V
                  </Text>
                  <Text style={styles.sampleText}>
                    Power: {fmt((samples.at(-1)?.power_W ?? NaN) * 1000, 3)} mW
                  </Text>
                  
                  {/* Battery Status */}
                  <Text style={[styles.sampleText, { marginTop: 8, fontWeight: 'bold' }]}>
                    Battery: {samples[samples.length - 1]?.battery_level || 0}%
                  </Text>
                  <Text style={[styles.sampleText, { 
                    color: samples[samples.length - 1]?.is_charging ? '#4CAF50' : '#FF9800' 
                  }]}>
                    Status: {samples[samples.length - 1]?.charging_status || 'Unknown'}
                  </Text>
                  
                  {/* Min/Max Stats */}
                  <Text style={[styles.sampleText, { marginTop: 8, fontSize: 12, opacity: 0.7 }]}>
                    Min Current: {
                      samples.length
                        ? fmt(Math.min(...samples.map(s => s?.current_mA).filter(Number.isFinite) as number[]), 3)
                        : '--'
                    } mA
                  </Text>
                  <Text style={[styles.sampleText, { fontSize: 12, opacity: 0.7 }]}>
                    Max Current: {
                      samples.length
                        ? fmt(Math.max(...samples.map(s => s?.current_mA).filter(Number.isFinite) as number[]), 3)
                        : '--'
                    } mA
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Device Detection Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Device Detection Settings
          </Text>
          <View style={styles.card}>
            <View style={styles.deviceDetectionContainer}>
                  {/* Current Detection Status */}
                  <View style={[styles.detectionStatus, {
                    backgroundColor: deviceDetected ? '#4CAF50' : '#FF9800'
                  }]}>
                    <Text style={styles.detectionStatusText}>
                      {deviceDetected ? '🔌 Device Connected - Ready for Heating' : '🔌 No Device'}
                    </Text>
                  </View>
              
              {/* Threshold Settings */}
              <View style={styles.thresholdContainer}>
                <Text style={styles.thresholdLabel}>
                  Detection Threshold: {fmt(deviceDetectionThreshold, 3)} mA
                </Text>
                <View style={styles.thresholdButtons}>
                      <TouchableOpacity
                        style={[styles.thresholdButton, deviceDetectionThreshold === -0.7 && styles.thresholdButtonActive]}
                        onPress={() => updateThreshold(-0.7)}
                      >
                        <Text style={[styles.thresholdButtonText, deviceDetectionThreshold === -0.7 && styles.thresholdButtonTextActive]}>-0.7mA</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.thresholdButton, deviceDetectionThreshold === -0.5 && styles.thresholdButtonActive]}
                        onPress={() => updateThreshold(-0.5)}
                      >
                        <Text style={[styles.thresholdButtonText, deviceDetectionThreshold === -0.5 && styles.thresholdButtonTextActive]}>-0.5mA</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.thresholdButton, deviceDetectionThreshold === -1.0 && styles.thresholdButtonActive]}
                        onPress={() => updateThreshold(-1.0)}
                      >
                        <Text style={[styles.thresholdButtonText, deviceDetectionThreshold === -1.0 && styles.thresholdButtonTextActive]}>-1.0mA</Text>
                      </TouchableOpacity>
                </View>
                
                    {/* Threshold Adjuster */}
                    <View style={styles.customThresholdContainer}>
                      <Text style={styles.customThresholdLabel}>Adjust Threshold (mA):</Text>
                      <View style={styles.thresholdAdjuster}>
                        <TouchableOpacity
                          style={styles.adjustButton}
                          onPress={() => {
                            const newThreshold = Math.round((deviceDetectionThreshold - 0.1) * 10) / 10;
                            updateThreshold(newThreshold);
                          }}
                        >
                          <Text style={styles.adjustButtonText}>-</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.currentThresholdDisplay}>
                          <Text style={styles.currentThresholdText}>
                            {fmt(deviceDetectionThreshold, 1)}mA
                          </Text>
                        </View>
                        
                        <TouchableOpacity
                          style={styles.adjustButton}
                          onPress={() => {
                            const newThreshold = Math.round((deviceDetectionThreshold + 0.1) * 10) / 10;
                            updateThreshold(newThreshold);
                          }}
                        >
                          <Text style={styles.adjustButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
              </View>
              
              {/* Baseline Info */}
              <View style={styles.baselineInfo}>
                <Text style={styles.baselineLabel}>
                  Baseline Current: {fmt(baseline_mA, 3)} mA
                </Text>
                <Text style={styles.baselineDescription}>
                  Current drain from baseline: {
                    fmt((samples.at(-1)?.current_mA ?? NaN) - (baseline_mA ?? NaN), 3)
                  } mA
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default DevPowerScreen;

