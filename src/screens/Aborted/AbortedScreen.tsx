import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../../theme/useTheme';
import { useSettingsStore } from '../../state/useSettingsStore';
import * as Haptics from 'expo-haptics';

export const AbortedScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { soundOn, vibrationOn } = useSettingsStore();
  const soundRef = useRef<Audio.Sound | null>(null);

  // CRITICAL: Stop all playing sounds when AbortedScreen appears
  // This runs immediately when the screen is focused (appears)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[AbortedScreen] 🔇 Screen focused - stopping all previous sounds (including heat_loop)');
      
      // Set audio mode to interrupt any playing sounds
      // This helps stop sounds from previous screens
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      }).catch((e) => {
        console.log('[AbortedScreen] Audio mode error:', e);
      });
      
      // Note: We can't directly stop HeatingScreen's soundRef, but setting audio mode
      // should help interrupt it. The HeatingScreen cleanup should also handle it.
    }, [])
  );

  // Play error sound/vibration (runs AFTER stopping previous sounds)
  useEffect(() => {
    (async () => {
      try {
        // CRITICAL: Wait a moment to ensure heating sound is fully stopped
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Stop all sounds again to be absolutely sure
        await Audio.stopAllSoundsAsync().catch(() => {});
        
        // Play sound if enabled
        if (soundOn) {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            staysActiveInBackground: false,
            playThroughEarpieceAndroid: false,
          });
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sound/ES_Error Tone, Soft - Epidemic Sound.mp3'),
            { shouldPlay: true, isLooping: false, volume: 0.8 }
          );
          soundRef.current = sound;
          console.log('[AbortedScreen] 🔔 Playing error tone (heating sound should be stopped)');
        }
        
        // Play vibration if enabled
        if (vibrationOn) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          console.log('[AbortedScreen] 📳 Playing error vibration');
        }
      } catch (e) {
        console.log('[AbortedScreen] Sound/vibration init error:', e);
      }
    })();
    
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, [soundOn, vibrationOn]);

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },

    // Background glows (kept from FinalCompletedScreen)
    backgroundContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
    baseWhite: { ...StyleSheet.absoluteFillObject, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    glow: { position: 'absolute', borderRadius: 9999 },
    glowTopRight: { width: 420, height: 420, right: -140, top: -120, backgroundColor: 'rgba(239, 68, 68, 0.10)' },
    glowCenterWhite: { width: 360, height: 360, left: '50%', top: '28%', marginLeft: -180, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    glowBottomRight: { width: 520, height: 420, right: -220, bottom: -160, backgroundColor: 'rgba(239, 68, 68, 0.08)' },
    glowBottomLeft: { width: 380, height: 380, left: -140, bottom: -100, backgroundColor: 'rgba(239, 68, 68, 0.08)' },

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

    // Circular card that masks the image (like FinalCompletedScreen)
    circleCard: {
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden', // mask image to a perfect circle
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowOffset: { width: 0, height: 18 },
      shadowRadius: 36,
      elevation: 16,
    },

    // Image inside the circle
    cancelledImage: {
      width: '80%',
      aspectRatio: 1,
    },

    // Caption (same typography as FinalCompletedScreen)
    caption: {
      marginTop: 14,
      fontSize: 22,
      fontWeight: Platform.select({ ios: '700' as any, android: '700' as any }) as any,
      color: isDark ? colors.textPrimary : '#374151',
      textAlign: 'center',
      letterSpacing: 0.2,
    },

    // Subtitle
    subtitle: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: Platform.select({ ios: '500' as any, android: '500' as any }) as any,
      color: isDark ? colors.textMuted : '#6B7280',
      textAlign: 'center',
      letterSpacing: 0.1,
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
          <Image
            source={require('../../assets/images/icons/cancelled.webp')}
            style={s.cancelledImage}
            resizeMode="contain"
          />
        </View>

        <Text style={s.caption}>
          {t('aborted.title')}
        </Text>

        <Text style={s.subtitle}>
          Treatment aborted prematurely!
        </Text>
      </View>
    </View>
  );
};


export default AbortedScreen;
