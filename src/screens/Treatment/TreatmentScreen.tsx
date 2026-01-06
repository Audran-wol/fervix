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
import type { DetectorEvent } from '../../state/power';
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

  // ✅ Device disconnect detection during treatment - ONLY via Global Detector
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
    
    // Subscribe to Detector events - rely on main Detector for END_HEAT detection
    // This removes the conflicting Sample-based detection logic
    const detectorUnsub = PowerController.subscribe('Detector', async (event: DetectorEvent) => {
      // Skip if already disconnected
      if (deviceDisconnected) return;
      
      // Listen for END_HEAT events from the main Detector
      if (event.type === 'END_HEAT') {
        console.log('[TreatmentScreen] 🚨 Detector detected END_HEAT (device disconnected) - navigating to Aborted');
        setDeviceDisconnected(true);
        navigation.navigate('Aborted' as never);
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
      detectorUnsub(); // Unsubscribe from detector events
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

