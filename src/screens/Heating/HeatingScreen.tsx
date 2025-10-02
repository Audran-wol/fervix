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
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
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
  heatIcon: {
    width: 120,
    height: 120,
    tintColor: '#6B7280',
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
  
  // Animation values
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

    const circleSize = Math.max(screenWidth, screenHeight) * 4.2; // Increased from 3.5 to 4.2

  useEffect(() => {
    // Start filling animation (slower)
    Animated.timing(fillAnimation, {
      toValue: 1,
      duration: 15000, // Increased from 8000 to 15000 (slower)
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Start icon pulse animation (gentle, no shaking)
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

    // Remove icon rotation animation - keep icon static

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
      }, 150); // Slower progress update to match animation

    return () => {
      clearInterval(progressInterval);
    };
  }, []);

  const fillHeight = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circleSize],
  });

    // Removed rotation interpolation - icon is now static

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
          
            {/* Static Heat Icon in Center */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    { scale: iconPulse },
                  ],
                }
              ]}
            >
              <Image
                source={require('../../assets/images/icons/ic_heat.png')}
                style={styles.heatIcon}
                resizeMode="contain"
              />
            </Animated.View>
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