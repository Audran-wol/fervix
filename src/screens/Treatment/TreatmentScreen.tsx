import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  TouchableOpacity, Dimensions, Platform, LayoutRectangle, Image,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../../theme/useTheme';
import { useSessionStore } from '../../state';
import { useSettingsStore } from '../../state/useSettingsStore';
import { PowerController } from '../../state/power';
import type { SampleEvent } from '../../state/power';
import * as Haptics from 'expo-haptics';

const { width: W, height: H } = Dimensions.get('window');
const DURATION_MS = 20_000;

export const TreatmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const backendPhase = useSessionStore(state => state.backendPhase);
  const remainingMs = useSessionStore(state => state.remainingMs);
  const { soundOn, vibrationOn } = useSettingsStore();

  const [countdown, setCountdown] = useState(Math.floor(DURATION_MS / 1000)); // Start from 20 seconds
  const screenFill = useRef(new Animated.Value(0)).current;
  const [handLayout, setHandLayout] = useState<LayoutRectangle | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lottieRef = useRef<LottieView>(null);
  const [deviceDisconnected, setDeviceDisconnected] = useState(false);
  
  // Device disconnect detection refs with AGGRESSIVE settings for active phase
  const disconnectDebounceRef = useRef<number | null>(null);
  const lastCurrentRef = useRef<number | null>(null);
  const DISCONNECT_DEBOUNCE_MS = 300; // FAST: 300ms debounce for critical treatment phase
  const DISCONNECT_THRESHOLD = 0.05; // Very low current indicates disconnect
  const IMMEDIATE_ABORT_THRESHOLD = 0.10; // For dramatic drops, abort immediately

  // === Sizing for treatment icon =============================================
  const CARD = Math.min(W, H) * 0.70;
  const ICON_SIZE = CARD * 0.85; // Treatment icon size - INCREASED
  // ===========================================================================

  // ✅ Prevent back navigation during treatment phase
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Prevent back navigation during treatment
        return true;
      };

      // Add back button listener
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // Prevent any navigation away from treatment screen
        e.preventDefault();
      });

      return () => {
        unsubscribe();
      };
    }, [navigation])
  );

  // ✅ Device disconnect detection during treatment
  useEffect(() => {
    console.log('[TreatmentScreen] 💚 Starting treatment phase with device monitoring...');
    
    // Subscribe to PhaseChanged events for backend abort detection
    const phaseUnsub = PowerController.subscribe('PhaseChanged', (event) => {
      console.log('[TreatmentScreen] 📡 PhaseChanged event:', event);
      if (event.phase === 'ABORT') {
        console.log('[TreatmentScreen] 🚨 Backend detected abort - navigating to Aborted screen');
        setDeviceDisconnected(true);
        navigation.navigate('Aborted' as never);
      }
    });
    
    // Subscribe to power events to detect device disconnect
    const unsub = PowerController.subscribe('Sample', (event: SampleEvent) => {
      // Skip if already disconnected
      if (deviceDisconnected) return;
      
      const current = Number(event.current_mA);
      const isCharging = event.is_charging;
      
      // CRITICAL: Immediate abort if charging detected (no debounce for charging state!)
      if (isCharging && !deviceDisconnected) {
        console.log('[TreatmentScreen] 🚨 IMMEDIATE ABORT: Phone is charging (device unplugged)');
        setDeviceDisconnected(true);
        navigation.navigate('Aborted' as never);
        return; // Exit immediately, don't process further
      }
      
      // AGGRESSIVE MULTI-CHECK for disconnect - Drastic changes from device baseline:
      // 1. Current drops to very low levels (delta below threshold)
      // 2. Current suddenly stops draining (goes from negative to positive/zero)
      // 3. Drastic reduction in drain (>100mA sudden reduction) indicating device unplugged
      const currentTooLow = Number.isFinite(current) && Math.abs(current) < DISCONNECT_THRESHOLD;
      
      const lastCurrent = lastCurrentRef.current;
      const suddenDrop = lastCurrent !== null && 
                        Number.isFinite(lastCurrent) && 
                        Number.isFinite(current) &&
                        lastCurrent < -0.1 && // Was draining significantly
                        current > -0.05; // Now barely draining or charging
      
      // NEW: Drastic reduction in drain - device unplugged causes current to jump back
      // Example: Was -0.3 (device draining), now -0.1 (device removed, less drain)
      const drasticReduction = lastCurrent !== null &&
                              Number.isFinite(lastCurrent) &&
                              Number.isFinite(current) &&
                              lastCurrent < -0.2 && // Was draining for device (>200mA)
                              (current - lastCurrent) > IMMEDIATE_ABORT_THRESHOLD; // Sudden reduction >100mA
      
      lastCurrentRef.current = current;
      
      const isDisconnected = currentTooLow || suddenDrop || drasticReduction;
      
      console.log(`[TreatmentScreen] current=${current?.toFixed(3)}mA isCharging=${isCharging} ` +
                  `currentTooLow=${currentTooLow} suddenDrop=${suddenDrop} ` +
                  `drasticReduction=${drasticReduction} isDisconnected=${isDisconnected}`);
      
      if (isDisconnected) {
        // Start debounce timer for disconnect
        const now = Date.now();
        if (disconnectDebounceRef.current === null) {
          disconnectDebounceRef.current = now;
          console.log('[TreatmentScreen] 🚨 Disconnect detected - starting debounce timer');
        }
        
        // Check if debounce time has passed
        if ((now - disconnectDebounceRef.current) >= DISCONNECT_DEBOUNCE_MS) {
          console.log('[TreatmentScreen] ⚠️ Device disconnected during treatment - navigating to abort');
          setDeviceDisconnected(true);
          navigation.navigate('Aborted' as never);
        }
      } else {
        // Device is connected (current is flowing), reset debounce
        if (disconnectDebounceRef.current !== null) {
          console.log('[TreatmentScreen] ✅ Device reconnected - resetting disconnect timer');
          disconnectDebounceRef.current = null;
        }
      }
    });
    
    // Play sound if enabled
    if (soundOn) {
      (async () => {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
          });
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sound/ES_Windchimes, Zen, Relax, Calm, Peaceful, Isolated 01 - Epidemic Sound - 23044-35506.wav'),
            { shouldPlay: true, isLooping: true, volume: 0.8 }
          );
          soundRef.current = sound;
          console.log('[TreatmentScreen] 🔊 Playing relaxing windchimes sound');
        } catch (e) {
          console.log('[TreatmentScreen] ❌ Sound error:', e);
        }
      })();
    }
    
    // Start vibration pattern if enabled
    let vibrationInterval: NodeJS.Timeout | null = null;
    if (vibrationOn) {
      vibrationInterval = setInterval(async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
          console.log('[TreatmentScreen] ❌ Vibration error:', e);
        }
      }, 1500); // Vibrate every 1.5 seconds
      console.log('[TreatmentScreen] 📳 Starting treatment vibration pattern');
    }
    
    // Navigate after 20 seconds (only if device still connected)
    const timer = setTimeout(() => {
      if (!deviceDisconnected) {
        console.log('[TreatmentScreen] ✅ 20 seconds passed - navigating to FinalCompleted (skipping cooling)');
      soundRef.current?.stopAsync().catch(() => {});
      if (vibrationInterval) clearInterval(vibrationInterval);
        navigation.navigate('FinalCompleted' as never);
      }
    }, 20000); // 20 seconds
    
    return () => {
      clearTimeout(timer);
      if (vibrationInterval) clearInterval(vibrationInterval);
      soundRef.current?.stopAsync().then(() => {
        soundRef.current?.unloadAsync();
      }).catch(() => {});
      unsub(); // Unsubscribe from power events
      phaseUnsub(); // Unsubscribe from phase events
    };
  }, [navigation, soundOn, vibrationOn, deviceDisconnected]);

  // Update countdown from store's remainingMs
  useEffect(() => {
    if (remainingMs !== undefined) {
      setCountdown(Math.ceil(remainingMs / 1000));
    }
  }, [remainingMs]);

  useEffect(() => {
    Animated.timing(screenFill, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();


    // Countdown timer - exact same logic as CoolingScreen
    const startedAt = Date.now();
    let tick: NodeJS.Timeout | null = null;

    tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
      setCountdown(left);
      if (left <= 0) {
        if (tick) {
          clearInterval(tick);
          tick = null;
        }
      }
    }, 200); // Update every 200ms for smooth countdown

    return () => {
      if (tick) {
        clearInterval(tick);
      }
    };
  }, []);

  const screenFillHeight = screenFill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, H],
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },

    risingFill: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: '#6fc7b4', zIndex: 0,
    },

    safe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
    back: {
      marginTop: 4, marginLeft: 16, width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6, elevation: 3,
    },

    cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 },

    // Outer circle container
    cardOuter: {
      width: CARD, height: CARD, borderRadius: CARD / 2,
      backgroundColor: '#FFFFFF',
      overflow: 'visible',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 18 },
      shadowRadius: 36, elevation: 16,
    },

    // Treatment icon container
    treatmentIconContainer: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },

    treatmentIcon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      resizeMode: 'contain',
    },

    // Countdown Between Circle and Title Styles
    countdownContainer: {
      position: 'absolute',
      bottom: 200, // Position between circle and title, outside the circle
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    countdownNumber: {
      fontSize: 32,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },

    countdown: {
      position: 'absolute',
      bottom: 20,
      fontSize: 50, fontWeight: '300', color: colors.textPrimary,
      includeFontPadding: false, textAlignVertical: 'center', letterSpacing: -2,
      fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-thin' }),
      zIndex: 3,
    },

    titleWrap: { position: 'absolute', bottom: 160, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
    title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: colors.textPrimary },
  });

  return (
    <View style={s.container}>
      <Animated.View pointerEvents="none" style={[s.risingFill, { height: screenFillHeight }]} />


      <View style={s.cardWrap}>
        <View style={s.cardOuter}>
          {/* Treatment Lottie animation */}
          <View style={s.treatmentIconContainer}>
            <LottieView
              ref={lottieRef}
              source={require('../../assets/lotties/anim_treatment.json')}
              style={s.treatmentIcon}
              autoPlay={true}
              loop={true}
              speed={1.0}
              resizeMode="contain"
            />
          </View>
        </View>
        
          </View>
          
      {/* Countdown Number Between Circle and Title */}
      <View style={s.countdownContainer}>
        <Text style={s.countdownNumber}>
            {countdown}
          </Text>
      </View>

      <View style={s.titleWrap}>
        <Text style={s.title}>
          {t('treatment.active')}
        </Text>
      </View>

    </View>
  );
};

export default TreatmentScreen;
