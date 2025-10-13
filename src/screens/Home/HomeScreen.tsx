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
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { ProfileCard, SettingToggleRow, InfoCard } from '../../components/ui';
import { useSessionStore } from '../../state/useSessionStore';
import { useSettingsStore } from '../../state/useSettingsStore';
import { PowerController } from '../../state/power';
import type { SampleEvent } from '../../state/power';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { profile, setProfile } = useSessionStore();
  const { sensitive, setSensitive } = useSettingsStore();
  const [showDeviceImage, setShowDeviceImage] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceDetectionThreshold, setDeviceDetectionThreshold] = useState<number>(-0.7);
  const scrollViewRef = useRef<ScrollView>(null);

  // Refs to hold latest values for use in subscriber callbacks
  const thresholdRef = useRef(deviceDetectionThreshold);
  const connectedRef = useRef(false);

  // Keep threshold ref fresh + sync native
  useEffect(() => {
    thresholdRef.current = deviceDetectionThreshold;                 // always latest for subscriber
    PowerController.setDeviceDetectionThreshold(deviceDetectionThreshold); // keep native in sync
    console.log(`[HomeScreen] Threshold updated to: ${deviceDetectionThreshold}mA`);
  }, [deviceDetectionThreshold]);

  // Method to update threshold from external source (like DevPowerScreen)
  const updateThreshold = (newThreshold: number) => {
    console.log(`[HomeScreen] Updating threshold to: ${newThreshold}mA`);
    setDeviceDetectionThreshold(newThreshold);
  };

  // Expose updateThreshold method globally for DevPowerScreen to use
  useEffect(() => {
    (window as any).updateHomeScreenThreshold = updateThreshold;
    
    // Try to sync with DevPowerScreen threshold if it's already set
    if ((window as any).getDevPowerScreenThreshold) {
      const devThreshold = (window as any).getDevPowerScreenThreshold();
      if (devThreshold !== deviceDetectionThreshold) {
        console.log(`[HomeScreen] Syncing with DevPowerScreen threshold: ${devThreshold}mA`);
        setDeviceDetectionThreshold(devThreshold);
      }
    }
    
    return () => {
      delete (window as any).updateHomeScreenThreshold;
    };
  }, []);

  // Detection logic (same as DevPowerScreen)
  const isDetected = (current: number, _baseline: number, threshold: number) =>
    Number.isFinite(current) && Number.isFinite(threshold) &&
    current < threshold;

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
      backgroundColor: '#D1D5DB',
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
      width: 280,
      height: 280,
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
  const deviceImageImpulse = useRef(new Animated.Value(1)).current;

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

    // Device image impulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(deviceImageImpulse, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(deviceImageImpulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [bob, pulsePhase, deviceImageImpulse]);

      // HomeScreen detection - only when Home is focused
      useEffect(() => {
        if (!isFocused) return; // only run when Home is visible

        console.log('[HomeScreen] startSession + subscribe(Sample)');
        PowerController.startSession({ presetId: profile });

        const unsub = PowerController.subscribe('Sample', (event: SampleEvent) => {
          const cur = Number.isFinite(event.current_mA) ? event.current_mA! : undefined;
          if (cur === undefined) return;

          const thr = thresholdRef.current;              // latest threshold (no stale closure)
          const detected = Number.isFinite(thr) && cur <= thr;

          console.log(`[HomeScreen] Detection check: current=${cur}mA, threshold=${thr}mA, detected=${detected}`);

          // Use a ref so we don't rely on React's async state inside the callback
          if (detected && !connectedRef.current) {
            connectedRef.current = true;
            setDeviceConnected(true);
            setShowDeviceImage(true);
            console.log('[HomeScreen] 🔌 Setting showDeviceImage to TRUE');

            // Start the image animation
            Animated.timing(deviceImagePulse, {
              toValue: 1,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start();

            // small, consistent delay like your PM screen UX
            setTimeout(() => {
              try {
                const { requestStart } = useSessionStore.getState();
                requestStart({ presetId: profile });     // kick off heating
              } finally {
                setShowDeviceImage(false);
                setDeviceConnected(false);
                connectedRef.current = false;
                deviceImagePulse.setValue(0);
                navigation.navigate('Heating' as never);
              }
            }, 5000);
          }

          if (!detected && connectedRef.current) {
            connectedRef.current = false;
            setDeviceConnected(false);
            setShowDeviceImage(false);
            deviceImagePulse.setValue(0);
          }
        });

        // focus/cleanup
        return () => {
          console.log('[HomeScreen] cleanup: unsubscribe + stopSession');
          unsub();
          PowerController.stopSession();
        };
      }, [isFocused, profile, navigation]);   // ⬅️ IMPORTANT: no deviceConnected here

  const bobTranslate = bob.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  // Pulse rising from below (subtle; doesn't resize the section)
  const pulseTranslateY = pulsePhase.interpolate({ inputRange: [0, 1], outputRange: [28, -6] });
  const pulseScale = pulsePhase.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.6] });
  const pulseOpacity = pulsePhase.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] });

  // Handle device insertion click (manual trigger)
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

    // Start the power controller session using current profile
    const { requestStart } = useSessionStore.getState();
    requestStart({ presetId: profile });

    // Wait 5 seconds before navigating (same as automatic detection)
    setTimeout(() => {
      setShowDeviceImage(false);
      setDeviceConnected(false);
      deviceImagePulse.setValue(0);
      navigation.navigate('Heating' as never);
    }, 5000);
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
            iconSource={require('../../assets/images/icons/other child.png')}
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
                source={require('../../assets/images/icons/new_sensitive.png')}
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


        {/* Insert Device Instruction - Automatic Detection Only */}
        <View style={styles.insertDeviceCard}>
            <Text style={styles.insertDeviceText}>
              {deviceConnected ? 'Device Connected' : t('start.insertDevice')}
            </Text>
        </View>

        {/* Device Image Display */}
        {showDeviceImage && (
          <View style={styles.deviceImageContainer}>
            {console.log('[HomeScreen] 🔍 Rendering phone_wrist.png image')}
            <Animated.Image
              source={require('../../assets/images/icons/phone_wrist.png')}
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
                  ].concat(
                    showDeviceImage ? [
                      {
                        scale: deviceImageImpulse,
                      },
                    ] : []
                  ),
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
