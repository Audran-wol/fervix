/**
 * Development/QA screen for power monitoring
 * Visualizes samples, detector events, and phase transitions
 * Only available in __DEV__ mode
 */

import React, { useEffect, useState } from 'react';
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
  const [detectorEvents, setDetectorEvents] = useState<DetectorEvent[]>([]);

  const maxSamples = 120;
  const maxEvents = 20;

  useEffect(() => {
    // Subscribe to all power controller events
    const unsubSample = PowerController.subscribe('Sample', (event: SampleEvent) => {
      setSamples(prev => [...prev.slice(-maxSamples + 1), event]);
    });

    const unsubDetector = PowerController.subscribe('Detector', (event: DetectorEvent) => {
      setDetectorEvents(prev => [...prev.slice(-maxEvents + 1), event]);
    });

    const unsubPhase = PowerController.subscribe('PhaseChanged', (event) => {
      setCurrentPhase(event.phase);
    });

    // Update snapshot periodically
    const interval = setInterval(() => {
      const snapshot = PowerController.getSnapshot();
      setCurrentPhase(snapshot.phase);
      setBaseline_mA(snapshot.baseline_mA || 0);
      setLastDelta_mA(snapshot.lastDelta_mA || 0);
    }, 500);

    return () => {
      unsubSample();
      unsubDetector();
      unsubPhase();
      clearInterval(interval);
    };
  }, []);

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.dataValue}>{baseline_mA.toFixed(2)}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Delta (mA)</Text>
              <Text style={styles.dataValue}>{lastDelta_mA.toFixed(2)}</Text>
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
                style={styles.button}
                onPress={handleStartSim}
              >
                <Text style={styles.buttonText}>Start Simulation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleStopSim}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Stop
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.buttonRow, { marginTop: 12 }]}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleClearData}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Clear Data
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Detector Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Detector Events ({detectorEvents.length})
          </Text>
          <View style={styles.card}>
            {detectorEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events yet</Text>
            ) : (
              detectorEvents
                .slice()
                .reverse()
                .map((event, idx) => {
                  let displayType = event.type;
                  let icon = '';
                  
                  if (event.type === 'ACCESSORY_CONNECTED') {
                    displayType = '🔌 CONNECTED';
                  } else if (event.type === 'ACCESSORY_DISCONNECTED') {
                    displayType = '⚡ DISCONNECTED';
                  } else if (event.type === 'START_HEAT') {
                    displayType = '🔥 START_HEAT';
                  } else if (event.type === 'END_HEAT') {
                    displayType = '❄️ END_HEAT';
                  }
                  
                  return (
                    <View key={idx} style={styles.eventItem}>
                      <Text style={styles.eventType}>{displayType}</Text>
                      <Text style={styles.eventDelta}>
                        Δ {event.delta_mA.toFixed(1)} mA
                      </Text>
                      <Text style={styles.eventTime}>
                        {new Date(event.tMillis).toLocaleTimeString()}
                      </Text>
                    </View>
                  );
                })
            )}
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
                  <Text style={styles.sampleText}>
                    Last: {samples[samples.length - 1]?.current_mA.toFixed(1)} mA
                  </Text>
                  <Text style={styles.sampleText}>
                    Min: {Math.min(...samples.map(s => s.current_mA)).toFixed(1)} mA
                  </Text>
                  <Text style={styles.sampleText}>
                    Max: {Math.max(...samples.map(s => s.current_mA)).toFixed(1)} mA
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default DevPowerScreen;

