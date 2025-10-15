import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated, Easing, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { FvButton, FvCard } from '../../components';
import { useTheme } from '../../theme/useTheme';
import { useSessionStore } from '../../state';

export const AbortedScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { profile, requestStart } = useSessionStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
    },
    gradient: {
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
      borderWidth: 3,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    warningIcon: {
      width: 100,
      height: 100,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#ef4444',
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginBottom: 40,
      paddingHorizontal: 20,
      lineHeight: 26,
    },
    card: {
      width: '100%',
      backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    cardText: {
      fontSize: 15,
      lineHeight: 22,
      color: isDark ? '#d1d5db' : '#4b5563',
    },
    bulletPoint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    bullet: {
      color: '#ef4444',
      fontSize: 16,
      marginRight: 8,
      marginTop: 2,
    },
    bulletText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: isDark ? '#d1d5db' : '#4b5563',
    },
    buttonContainer: {
      width: '100%',
      gap: 16,
      marginTop: 20,
    },
    retryButton: {
      backgroundColor: '#ef4444',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    retryButtonText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '700',
    },
    homeButton: {
      backgroundColor: 'transparent',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
    },
    homeButtonText: {
      color: isDark ? '#d1d5db' : '#4b5563',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#2a2a2a'] : ['#fef2f2', '#ffffff']}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <LottieView
              source={require('../../assets/lotties/warning_abort.json')}
              style={styles.warningIcon}
              autoPlay
              loop={false}
            />
          </View>

          <Text style={styles.title}>{t('aborted.title')}</Text>
          <Text style={styles.subtitle}>{t('aborted.stoppedDescription')}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 {t('aborted.reason')}</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Device disconnected during treatment</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Power monitoring signal was lost</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Treatment safety threshold not met</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 {t('aborted.nextSteps')}</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Ensure device is properly connected</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Check that phone is not charging</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Try restarting the treatment</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                requestStart({ presetId: profile });
                navigation.navigate('Heating' as never);
              }}
            >
              <Text style={styles.retryButtonText}>🔄 Retry Treatment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' as never }],
                });
              }}
            >
              <Text style={styles.homeButtonText}>🏠 Return Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};


export default AbortedScreen;
