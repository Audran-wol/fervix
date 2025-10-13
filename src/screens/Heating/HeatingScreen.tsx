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
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { useSessionStore } from '../../state';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const HeatingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const backendPhase = useSessionStore(state => state.backendPhase);
  const [progress, setProgress] = useState(0);
  
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

  // Navigate based on backend phase changes
  useEffect(() => {
    console.log('[HeatingScreen] Backend phase changed to:', backendPhase);
    if (backendPhase === 'TREATMENT') {
      console.log('[HeatingScreen] Navigating to Treatment screen');
      navigation.navigate('Treatment' as never);
    } else if (backendPhase === 'ABORT') {
      console.log('[HeatingScreen] Navigating to Aborted screen');
      navigation.navigate('Aborted' as never);
    }
  }, [backendPhase, navigation]);

  useEffect(() => {
    // Start filling animation (visual only, not tied to actual timing)
    Animated.timing(fillAnimation, {
      toValue: 1,
      duration: 15000,
      easing: Easing.out(Easing.quad),
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
          <Text style={styles.subtitle}>{t('heating.doNotApplyYet')}</Text>
        </View>
    </View>
  );
};


export default HeatingScreen;