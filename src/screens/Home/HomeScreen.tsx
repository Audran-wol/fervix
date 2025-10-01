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
import { colors, typography } from '../../theme';
import { ProfileCard, SettingToggleRow, InfoCard } from '../../components/ui';
import { useSessionStore } from '../../state/useSessionStore';
import { useSettingsStore } from '../../state/useSettingsStore';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { profile, setProfile } = useSessionStore();
  const { sensitive, setSensitive } = useSettingsStore();

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
                source={require('../../assets/images/icons/sensitive.png')}
                style={styles.sensIcon}
                resizeMode="contain"
              />
            }
            label={t('labels.sensitive')}
            value={sensitive}
            onValueChange={setSensitive}
          />
        </View>

        {/* Instruction pill */}
        <InfoCard style={styles.instructionCard}>
          <Text style={styles.instructionText}>
            {t('start.instruction')}
          </Text>
        </InfoCard>

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

        {/* Illustration (no circle): bobbing image + rising pulse */}
        <View style={styles.illustrationWrap}>
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
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const P = 16;
const LIGHT_RED = '#FFF1F1';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: P, paddingBottom: 24, gap: 16 },

  /* AppBar */
  appBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.border,
  },

  /* Grid */
  grid: { flexDirection: 'row', columnGap: 12 },
  gridItem: { flex: 1, minHeight: 164 },

  /* Sensitive card (soft; no dark borders) */
  sensitiveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#101828',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  /* Clean Sensitive icon - no card */
  sensIcon: {
    width: 40,
    height: 40,
    tintColor: colors.primary,
  },

  /* Instruction pill */
  instructionCard: {
    backgroundColor: '#FFF3F3',
    borderRadius: 18,
    borderWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
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
  illustration: { width: 200, height: 200 },

  /* Pulse (from below, subtle) */
  pulse: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: LIGHT_RED,
    borderWidth: 2,
    borderColor: 'rgba(224,25,25,0.22)',
  },

  /* Hint */
  pulseHint: { marginTop: 8, fontSize: 12, color: '#6B7280' },

  /* Warm-up Button */
  warmupButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
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

export default HomeScreen;
