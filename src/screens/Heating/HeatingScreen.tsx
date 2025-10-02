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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const HeatingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [progress, setProgress] = useState(0);
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFD700', // Strong yellow background
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
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
      zIndex: 10,
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
      backgroundColor: colors.surface,
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
      backgroundColor: '#FCD34D', // Yellow filling color
    },
    iconContainer: {
      width: 320,
      height: 320,
      borderRadius: 160,
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
  heatIcon: {
    width: 200,
    height: 200,
    // Remove tintColor to keep original yellow color
  },
    titleContainer: {
      position: 'absolute',
      bottom: 160,
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
    subtitle: {
      fontSize: 18,
      fontWeight: 'normal',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 8,
      opacity: 0.8,
    },
  });
  
  // Animation values
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const iconShakeX = useRef(new Animated.Value(0)).current;
  const iconShakeY = useRef(new Animated.Value(0)).current;

  const circleSize = Math.max(screenWidth, screenHeight) * 4.2;

  useEffect(() => {
    // Start filling animation (slower)
    Animated.timing(fillAnimation, {
      toValue: 1,
      duration: 15000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Create shaking animation for heating effect - only on the icon
    const shakeAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(iconShakeX, {
              toValue: 3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(iconShakeY, {
              toValue: -2,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(iconShakeX, {
              toValue: -3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(iconShakeY, {
              toValue: 2,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(iconShakeX, {
              toValue: 2,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(iconShakeY, {
              toValue: -1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(iconShakeX, {
              toValue: -2,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(iconShakeY, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(iconShakeX, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(iconShakeY, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    // Start shaking animation
    shakeAnimation();

    // Update progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // Use setTimeout to navigate outside of setState
          setTimeout(() => {
            navigation.navigate('Treatment' as never);
          }, 100);
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
    <View style={styles.container}>
      {/* Back Button - Top Left */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

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
          
          {/* Heat Icon in Center - Circle stays still */}
          <View style={styles.iconContainer}>
            {/* Only the heat waves icon shakes, not the container */}
            <Animated.View
              style={{
                transform: [
                  { translateX: iconShakeX },
                  { translateY: iconShakeY },
                ],
              }}
            >
              <Image
                source={require('../../assets/images/icons/heat_waves.png')}
                style={styles.heatIcon}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </View>
      </View>

        {/* Title Below Circle - Direct on background */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('heating.heating')}</Text>
          <Text style={styles.subtitle}>do not apply yet</Text>
        </View>
    </View>
  );
};


export default HeatingScreen;