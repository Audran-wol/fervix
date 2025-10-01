import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');
const DURATION_MS = 20_000; // 20s

export const TreatmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(Math.floor(DURATION_MS / 1000));

  // Load Roboto for a clean numeral

  // Animations
  const screenFill = useRef(new Animated.Value(0)).current; // 0..1 rising screen fill
  const pulse = useRef(new Animated.Value(1)).current;      // subtle breathing

  // Circle size + elements
  const CARD = Math.min(W, H) * 0.72; // Increased from 0.64 to 0.72
  const PHONE_W = CARD * 0.48; // Bigger screen icon (was 0.36)
  const PHONE_H = PHONE_W * 1.75;

  // We'll measure the hand image to align the plug precisely
  const [handLayout, setHandLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Estimated plug position *inside the hand image* (as a ratio 0..1)
  // Tune these two numbers if your plug sits a bit off.
  const PLUG_REL = { x: 0.50, y: 0.42 }; // center-ish above wrist

  useEffect(() => {
    // Rising fill of the *screen background*, behind the circle
    Animated.timing(screenFill, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Gentle pulse of the card
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.03,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Countdown synced to duration (ceil to seconds, low drift)
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

  // Full-screen fill height
  const screenFillHeight = screenFill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, H],
  });

  // Where to put the phone so its BOTTOM CENTER touches the plug
  const plugX = handLayout.x + handLayout.width * PLUG_REL.x;
  const plugY = handLayout.y + handLayout.height * PLUG_REL.y;

  // Small negative/positive adjust if you want a tiny overlap/gap
  const CONNECTOR_ADJUST_Y = 0; // e.g., -2 to tuck in slightly

  return (
    <View style={s.container}>
      {/* Rising blue fill BEHIND everything (from bottom of screen) */}
      <Animated.View
        pointerEvents="none"
        style={[s.risingFill, { height: screenFillHeight }]}
      />

      <SafeAreaView style={s.safe} edges={['top']}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0B1B2B" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Card in the middle (overflow visible so phone can sit half out) */}
      <Animated.View style={[s.cardWrap, { transform: [{ scale: pulse }] }]}>
        <View style={[s.card, { width: CARD, height: CARD, borderRadius: CARD / 2 }]}>
          {/* HAND (measured for plug alignment) */}
          <Image
            source={require('../../assets/images/icons/handonly.png')}
            onLayout={(e) => setHandLayout(e.nativeEvent.layout)}
            style={{
              position: 'absolute',
              bottom: CARD * 0.05,
              left: CARD * 0.20,
              width: CARD * 0.60,    // keep same numbers as before for similar look
              height: CARD * 0.60,
              resizeMode: 'contain',
            }}
          />

          {/* PHONE — tilted, half inside the circle, bottom-center aligned to plug */}
          <View
            style={[
              s.phone,
              {
                width: PHONE_W,
                height: PHONE_H,
                left: plugX - PHONE_W / 2,
                top: plugY - PHONE_H + CONNECTOR_ADJUST_Y, // makes bottom center sit on the plug
                transform: [{ rotate: '-8deg' }],
              },
            ]}
          >
            <View style={s.phoneNotch} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                s.countdown,
              ]}
            >
              {countdown}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Title */}
      <View style={s.titleWrap}>
        <Text style={s.title}>
          {t('treatment.active')}
        </Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, // white background
  // rising screen fill (darker blue) sits behind the circle
  risingFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563EB',
    zIndex: 0,
  },

  safe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
  back: {
    marginTop: 4,
    marginLeft: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },

  cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    overflow: 'visible', // allow phone to extend outside the circle
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 36,
    elevation: 16,
  },

  // PHONE
  phone: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#E01919',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 5,
  },
  phoneNotch: {
    position: 'absolute',
    top: 6,
    width: '36%',
    height: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#1F2937',
  },
  countdown: {
    fontSize: 56, // Reduced from 68
    fontWeight: '300', // Thin font weight
    color: '#1F2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: -2,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-thin',
    }),
  },

  titleWrap: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#0B1B2B',
    textAlign: 'center',
  },
});

export default TreatmentScreen;
