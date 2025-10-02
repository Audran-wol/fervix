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

const { width: W, height: H } = Dimensions.get('window');
const DURATION_MS = 20_000;

export const TreatmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [countdown, setCountdown] = useState(Math.floor(DURATION_MS / 1000));
  const screenFill = useRef(new Animated.Value(0)).current; // 0..1
  const pulse = useRef(new Animated.Value(1)).current;      // scale

  const [handLayout, setHandLayout] = useState<LayoutRectangle | null>(null);

  // ===== TUNING KNOBS =========================================================
  const CARD = Math.min(W, H) * 0.70;      // circle

  // Hand: LOWER so device stays visible
  const HAND_SCALE   = 0.85;
  const HAND_RIGHT   = -CARD * 0.01;
  const HAND_BOTTOM  = CARD * 0.005;        // ↓ lower than before (was 0.06)

  // Phone size & pose
  const PHONE_W = CARD * 0.4;
  const PHONE_H = PHONE_W * 1.90;
  const PHONE_TILT_DEG = 0.8;               // tilt to the RIGHT
  const PHONE_CENTER_SHIFT_X = CARD * 0.17;// tiny right shift so it looks centered

  // Snap to device: we only use Y (vertical) so phone stays horizontally centered
  const PLUG_REL_Y = 0.42;                 // 0..1 from top-left of hand PNG
  const PLUG_OFFSET_Y = 7;

  // More top peek (more negative = higher)
  const MAX_PEEK_OUT_TOP = -CARD * 0.30;   // allow more phone above circle

  // Slight tuck into device
  const CONNECTOR_ADJUST_Y = -6;
  // ===========================================================================

  useEffect(() => {
    Animated.timing(screenFill, { toValue: 1, duration: DURATION_MS, easing: Easing.linear, useNativeDriver: false }).start();
    // Removed pulse animation for the circle

    const startedAt = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
      setCountdown(left);
      if (left <= 0) {
        clearInterval(tick);
        setTimeout(() => navigation.navigate('Completed' as never), 400);
      }
    }, 200);
    return () => clearInterval(tick);
  }, []);

  const screenFillHeight = screenFill.interpolate({ inputRange: [0, 1], outputRange: [0, H] });

  // Phone centered horizontally; vertically snapped to sit just over the device
  const PHONE_LEFT = (CARD - PHONE_W) / 2 + PHONE_CENTER_SHIFT_X;
  let PHONE_TOP = (CARD - PHONE_H) / 2; // fallback

  if (handLayout) {
    const plugY = handLayout.y + handLayout.height * PLUG_REL_Y + PLUG_OFFSET_Y;
    let top = plugY - PHONE_H + CONNECTOR_ADJUST_Y;
    if (top < MAX_PEEK_OUT_TOP) top = MAX_PEEK_OUT_TOP; // only top edge outside
    PHONE_TOP = top;
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.surface : '#FFFFFF' },

    risingFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.info, zIndex: 0 },

    safe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
    back: {
      marginTop: 4, marginLeft: 16, width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6, elevation: 3,
    },

    cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 },

    card: {
      width: CARD, height: CARD, borderRadius: CARD / 2,
      backgroundColor: colors.card,
      overflow: 'visible', // allow the phone’s top to peek out
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 18 },
      shadowRadius: 36, elevation: 16,
    },

    hand: {
      position: 'absolute',
      width: CARD * HAND_SCALE,
      height: CARD * HAND_SCALE,
      right: HAND_RIGHT,
      bottom: HAND_BOTTOM,
      resizeMode: 'contain',
      zIndex: 1, // behind phone
    },

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
      borderColor: '#000000',
      borderRadius: 22,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 8,
      elevation: 5,
      transform: [{ rotate: `${PHONE_TILT_DEG}deg` }], // static string OK
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

    titleWrap: { position: 'absolute', bottom: 198, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
  });

  return (
    <View style={s.container}>
      {/* Rising blue fill — animated height inline */}
      <Animated.View pointerEvents="none" style={[s.risingFill, { height: screenFillHeight }]} />

      <SafeAreaView style={s.safe} edges={['top']}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0B1B2B" />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={s.cardWrap}>
        {/* Circle without pulse animation */}
        <View style={s.card}>
          {/* PHONE — centered X, higher Y, tilted right */}
          <View style={s.phone}>
            <View style={s.phoneNotch} />
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.countdown}>
              {countdown}
            </Text>
          </View>

          {/* HAND — lower so device is fully visible */}
          <Image
            source={require('../../assets/images/icons/hand_only.png')}
            style={s.hand}
            onLayout={(e) => setHandLayout(e.nativeEvent.layout)}
          />
        </View>
      </View>

      <View style={s.titleWrap}>
        <Text style={s.title}>{t('treatment.active')}</Text>
      </View>
    </View>
  );
};

export default TreatmentScreen;
