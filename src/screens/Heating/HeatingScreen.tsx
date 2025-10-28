import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const HeatingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const backendPhase = useSessionStore(state => state.backendPhase);
  const { soundOn, vibrationOn } = useSettingsStore();
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [deviceDisconnected, setDeviceDisconnected] = useState(false);
  
  // Device disconnect detection refs with AGGRESSIVE settings for active phase
  const disconnectDebounceRef = useRef<number | null>(null);
  const lastCurrentRef = useRef<number | null>(null);
  const DISCONNECT_DEBOUNCE_MS = 300; // FAST: 300ms debounce for critical heating phase
  const DISCONNECT_THRESHOLD = 0.05; // Very low current indicates disconnect
  const IMMEDIATE_ABORT_THRESHOLD = 0.10; // For dramatic drops, abort immediately
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    fullScreenContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    circle: {
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    fillContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      overflow: 'hidden',
    },
    fill: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      backgroundColor: '#ff6400', // Orange filling color
    },
    iconContainer: {
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
  heatIcon: {
    width: 180,
    height: 180,
    // Remove tintColor to keep original yellow color
  },
    titleContainer: {
      position: 'absolute',
      bottom: 180,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 10,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 4,
      opacity: 0.8,
    },
    thermometerContainer: {
      position: 'absolute',
      left: 40,
      top: '30%',
      zIndex: 5,
      display: 'none', // Hide the side thermometer
    },
    thermometer: {
      width: 100,
      height: 100,
    },
    centerThermometer: {
      width: 240,
      height: 240,
    },
  });
  
  // Animation values
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const thermometerAnimation = useRef(new Animated.Value(0)).current;

  const circleSize = Math.max(screenWidth, screenHeight) * 1.9;

  // ✅ Prevent back navigation during heating phase
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Prevent back navigation during heating
        return true;
      };

      // Add back button listener
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // Prevent any navigation away from heating screen
        e.preventDefault();
      });

      return () => {
        unsubscribe();
      };
    }, [navigation])
  );

  // ✅ Device disconnect detection during heating
  useEffect(() => {
    console.log('[HeatingScreen] 🔥 Starting heating phase with device monitoring...');
    
    // Subscribe to PhaseChanged events for backend abort detection
    const phaseUnsub = PowerController.subscribe('PhaseChanged', (event) => {
      console.log('[HeatingScreen] 📡 PhaseChanged event:', event);
      if (event.phase === 'ABORT') {
        console.log('[HeatingScreen] 🚨 Backend detected abort - navigating to Aborted screen');
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
        console.log('[HeatingScreen] 🚨 IMMEDIATE ABORT: Phone is charging (device unplugged)');
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
      
      console.log(`[HeatingScreen] current=${current?.toFixed(3)}mA isCharging=${isCharging} ` +
                  `currentTooLow=${currentTooLow} suddenDrop=${suddenDrop} ` +
                  `drasticReduction=${drasticReduction} isDisconnected=${isDisconnected}`);
      
      if (isDisconnected) {
        // Start debounce timer for disconnect
        const now = Date.now();
        if (disconnectDebounceRef.current === null) {
          disconnectDebounceRef.current = now;
          console.log('[HeatingScreen] 🚨 Disconnect detected - starting debounce timer');
        }
        
        // Check if debounce time has passed
        if ((now - disconnectDebounceRef.current) >= DISCONNECT_DEBOUNCE_MS) {
          console.log('[HeatingScreen] ⚠️ Device disconnected during heating - navigating to abort');
          setDeviceDisconnected(true);
          navigation.navigate('Aborted' as never);
        }
      } else {
        // Device is connected (current is flowing), reset debounce
        if (disconnectDebounceRef.current !== null) {
          console.log('[HeatingScreen] ✅ Device reconnected - resetting disconnect timer');
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
            require('../../assets/sound/heat_loop_10s.wav'),
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          soundRef.current = sound;
          console.log('[HeatingScreen] 🔊 Playing heating sound loop');
        } catch (e) {
          console.log('[HeatingScreen] ❌ Sound error:', e);
        }
      })();
    }
    
    // Start vibration pattern if enabled
    let vibrationInterval: NodeJS.Timeout | null = null;
    if (vibrationOn) {
      vibrationInterval = setInterval(async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
          console.log('[HeatingScreen] ❌ Vibration error:', e);
        }
      }, 2000); // Vibrate every 2 seconds
      console.log('[HeatingScreen] 📳 Starting heating vibration pattern');
    }
    
    // Navigate after 10 seconds (only if device still connected)
    const timer = setTimeout(() => {
      if (!deviceDisconnected) {
        console.log('[HeatingScreen] ✅ 10 seconds passed - navigating to Treatment');
        soundRef.current?.stopAsync().catch(() => {});
        if (vibrationInterval) clearInterval(vibrationInterval);
        navigation.navigate('Treatment' as never);
      }
    }, 10000); // 10 seconds - smooth transition!
    
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

  useEffect(() => {
    // Start filling animation (matches 10 second timer)
    Animated.timing(fillAnimation, {
      toValue: 1,
      duration: 10000, // Match the navigation timer
      easing: Easing.linear, // Linear to match TreatmentScreen
      useNativeDriver: false,
    }).start();


    // Create wave animation for heating effect
    const waveAnimationLoop = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimation, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnimation, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    // Create overlay animation for movement effect
    const overlayAnimationLoop = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(overlayOpacity, {
            toValue: 0.3,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 1500,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    // Start wave animations
    waveAnimationLoop();
    overlayAnimationLoop();

    // Create thermometer animation
    const thermometerFlightAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(thermometerAnimation, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(thermometerAnimation, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    // Start thermometer animation
    thermometerFlightAnimation();

    // Visual progress animation (cosmetic only)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 150);

    return () => {
      clearInterval(progressInterval);
    };
  }, []);

  const fillHeight = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circleSize],
  });

  return (
    <View style={[styles.container, { backgroundColor: '#ff6400' }]}>

      {/* Flying Thermometer - Left Side */}
      <Animated.View
        style={[
          styles.thermometerContainer,
          {
            transform: [
              {
                translateY: thermometerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                }),
              },
              {
                rotate: thermometerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '5deg'],
                }),
              },
            ],
          },
        ]}
      >
        <LottieView
          source={require('../../assets/lotties/thermometer.json')}
          style={styles.thermometer}
          autoPlay
          loop
        />
      </Animated.View>

      {/* Full Screen Circle - Takes entire screen */}
      <View style={styles.fullScreenContainer}>
        <View style={[styles.circle, { width: circleSize, height: circleSize }]}>
          {/* Yellow Filling Animation */}
          <Animated.View
            style={[
              styles.fillContainer,
              { 
                width: circleSize, 
                height: circleSize,
                borderRadius: circleSize / 2,
              }
            ]}
          >
            <Animated.View
              style={[
                styles.fill,
                { 
                  height: fillHeight,
                  width: circleSize,
                  borderRadius: circleSize / 2,
                }
              ]}
            />
          </Animated.View>
          
          {/* Thermometer in Center - Circle stays still */}
          <View style={styles.iconContainer}>
            {/* Thermometer with wave animation */}
            <Animated.View
              style={{
                transform: [
                  { 
                    scale: waveAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    })
                  },
                  { 
                    rotate: waveAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '5deg'],
                    })
                  },
                ],
              }}
            >
              <LottieView
                source={require('../../assets/lotties/thermometer.json')}
                style={styles.centerThermometer}
                autoPlay
                loop
              />
            </Animated.View>
            
            {/* White overlay for movement effect */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 140,
                opacity: overlayOpacity,
              }}
            />
          </View>
        </View>
      </View>

        {/* Title Below Circle - Direct on background */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('heating.heating')}</Text>
        </View>
    </View>
  );
};


export default HeatingScreen;