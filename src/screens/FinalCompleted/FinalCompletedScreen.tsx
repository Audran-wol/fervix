import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export const FinalCompletedScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },

    // Background glows (kept from your version)
    backgroundContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
    baseWhite: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    glow: { position: 'absolute', borderRadius: 9999 },
    glowTopRight: { width: 420, height: 420, right: -140, top: -120, backgroundColor: 'rgba(224, 25, 25, 0.10)' },
    glowCenterWhite: { width: 360, height: 360, left: '50%', top: '28%', marginLeft: -180, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    glowBottomRight: { width: 520, height: 420, right: -220, bottom: -160, backgroundColor: 'rgba(230, 242, 255, 0.28)' },
    glowBottomLeft: { width: 380, height: 380, left: -140, bottom: -100, backgroundColor: 'rgba(16, 185, 129, 0.08)' },

    // Back button
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
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

    // Content
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
      paddingBottom: 100,
      zIndex: 10,
    },

    // Circular card that masks the Lottie (like your photo)
    circleCard: {
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden', // mask Lottie to a perfect circle
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 12,
    },

    // Lottie inside the inner plate
    successAnimation: {
      width: '80%',
      aspectRatio: 1,
    },

    // Small caption
    caption: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: Platform.select({ ios: '600' as any, android: '600' as any }) as any,
      color: isDark ? colors.textPrimary : '#8A8F98',
      textAlign: 'center',
      letterSpacing: 0.2,
    },
  });

  useEffect(() => {
    // Auto-redirect to home screen after 10 seconds
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' } as never],
      });
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={s.container}>
      {/* Content */}
      <View style={s.content}>
        <View style={s.circleCard}>
          <LottieView
            ref={animationRef}
            source={require('../../assets/lotties/success_check.json.json')}
            style={s.successAnimation}
            autoPlay
            loop={false}
          />
        </View>

        <Text style={s.caption}>
          {t('treatment.completed')}
        </Text>
      </View>
    </View>
  );
};

export default FinalCompletedScreen;
