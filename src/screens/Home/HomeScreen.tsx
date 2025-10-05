import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProfileCard, SettingToggleRow, InfoCard } from '../../components/ui';
import { useSessionStore } from '../../state/useSessionStore';
import { useSettingsStore } from '../../state/useSettingsStore';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { profile, setProfile } = useSessionStore();
  const { sensitive, setSensitive } = useSettingsStore();
  const [showDeviceImage, setShowDeviceImage] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    scroll: { flex: 1 },
    // remove global gap here – it was adding extra space between logo and cards
    content: { paddingHorizontal: 16, paddingBottom: 24 },

    /* AppBar / Logo */
    appBar: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
      paddingTop: Math.max(insets.top,5), // bring logo down a little
      paddingBottom: 0,                    // no bottom padding (kills the gap)
      marginBottom: -30,                     // reduce margin bottom
    },
    logoImage: {
      width: 390,
      height: 130,
      alignSelf: 'center',
      resizeMode: 'contain',
      marginLeft: 13,
    },

    /* Grid */
    grid: { flexDirection: 'row', columnGap: 16, marginTop: 4 }, // nudge closer to the logo
    gridItem: { flex: 1, minHeight: 220 },

    /* Sensitive card (soft; no dark borders) */
    sensitiveCard: {
      backgroundColor: colors.card,
      borderRadius: 32,
      borderWidth: 0,
      paddingHorizontal: 12,
      paddingVertical: 12,
      shadowColor: '#000',
      shadowOpacity: 0.10,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      marginTop: 14,
    },

    /* Clean Sensitive icon - no card */
    sensIcon: {
      width: 80,
      height: 80,
    },

    /* Insert Device Card */
    insertDeviceCard: {
      backgroundColor: '#E3F2FD',
      borderRadius: 32,
      borderWidth: 0,
      paddingHorizontal: 20,
      paddingVertical: 16,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
      minHeight: 70,
      marginTop: 12,
      marginBottom: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    insertDeviceText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 24,
    },
    instructionText: {
      ...typography.textStyles.body,
      color: colors.textPrimary,
      textAlign: 'center',
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
    },

    /* Illustration area */
    illustrationWrap: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: 6,
      position: 'relative',
      paddingVertical: 12,
    },
    illustration: {
      width: 200,
      height: 200,
    },

    /* Pulse (from below, subtle) */
    pulse: {
      position: 'absolute',
      bottom: 8,
      alignSelf: 'center',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors['primary-100'],
      borderWidth: 2,
      borderColor: 'rgba(224,25,25,0.22)',
    },

    /* Hint */
    pulseHint: { marginTop: 8, fontSize: 12, color: colors.textMuted },

    /* Device Image Display */
    deviceImageContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      paddingVertical: 8,
    },
    deviceImage: {
      width: 160,
      height: 160,
      resizeMode: 'contain',
    },
    deviceImagePulse: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors['primary-100'],
      borderWidth: 2,
      borderColor: 'rgba(224,25,25,0.2)',
    },
  });

  // Animations (bobbing + pulse-from-below)
  const bob = useRef(new Animated.Value(0)).current;
  const pulsePhase = useRef(new Animated.Value(0)).current;
  const deviceImagePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: -1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(pulsePhase, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true })
    ).start();
  }, [bob, pulsePhase]);

  const bobTranslate = bob.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  // Pulse rising from below (subtle; doesn't resize the section)
  const pulseTranslateY = pulsePhase.interpolate({ inputRange: [0, 1], outputRange: [28, -6] });
  const pulseScale = pulsePhase.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.6] });
  const pulseOpacity = pulsePhase.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] });

  // Handle device insertion click
  const handleDeviceInsertion = () => {
    setShowDeviceImage(true);
    setDeviceConnected(true);

    // Simple fade in animation for the image
    Animated.timing(deviceImagePulse, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Hide image after 3 seconds and navigate
    setTimeout(() => {
      setShowDeviceImage(false);
      setDeviceConnected(false);
      deviceImagePulse.setValue(0);
      navigation.navigate('Heating' as never);
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* AppBar / Logo */}
        <View style={styles.appBar}>
          <Image
            // keep your original asset name: fervix_logo
            source={require('../../assets/images/logos/fervix_logo.png')}
            style={styles.logoImage}
          />
        </View>

        {/* Profile grid */}
        <View style={styles.grid}>
          <ProfileCard
            label={t('start.child')}
            iconSource={require('../../assets/images/icons/ic_child.png')}
            selected={profile === 'child'}
            onPress={() => setProfile('child')}
            style={styles.gridItem}
            isChild={true}
          />
          <ProfileCard
            label={t('start.adult')}
            iconSource={require('../../assets/images/icons/ic_adult.png')}
            selected={profile === 'adult'}
            onPress={() => setProfile('adult')}
            style={styles.gridItem}
          />
        </View>

        {/* Sensitive Skin (clean, no card) */}
        <View style={styles.sensitiveCard}>
          <SettingToggleRow
            leftIcon={
              <Image
                source={require('../../assets/images/icons/sensitive2.png')}
                style={[
                  styles.sensIcon,
                  { tintColor: sensitive ? colors.primary : '#9CA3AF' },
                ]}
                resizeMode="contain"
              />
            }
            label={t('labels.sensitive')}
            value={sensitive}
            onValueChange={setSensitive}
          />
        </View>

        {/* Insert Device Instruction - Clickable */}
        <TouchableOpacity 
          style={styles.insertDeviceCard}
          onPress={handleDeviceInsertion}
          activeOpacity={0.8}
        >
        <Text style={styles.insertDeviceText}>
          {deviceConnected ? t('start.deviceConnected') : t('start.insertDevice')}
        </Text>
        </TouchableOpacity>

        {/* Device Image Display */}
        {showDeviceImage && (
          <View style={styles.deviceImageContainer}>
            <Animated.Image
              source={require('../../assets/images/illustrations/phone_over_wrist.png')}
              style={[
                styles.deviceImage,
                {
                  opacity: deviceImagePulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                  transform: [
                    {
                      scale: deviceImagePulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
