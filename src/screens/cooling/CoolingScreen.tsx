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
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const DURATION = 10_000; // 10s

export const CoolingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [countdown, setCountdown] = useState(Math.floor(DURATION / 1000));

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    backButton: {
      marginTop: 8,
      marginLeft: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    centerWrap: {
      position: 'absolute',
      inset: 0 as any,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    circle: {
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 18 },
      shadowRadius: 36,
      elevation: 16,
    },

    fillMask: { position: 'absolute', bottom: 0, left: 0, overflow: 'hidden' },
    fill: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      backgroundColor: '#3B82F6',
    },

    iconContainer: {
      width: 250,
      height: 250,
      borderRadius: 125,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    coolIcon: { 
    width: 120, 
    height: 120, 
    tintColor: '#3B82F6',
  },
    countdownText: {
      marginTop: 6,
      fontSize: 40,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },

    titleContainer: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 10,
    },
  });

  // Animations - EXACTLY like treatment screen
  const fillAnim = useRef(new Animated.Value(0)).current; // 0 -> 1 (like treatment)
  const iconPulse = useRef(new Animated.Value(1)).current;

  const circleSize = Math.max(screenWidth, screenHeight) * 3.5;

  useEffect(() => {
    // Fill animation - EXACTLY like treatment screen
    Animated.timing(fillAnim, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Icon pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Countdown - EXACTLY like treatment screen
    const startedAt = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, Math.ceil((DURATION - elapsed) / 1000));
      setCountdown(left);
      if (left <= 0) {
        clearInterval(tick);
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: 'MainTabs' as never,
                  state: {
                    routes: [{ name: 'FinalCompleted' as never }],
                    index: 0,
                  } as never,
                } as never,
              ],
            })
          );
        }, 400);
      }
    }, 200);

    return () => clearInterval(tick);
  }, []);

  // EMPTYING animation: fillAnim goes 0->1, but we want height to go circleSize->0
  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circleSize, 0], // Reversed: starts full, empties down
  });

  return (
    <View style={styles.container}>
      {/* Back */}
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Big circle */}
      <View style={styles.centerWrap}>
        <View style={[styles.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
          {/* Blue fill starts full and empties DOWN over 10s */}
          <View style={[styles.fillMask, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
            <Animated.View style={[styles.fill, { width: circleSize, height: fillHeight }]} />
          </View>

          {/* Cooling icon + countdown */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconPulse }] }]}>
            <Image
              source={require('../../assets/images/icons/cool_down.png')}
              style={styles.coolIcon}
              resizeMode="contain"
            />
            <Text style={styles.countdownText}>{countdown}</Text>
          </Animated.View>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{t('cooling.cooling')}</Text>
      </View>
    </View>
  );
};


export default CoolingScreen;
