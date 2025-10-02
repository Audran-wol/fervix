import React, { useEffect, useRef } from 'react';
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },

    /* AppBar */
    appBar: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    logoText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.primary,
      letterSpacing: 2,
      textAlign: 'center',
    },
    appBarDivider: {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: '#E5E7EB',
    },

    /* Grid */
    grid: { flexDirection: 'row', columnGap: 16, marginTop: 12 },
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
    },

    /* Clean Sensitive icon - no card */
    sensIcon: {
      width: 80,
      height: 80,
    },

    /* Insert Device Card */
    insertDeviceCard: {
      backgroundColor: '#E3F2FD',
      borderRadius: 40,
      borderWidth: 0,
      paddingHorizontal: 28,
      paddingVertical: 28,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
      minHeight: 100,
      marginBottom: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    insertDeviceText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 28,
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

    /* Warm-up Button */
    warmupButton: {
      backgroundColor: colors.primary,
      borderRadius: 32,
      paddingVertical: 18,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
      gap: 12,
    },
    warmupIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    warmupIcon: {
      width: 20,
      height: 20,
      tintColor: '#FFFFFF',
    },
    warmupButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

  // Animations (bobbing + pulse-from-below)
  const bob = useRef(new Animated.Value(0)).current;
  const pulsePhase = useRef(new Animated.Value(0)).current;

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* AppBar / Text Logo */}
        <View style={[styles.appBar, { paddingTop: insets.top + 8, height: 96 }]}>
          <Text style={styles.logoText}>FERVIX</Text>
          <View style={styles.appBarDivider} />
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
                  { tintColor: sensitive ? colors.primary : '#9CA3AF' }
                ]}
                resizeMode="contain"
              />
            }
            label={t('labels.sensitive')}
            value={sensitive}
            onValueChange={setSensitive}
          />
        </View>


        {/* Warm-up Button */}
        <TouchableOpacity 
          style={styles.warmupButton}
          onPress={() => navigation.navigate('Heating' as never)}
          activeOpacity={0.8}
        >
          <View style={styles.warmupIconContainer}>
            <Image
              source={require('../../assets/images/icons/ic_heat.png')}
              style={styles.warmupIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.warmupButtonText}>{t('buttons.startTreatment')}</Text>
        </TouchableOpacity>

        {/* Insert Device Instruction */}
        <View style={styles.insertDeviceCard}>
          <Text style={styles.insertDeviceText}>
            {t('start.insertDevice')}
          </Text>
        </View>

        {/* Illustration (commented out) */}
        {/* <View style={styles.illustrationWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pulse,
              { opacity: pulseOpacity, transform: [{ translateY: pulseTranslateY }, { scale: pulseScale }] },
            ]}
          />
          <Animated.Image
            source={require('../../assets/images/illustrations/phone_over_wrist.png')}
            style={[styles.illustration, { transform: [{ translateY: bobTranslate }] }]}
            resizeMode="contain"
          />
          <Text style={styles.pulseHint}>Connect the device to begin</Text>
        </View> */}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
};


export default HomeScreen;
