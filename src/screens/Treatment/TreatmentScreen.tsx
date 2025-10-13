import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  TouchableOpacity, Dimensions, Image, Platform, LayoutRectangle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { useSessionStore } from '../../state';

const { width: W, height: H } = Dimensions.get('window');
const DURATION_MS = 20_000;

export const TreatmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const backendPhase = useSessionStore(state => state.backendPhase);
  const remainingMs = useSessionStore(state => state.remainingMs);

  const [countdown, setCountdown] = useState(Math.floor(DURATION_MS / 1000));
  const screenFill = useRef(new Animated.Value(0)).current;
  const [handLayout, setHandLayout] = useState<LayoutRectangle | null>(null);
  const textColorAnimation = useRef(new Animated.Value(0)).current;

  // === Sizing (unchanged) =====================================================
  const CARD = Math.min(W, H) * 0.70;

  // Phone (UNCHANGED math)
  const PHONE_W = CARD * 0.38;
  const PHONE_H = PHONE_W * 1.90;
  const PHONE_TILT_DEG = 0.8;
  const PHONE_CENTER_SHIFT_X = CARD * 0.01;

  const PLUG_REL_Y = 0.42;
  const PLUG_OFFSET_Y = 7;
  const CONNECTOR_ADJUST_Y = 10;
  const MAX_PEEK_OUT_TOP = -CARD * 0.30;

   // Hand (only thing we reposition)
   const HAND_SCALE = 0.92;
   const HAND_LEFT  = CARD * 0.05;  // arm enters from LEFT, hidden by mask
   const HAND_TOP   = CARD * 0.05;   // hand sits higher in the circle
  // ===========================================================================

  // Navigate based on backend phase changes
  useEffect(() => {
    if (backendPhase === 'COOLDOWN' || backendPhase === 'DONE') {
      navigation.navigate('Cooling' as never);
    } else if (backendPhase === 'ABORT') {
      navigation.navigate('Aborted' as never);
    }
  }, [backendPhase, navigation]);

  // Update countdown from store's remainingMs
  useEffect(() => {
    if (remainingMs !== undefined) {
      setCountdown(Math.ceil(remainingMs / 1000));
    }
  }, [remainingMs]);

  useEffect(() => {
    Animated.timing(screenFill, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Text color animation - changes instantly after 5 seconds
    setTimeout(() => {
      Animated.timing(textColorAnimation, {
        toValue: 1,
        duration: 100, // Very quick transition (almost instant)
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }, 6000);

    return () => {};
  }, []);

  const screenFillHeight = screenFill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, H],
  });

  // Phone position (keep same math)
  const PHONE_LEFT = (CARD - PHONE_W) / 2 + PHONE_CENTER_SHIFT_X;
  let PHONE_TOP = (CARD - PHONE_H) / 2;
  if (handLayout) {
    const plugY = handLayout.y + handLayout.height * PLUG_REL_Y + PLUG_OFFSET_Y;
    let top = plugY - PHONE_H + CONNECTOR_ADJUST_Y;
    if (top < MAX_PEEK_OUT_TOP) top = MAX_PEEK_OUT_TOP;
    PHONE_TOP = top;
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },

    risingFill: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: '#6fc7b4', zIndex: 0,
    },

    safe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
    back: {
      marginTop: 4, marginLeft: 16, width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6, elevation: 3,
    },

    cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 },

    // Outer circle container (no clipping, so phone can peek above)
    cardOuter: {
      width: CARD, height: CARD, borderRadius: CARD / 2,
      backgroundColor: '#FFFFFF',
      overflow: 'visible',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 18 },
      shadowRadius: 36, elevation: 16,
    },

    // Inner mask (same size/shape) — ONLY the hand goes inside here
    circleMask: {
      position: 'absolute', left: 0, top: 0, width: CARD, height: CARD,
      borderRadius: CARD / 2, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center',
    },

    hand: {
      position: 'absolute',
      width: CARD * HAND_SCALE,
      height: CARD * HAND_SCALE,
      left: HAND_LEFT,
      top: HAND_TOP,
      resizeMode: 'contain',
      zIndex: 1,
    },

    // Phone sits ABOVE the mask, so it can overlay at the top like before
    phone: {
      position: 'absolute',
      left: PHONE_LEFT,
      top: PHONE_TOP,
      width: PHONE_W,
      height: PHONE_H,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 3,
      borderColor: '#0F172A',
      borderRadius: 22,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 8,
      elevation: 5,
      transform: [{ rotate: `${PHONE_TILT_DEG}deg` }],
      zIndex: 2,
    },

    phoneNotch: {
      position: 'absolute',
      top: 6, width: '36%', height: 10,
      borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
      backgroundColor: colors.textPrimary,
    },

    countdown: {
      fontSize: 50, fontWeight: '300', color: colors.textPrimary,
      includeFontPadding: false, textAlignVertical: 'center', letterSpacing: -2,
      fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-thin' }),
    },

    titleWrap: { position: 'absolute', bottom: 220, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
    title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  });

  return (
    <View style={s.container}>
      <Animated.View pointerEvents="none" style={[s.risingFill, { height: screenFillHeight }]} />


      <View style={s.cardWrap}>
        <View style={s.cardOuter}>
          {/* Hand is clipped by mask */}
          <View style={s.circleMask}>
            <Image
              source={require('../../assets/images/icons/hand_final.png')}
              style={s.hand}
              onLayout={(e) => setHandLayout(e.nativeEvent.layout)}
            />
          </View>

          {/* Phone overlays above circle like before */}
          <View style={s.phone}>
            <View style={s.phoneNotch} />
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.countdown}>
              {countdown}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.titleWrap}>
        <Animated.Text 
          style={[
            s.title,
            {
              color: textColorAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [colors.textPrimary, '#FFFFFF'],
              }),
            },
          ]}
        >
          {t('treatment.active')}
        </Animated.Text>
      </View>

    </View>
  );
};

export default TreatmentScreen;
