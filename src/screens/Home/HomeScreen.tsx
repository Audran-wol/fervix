import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProfileCard, SettingToggleRow, InfoCard } from '../../components/ui';
import { useSessionStore } from '../../state/useSessionStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import { PowerController } from '../../state/power';
import type { DetectorEvent } from '../../state/power';
import * as Haptics from 'expo-haptics';

export const HomeScreen: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { profile, setProfile } = useSessionStore();
  const { sensitive, setSensitive, soundOn, vibrationOn, manualDetectionMode } = useSettingsStore();
  const [showDeviceImage, setShowDeviceImage] = useState(false);
  const [coolingCountdown, setCoolingCountdown] = useState<number | null>(null);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [devicePhase, setDevicePhase] = useState<'idle' | 'pressed' | 'starting'>('idle');
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pressDetectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Device detection state (managed by TypeScript detector)
  const [deviceDetected, setDeviceDetected] = useState(false);
  
  // Refs for UI state management
  const navigationStartedRef = useRef(false);
  const devicePhaseRef = useRef<'idle' | 'pressed' | 'starting'>('idle');

  // Reset detection state on mount
  useEffect(() => {
    navigationStartedRef.current = false;
    setDeviceDetected(false);
    setDevicePhase('idle');
    devicePhaseRef.current = 'idle';
  }, []);

  // ✅ Start cooling countdown only when coming from treatment completion
  useEffect(() => {
    // Check if we have route params indicating we're coming from treatment completion
    const route = navigation.getState()?.routes?.find(r => r.name === 'MainTabs');
    const params = route?.params as any;
    
      if (params?.fromTreatmentCompletion) {
        setCoolingCountdown(12);
        setIsCoolingDown(true);
      
      // Clear the parameter to prevent restarting on subsequent focuses
      navigation.setParams({ fromTreatmentCompletion: undefined } as any);
    }
  }, [isFocused, navigation]);

  // ✅ Alternative: Use a global flag approach
  useEffect(() => {
    // Check if we're coming from treatment completion using a global flag
    if ((window as any).shouldStartCooling) {
      setCoolingCountdown(12);
      setIsCoolingDown(true);
      (window as any).shouldStartCooling = false; // Clear the flag
    }
  }, [isFocused]);

  // ✅ Cooling countdown timer
  useEffect(() => {
    if (coolingCountdown !== null && coolingCountdown > 0) {
      const timer = setTimeout(() => {
        setCoolingCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (coolingCountdown === 0) {
      // Countdown finished
      setCoolingCountdown(null);
      setIsCoolingDown(false);
    }
  }, [coolingCountdown]);


  // Optimized callback handlers to prevent unnecessary re-renders
  const handleChildProfilePress = useCallback(() => {
    if (!isCoolingDown) {
      setProfile('child');
    }
  }, [isCoolingDown, setProfile]);

  const handleAdultProfilePress = useCallback(() => {
    if (!isCoolingDown) {
      setProfile('adult');
    }
  }, [isCoolingDown, setProfile]);

  const handleSensitiveToggle = useCallback((value: boolean) => {
    if (!isCoolingDown) {
      setSensitive(value);
    }
  }, [isCoolingDown, setSensitive]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    scroll: { flex: 1 },
    // remove global gap here – it was adding extra space between logo and cards
    content: { paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom + 80, 24) }, // Account for nav bar + safe area

    /* AppBar / Logo */
    appBar: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
      paddingTop: Math.max(insets.top,5), // bring logo down a little
      paddingBottom: 0,                    // no bottom padding (kills the gap)
      marginBottom: -30,                     // reduce margin bottom
    },
    logoImage: {
      width: 390,
      height: 130,
      alignSelf: 'center',
      resizeMode: 'contain',
      marginLeft: 13,
    },

    /* Grid */
    grid: { flexDirection: 'row', columnGap: 16, marginTop: 4 }, // nudge closer to the logo
    gridItem: { flex: 1, minHeight: 220 },

    /* Sensitive card (soft; no dark borders) */
    sensitiveCard: {
      backgroundColor: colors.card,
      borderRadius: 32,
      borderWidth: 0,
      paddingHorizontal: 12,
      paddingVertical: 12,
      shadowColor: '#000',
      shadowOpacity: 0.10,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      marginTop: 14,
    },

    /* Clean Sensitive icon - no card */
    sensIcon: {
      width: 80,
      height: 80,
    },

    /* Insert Device Banner */
    insertDeviceBanner: {
      backgroundColor: isDark ? '#E5E7EB' : '#F3F4F6',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#D1D5DB' : '#E5E7EB',
      paddingHorizontal: 20,
      paddingVertical: 20,
      minHeight: 70,
      marginTop: 12,
      marginBottom: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    insertDeviceBannerConnected: {
      backgroundColor: '#D1FAE5', // Light green background
      borderColor: '#A7F3D0', // Light green border
    },
    insertDeviceText: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#374151' : '#6B7280',
      textAlign: 'center',
      lineHeight: 22,
    },
    insertDeviceTextGently: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#374151' : '#6B7280',
      textAlign: 'center',
      lineHeight: 26,
    },
    instructionText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#4B5563' : '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 8,
    },

    /* Illustration area */
    illustrationWrap: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: 6,
      position: 'relative',
      paddingVertical: 12,
    },
    illustration: {
      width: 200,
      height: 200,
    },

    /* Pulse (from below, subtle) */
    pulse: {
      position: 'absolute',
      bottom: 8,
      alignSelf: 'center',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors['primary-100'],
      borderWidth: 2,
      borderColor: 'rgba(224,25,25,0.22)',
    },

    /* Hint */
    pulseHint: { marginTop: 8, fontSize: 12, color: colors.textMuted },

    /* Device Image Display */
    deviceImageContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      paddingVertical: 8,
    },
    deviceImage: {
      width: 280,
      height: 280,
      resizeMode: 'contain',
    },
    deviceImagePulse: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors['primary-100'],
      borderWidth: 2,
      borderColor: 'rgba(224,25,25,0.2)',
    },
  });

  // Animations (bobbing + pulse-from-below)
  const bob = useRef(new Animated.Value(0)).current;
  const pulsePhase = useRef(new Animated.Value(0)).current;
  const deviceImagePulse = useRef(new Animated.Value(0)).current;
  const deviceImageImpulse = useRef(new Animated.Value(1)).current;

  // ✅ Fix #4: Initialize audio once with proper mode
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sound/sound-alert-device-turn-on-turn-off-win-done-chakongaudio-174892.mp3'),
          { shouldPlay: false, volume: 1.0 }
        );
        soundRef.current = sound;
      } catch (e) {
        // Audio init error - silent fail
      }
    })();
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playDetectedSound = async () => {
    try {
      if (soundOn) {
        const s = soundRef.current;
        if (!s) return;
        await s.replayAsync(); // ensures play from start
      }
      
      if (vibrationOn) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {
      // Sound/vibration error - silent fail
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: -1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(pulsePhase, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true })
    ).start();

    // Device image impulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(deviceImageImpulse, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(deviceImageImpulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [bob, pulsePhase, deviceImageImpulse]);

      // ✅ HomeScreen detection - only when Home is focused
      useEffect(() => {
        if (!isFocused) return;
        
        // CRITICAL: Block ALL detection subscriptions during cooldown
        if (isCoolingDown || coolingCountdown !== null) {
          console.log('[HomeScreen] ⛔ Detection subscriptions blocked - cooldown active');
          return;
        }

        const store = useSessionStore.getState();
        store.bindPowerController(PowerController);
        
        // 1. Reset Phase to IDLE to ensure Detector is ready
        PowerController.subscribe('PhaseChanged', () => {}); 
        
        // Start the power monitoring session
        const currentProfile = store.profile;
        store.requestStart({ presetId: currentProfile });

        // 2. Subscribe to the new Detector Logic
        const unsubDetector = PowerController.subscribe('Detector', (event: DetectorEvent) => {
          // CRITICAL: Block detection during cooldown
          if (isCoolingDown || coolingCountdown !== null) {
            console.log('[HomeScreen] ⛔ Ignoring detection - cooldown active', { isCoolingDown, coolingCountdown });
            return;
          }
          
          // START EVENT
          if (event.type === 'START_HEAT') {
              // Prevent double-trigger if we are already transitioning
              if (devicePhaseRef.current === 'pressed' || devicePhaseRef.current === 'starting') {
                console.log('[Home] ⛔ Ignoring duplicate START_HEAT - already transitioning');
                return;
              }
              
              // CRITICAL: Verify backend phase is still IDLE before navigating
              const currentStore = useSessionStore.getState();
              const backendPhase = currentStore.backendPhase;
              if (backendPhase !== 'IDLE' && backendPhase !== 'PREHEAT_DETECT') {
                console.log('[Home] ⛔ Ignoring START_HEAT - backend phase is', backendPhase);
                return;
              }
              
              console.log('[Home] Device Connected -> Starting Sequence');
            
              // Immediate UI Feedback
              playDetectedSound();
            setDeviceDetected(true);
            setDevicePhase('pressed');
            devicePhaseRef.current = 'pressed';
            
              // Short delay for the "Pulse" animation, then Navigate
              // We do NOT check for Abort inside this specific timeout to prevent UI flickering
              setTimeout(() => {
                // Double-check phase before navigating (prevent navigation if phase changed)
                const finalCheck = useSessionStore.getState().backendPhase;
                if (finalCheck === 'IDLE' || finalCheck === 'PREHEAT_DETECT') {
                  navigation.navigate('Heating' as never);
                } else {
                  console.log('[Home] ⛔ Navigation cancelled - phase changed to', finalCheck);
                  setDeviceDetected(false);
                  setDevicePhase('idle');
                  devicePhaseRef.current = 'idle';
                }
              }, 800);
          }

          // ABORT EVENT (Only if we are still on Home/Pressed state)
          if (event.type === 'END_HEAT') {
              if (devicePhaseRef.current !== 'idle') {
                  console.log('[Home] Device Disconnected (Button Released)');
            setDeviceDetected(false);
            setDevicePhase('idle');
            devicePhaseRef.current = 'idle';
            
            // Clear timers
            if (pressDetectionTimerRef.current) {
              clearTimeout(pressDetectionTimerRef.current);
              pressDetectionTimerRef.current = null;
                  }
            }
          }
        });

        return () => {
          unsubDetector();
          // Clear timers
          if (pressDetectionTimerRef.current) {
            clearTimeout(pressDetectionTimerRef.current);
            pressDetectionTimerRef.current = null;
          }
        };
      }, [isFocused, navigation, isCoolingDown, coolingCountdown]);

  // ✅ No longer using PhaseChanged for navigation - using timers for reliability


  const bobTranslate = bob.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  // Pulse rising from below (subtle; doesn't resize the section)
  const pulseTranslateY = pulsePhase.interpolate({ inputRange: [0, 1], outputRange: [28, -6] });
  const pulseScale = pulsePhase.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.6] });
  const pulseOpacity = pulsePhase.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] });

  // Handle device insertion click (manual trigger) - DEPRECATED, relying on automatic detection now
  const handleDeviceInsertion = () => {
    setShowDeviceImage(true);
    setDeviceConnected(true);

    // Simple fade in animation for the image
    Animated.timing(deviceImagePulse, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Play sound
    playDetectedSound();

    // ✅ Session should already be running from the focus effect
    // Just wait for PhaseChanged to navigate
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* AppBar / Logo */}
        <View style={styles.appBar}>
          <Image
            // keep your original asset name: fervix_logo
            source={require('../../assets/images/logos/fervix_logo.png')}
            style={styles.logoImage}
          />
        </View>

        {/* Profile grid */}
        <View style={styles.grid}>
          <ProfileCard
            label={t('start.child')}
            iconSource={require('../../assets/images/webimg/other child.webp')}
            selected={profile === 'child'}
            onPress={handleChildProfilePress}
            style={styles.gridItem}
            isChild={true}
            disabled={isCoolingDown}
          />
          <ProfileCard
            label={t('start.adult')}
            iconSource={require('../../assets/images/webimg/ic_adult.webp')}
            selected={profile === 'adult'}
            onPress={handleAdultProfilePress}
            style={styles.gridItem}
            disabled={isCoolingDown}
          />
        </View>

        {/* Sensitive Skin (clean, no card) */}
        <View style={styles.sensitiveCard}>
          <SettingToggleRow
            leftIcon={
              <Image
                source={require('../../assets/images/webimg/new_sensitive.webp')}
                style={[
                  styles.sensIcon,
                  { tintColor: sensitive ? colors.primary : '#9CA3AF' },
                ]}
                resizeMode="contain"
              />
            }
            label={t('labels.sensitive')}
            value={sensitive}
            onValueChange={handleSensitiveToggle}
          />
        </View>


        {/* Insert Device Banner - Clickable when manual detection mode is enabled */}
        {manualDetectionMode && devicePhase === 'idle' && !isCoolingDown && coolingCountdown === null ? (
          <TouchableOpacity
            style={[
              styles.insertDeviceBanner,
              devicePhase === 'pressed' && styles.insertDeviceBannerConnected
            ]}
            onPress={() => {
              // Double-check cooldown before triggering
              if (isCoolingDown || coolingCountdown !== null) {
                console.log('[HomeScreen] ⛔ Manual detection blocked - cooldown active', { isCoolingDown, coolingCountdown });
                return;
              }
              
              // Additional check: Verify backend phase is IDLE
              const currentStore = useSessionStore.getState();
              const backendPhase = currentStore.backendPhase;
              if (backendPhase !== 'IDLE' && backendPhase !== 'PREHEAT_DETECT') {
                console.log('[HomeScreen] ⛔ Manual detection blocked - active phase:', backendPhase);
                return;
              }
              
              console.log('[HomeScreen] 🔧 Manual detection disabled - using automatic detection only');
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.insertDeviceText,
              devicePhase === 'pressed' && styles.insertDeviceTextGently
            ]}>
              {t('start.insertDevice')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[
            styles.insertDeviceBanner,
            devicePhase === 'pressed' && styles.insertDeviceBannerConnected,
            isCoolingDown && { opacity: 0.6 } // Visual indication that it's disabled
          ]}>
            <Text style={[
              styles.insertDeviceText,
              devicePhase === 'pressed' && styles.insertDeviceTextGently,
              isCoolingDown && { color: colors.textMuted }
            ]}>
              {coolingCountdown !== null ? `${t('start.coolingDown')} ${coolingCountdown}s` :
               devicePhase === 'pressed' ? 'Press Detected - Starting...' :
               t('start.insertDevice')}
            </Text>
          </View>
        )}

        {/* Device Image Display - Temporarily commented out */}
        {/* {showDeviceImage && (
          <View style={styles.deviceImageContainer}>
            <Animated.Image
              source={require('../../assets/images/webimg/phone_wrist.webp')}
              style={[
                styles.deviceImage,
                {
                  opacity: deviceImagePulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [
                    {
                      scale: deviceImagePulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ].concat(
                    showDeviceImage ? [
                      {
                        scale: deviceImageImpulse,
                      },
                    ] : []
                  ),
                },
              ]}
              resizeMode="contain"
            />
          </View>
        )} */}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

export default HomeScreen;
