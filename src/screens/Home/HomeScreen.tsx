import React, { useEffect, useRef, useState } from 'react';
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
import type { SampleEvent } from '../../state/power';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { profile, setProfile } = useSessionStore();
  const { sensitive, setSensitive } = useSettingsStore();
  const [showDeviceImage, setShowDeviceImage] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceDetectionThreshold, setDeviceDetectionThreshold] = useState<number>(0.20);
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Refs to hold latest values for use in subscriber callbacks
  const thresholdRef = useRef(deviceDetectionThreshold);
  const connectedRef = useRef(false);
  
  // Debounce refs for sustained detection
  const startDebounceRef = useRef<number | null>(null);
  const START_DEBOUNCE_MS = 1500;

  // USB attach prime (JS-side window in case OEM doesn't send attach_window_active each sample)
  const usbPrimeUntilRef = useRef<number>(0);
  const USB_PRIME_MS = 3000;

  // thresholds
  const INSIDE_WINDOW_THR = 0.06; // permissive for 3s after USB attach (your "UI mA" units)
  const OUTSIDE_WINDOW_THR = 0.50; // strict so drift/noise can't trigger

  // Keep threshold ref fresh + sync native
  useEffect(() => {
    thresholdRef.current = deviceDetectionThreshold;                 // always latest for subscriber
    PowerController.setDeviceDetectionThreshold(deviceDetectionThreshold); // keep native in sync
    console.log(`[HomeScreen] Threshold updated to: ${deviceDetectionThreshold}mA`);
  }, [deviceDetectionThreshold]);

  // ✅ Fix #5: Align native threshold on mount
  useEffect(() => {
    const TEST_THRESHOLD = 0.20;
    setDeviceDetectionThreshold(TEST_THRESHOLD);
    PowerController.setDeviceDetectionThreshold(TEST_THRESHOLD);
    console.log(`[HomeScreen] Applied test threshold: ${TEST_THRESHOLD}`);
  }, []);

  // Method to update threshold from external source (like DevPowerScreen)
  const updateThreshold = (newThreshold: number) => {
    console.log(`[HomeScreen] Updating threshold to: ${newThreshold}mA`);
    setDeviceDetectionThreshold(newThreshold);
  };

  // Expose updateThreshold method globally for DevPowerScreen to use
  useEffect(() => {
    (window as any).updateHomeScreenThreshold = updateThreshold;
    
    // Try to sync with DevPowerScreen threshold if it's already set
    if ((window as any).getDevPowerScreenThreshold) {
      const devThreshold = (window as any).getDevPowerScreenThreshold();
      if (devThreshold !== deviceDetectionThreshold) {
        console.log(`[HomeScreen] Syncing with DevPowerScreen threshold: ${devThreshold}mA`);
        setDeviceDetectionThreshold(devThreshold);
      }
    }
    
    return () => {
      delete (window as any).updateHomeScreenThreshold;
    };
  }, []);

  // PM-recommended detection: direction-agnostic delta magnitude
  const isDetected = (current: number, baseline: number, threshold: number) => {
    if (!Number.isFinite(current) || !Number.isFinite(baseline) || !Number.isFinite(threshold)) {
      return false;
    }
    // Direction-agnostic: delta magnitude (always positive)
    const deltaMag = Math.abs(current - baseline);
    return deltaMag >= Math.abs(threshold);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    scroll: { flex: 1 },
    // remove global gap here – it was adding extra space between logo and cards
    content: { paddingHorizontal: 16, paddingBottom: 24 },

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

    /* Insert Device Card */
    insertDeviceCard: {
      backgroundColor: '#D1D5DB',
      borderRadius: 32,
      borderWidth: 0,
      paddingHorizontal: 20,
      paddingVertical: 16,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
      minHeight: 70,
      marginTop: 12,
      marginBottom: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    insertDeviceText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 24,
    },
    instructionText: {
      ...typography.textStyles.body,
      color: colors.textPrimary,
      textAlign: 'center',
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
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
        console.log('[HomeScreen] Audio init error', e);
      }
    })();
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playDetectedSound = async () => {
    try {
      const s = soundRef.current;
      if (!s) return;
      await s.replayAsync(); // ensures play from start
    } catch (e) {
      console.log('[HomeScreen] Sound play error', e);
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
        if (!isFocused) return; // only run when Home is visible

        console.log('[HomeScreen] 👀 Focus detected - subscribing to power events');
        console.log('[HomeScreen] Current phase:', useSessionStore.getState().backendPhase);

        const unsub = PowerController.subscribe('Sample', (event: SampleEvent) => {
          if (event.is_charging) {
            startDebounceRef.current = null;
            if (connectedRef.current) {
              connectedRef.current = false;
              setDeviceConnected(false);
              setShowDeviceImage(false);
              deviceImagePulse.setValue(0);
            }
            return;
          }

          // ✅ Require native calibration to be complete
          if ((event as any)?.calibration_complete === false) {
            // keep adapting baseline etc., but don't arm debounce or fire UI
            startDebounceRef.current = null;
            return;
          }

          const cur  = Number(event.current_mA);
          const base = Number(event.baseline_current);

          // prefer native delta if present; else compute
          let deltaMag = Number.isFinite((event as any).delta_mA)
            ? Math.abs(Number((event as any).delta_mA))
            : (Number.isFinite(cur) && Number.isFinite(base) ? Math.abs(cur - base) : NaN);
          if (!Number.isFinite(deltaMag)) return;

          // Are we inside the attach window?
          const nativeAttach = !!(event as any).attach_window_active;
          const jsAttach = Date.now() < usbPrimeUntilRef.current;
          const inAttachWindow = nativeAttach || jsAttach;

          // Effective threshold
          const thr = inAttachWindow ? INSIDE_WINDOW_THR : OUTSIDE_WINDOW_THR;

          const detectedNow = deltaMag >= thr;

          // Debounce
          const now = Date.now();
          if (detectedNow) {
            if (startDebounceRef.current === null) startDebounceRef.current = now;
          } else {
            startDebounceRef.current = null;
          }
          const debouncedDetected =
            detectedNow &&
            startDebounceRef.current !== null &&
            (now - startDebounceRef.current) >= START_DEBOUNCE_MS;

          console.log(`[HomeScreen] cur=${cur?.toFixed(3)} base=${base?.toFixed(3)} |Δ|=${deltaMag.toFixed(3)} thr=${thr} inAttach=${inAttachWindow} debounced=${debouncedDetected}`);

          // ✅ SIMPLE: Show UI, play sound, and navigate after 3 seconds
          if (debouncedDetected && !connectedRef.current) {
            connectedRef.current = true;
            setDeviceConnected(true);
            setShowDeviceImage(true);

            // Play detection sound
            playDetectedSound();

            // Smooth auto-scroll
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ y: 200, animated: true });
            }, 100);

            Animated.timing(deviceImagePulse, {
              toValue: 1,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();

            console.log('[HomeScreen] 🔥 Device detected! Navigating to Heating in 3 seconds...');
            
            // Navigate after 3 seconds
            setTimeout(() => {
              console.log('[HomeScreen] ✅ Navigating to Heating screen');
              navigation.navigate('Heating' as never);
            }, 3000);
          }

          // If it dips below threshold before debounce or after, clean up
          if (!detectedNow && connectedRef.current && startDebounceRef.current === null) {
            connectedRef.current = false;
            setDeviceConnected(false);
            setShowDeviceImage(false);
            deviceImagePulse.setValue(0);
          }
        });

        // Subscribe to USB events for faster detection
        const unsubUsb = PowerController.subscribe('Usb', (e: any) => {
          if (
            e?.type === 'USB_PORT_CHANGED' ||
            e?.type === 'USB_DEVICE_ATTACHED' ||
            e?.type === 'USB_STATE'
          ) {
            usbPrimeUntilRef.current = Date.now() + USB_PRIME_MS;
            if (startDebounceRef.current === null) startDebounceRef.current = Date.now();
            console.log('[HomeScreen] 🚦 USB event — opened JS attach window for 3s & primed debounce');
          }
        });

        // focus/cleanup
        return () => {
          console.log('[HomeScreen] cleanup: unsubscribe only (session continues for workflow)');
          unsub();
          unsubUsb();
          // DON'T stop session here - it needs to continue through Heating/Treatment/Cooling/Done phases
          // PowerController.stopSession();
        };
      }, [isFocused, profile, navigation]);   // ⬅️ IMPORTANT: no deviceConnected here

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
    console.log('[HomeScreen] Manual trigger - waiting for PhaseChanged: HEATUP');
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
            iconSource={require('../../assets/images/icons/other child.png')}
            selected={profile === 'child'}
            onPress={() => setProfile('child')}
            style={styles.gridItem}
            isChild={true}
          />
          <ProfileCard
            label={t('start.adult')}
            iconSource={require('../../assets/images/icons/ic_adult.png')}
            selected={profile === 'adult'}
            onPress={() => setProfile('adult')}
            style={styles.gridItem}
          />
        </View>

        {/* Sensitive Skin (clean, no card) */}
        <View style={styles.sensitiveCard}>
          <SettingToggleRow
            leftIcon={
              <Image
                source={require('../../assets/images/icons/new_sensitive.png')}
                style={[
                  styles.sensIcon,
                  { tintColor: sensitive ? colors.primary : '#9CA3AF' },
                ]}
                resizeMode="contain"
              />
            }
            label={t('labels.sensitive')}
            value={sensitive}
            onValueChange={setSensitive}
          />
        </View>


        {/* Insert Device Instruction - Automatic Detection Only */}
        <View style={styles.insertDeviceCard}>
            <Text style={styles.insertDeviceText}>
              {deviceConnected ? 'Device Connected' : t('start.insertDevice')}
            </Text>
        </View>

        {/* Device Image Display */}
        {showDeviceImage && (
          <View style={styles.deviceImageContainer}>
            <Animated.Image
              source={require('../../assets/images/icons/phone_wrist.png')}
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
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
