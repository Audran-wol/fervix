import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export const FinalCompletedScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const animationRef = useRef<LottieView>(null);

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

const styles = StyleSheet.create({
  /* Screen */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* >>> New background (pure Views, whisper-soft) */
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  baseWhite: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // keeps center bright
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },

  /* Content (unchanged) */
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 60,
    zIndex: 10,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  successAnimation: {
    width: 280,
    height: 280,
    marginBottom: 24,
  },
  completedText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  newSessionButton: {
    backgroundColor: '#E01919',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16, // Increased from 12 to 16 for more rounded
    shadowColor: '#E01919',
    shadowOffset: { width: 0, height: 4 }, // Softer shadow (was 6)
    shadowOpacity: 0.2, // Softer shadow (was 0.25)
    shadowRadius: 10, // Softer shadow (was 12)
    elevation: 4, // Softer shadow (was 6)
    minWidth: 240,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default FinalCompletedScreen;
