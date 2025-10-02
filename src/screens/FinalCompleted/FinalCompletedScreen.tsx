import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  const styles = StyleSheet.create({
    /* Screen */
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },

    /* >>> New background (pure Views, whisper-soft) */
    backgroundContainer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
    },
    baseWhite: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    glow: {
      position: 'absolute',
      borderRadius: 9999,
      // For Android, simulate softness via larger size + lower opacity (no blur needed)
    },
    glowTopRight: {
      width: 420,
      height: 420,
      right: -140,
      top: -120,
      backgroundColor: 'rgba(224, 25, 25, 0.10)', // brand red (very light)
    },
    glowCenterWhite: {
      width: 360,
      height: 360,
      left: '50%',
      top: '28%',
      marginLeft: -180,
      backgroundColor: isDark ? colors.surface : '#FFFFFF', // keeps center bright
    },
    glowBottomRight: {
      width: 520,
      height: 420,
      right: -220,
      bottom: -160,
      backgroundColor: 'rgba(230, 242, 255, 0.28)', // cool whisper tint
    },
    glowBottomLeft: {
      width: 380,
      height: 380,
      left: -140,
      bottom: -100,
      backgroundColor: 'rgba(16, 185, 129, 0.08)', // soft green accent
    },

    /* Back button (unchanged) */
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

    /* Content (improved layout) */
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
      paddingBottom: 100, // Add more bottom padding to avoid navbar
      zIndex: 10,
    },
    successContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40, // Add space between content and button
    },
    successAnimation: {
      width: 280,
      height: 280,
      marginBottom: 24,
    },
    completedText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    subtitleText: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 40,
      fontWeight: '500',
    },
    newSessionButton: {
      backgroundColor: colors.primary,
      paddingVertical: 20,
      paddingHorizontal: 48,
      borderRadius: 20, // More rounded for modern look
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      minWidth: 280,
      alignSelf: 'center',
      marginTop: 20, // Add margin from content above
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
  });

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  const handleStartNewSession = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' } as never],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Upgraded subtle background (no new libs) */}
      <View style={styles.backgroundContainer}>
        {/* Base white sheet */}
        <View style={styles.baseWhite} />

        {/* Top-right brand glow */}
        <View style={[styles.glow, styles.glowTopRight]} />

        {/* Center soft lift (keeps content bright) */}
        <View style={[styles.glow, styles.glowCenterWhite]} />

        {/* Bottom-right cool tint */}
        <View style={[styles.glow, styles.glowBottomRight]} />

        {/* Bottom-left accent glow */}
        <View style={[styles.glow, styles.glowBottomLeft]} />
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' } as never],
          })
        }
      >
        <Ionicons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.successContainer}>
          {/* ⬇️ keep your Lottie exactly */}
          <LottieView
            ref={animationRef}
            source={require('../../assets/lotties/success_check.json.json')}
            style={styles.successAnimation}
            autoPlay
            loop={false}
          />
          <Text style={styles.completedText}>{t('completed.title')}</Text>
          <Text style={styles.subtitleText}>{t('completed.successDescription')}</Text>
        </View>

        <TouchableOpacity
          style={styles.newSessionButton}
          onPress={handleStartNewSession}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('buttons.startNewSession')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


export default FinalCompletedScreen;
