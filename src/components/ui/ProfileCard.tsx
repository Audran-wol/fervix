import React from 'react';
import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native';
import { colors, typography } from '../../theme';
import * as Haptics from 'expo-haptics';

interface ProfileCardProps {
  label: string;
  iconSource: any;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  label,
  iconSource,
  selected,
  onPress,
  style,
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.98, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start(onPress);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.card, selected && styles.cardSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label} profile`}
      >
        <Image
          source={iconSource}
          style={[styles.icon, selected && styles.iconSelected]}
          resizeMode="contain"
        />
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBlue, // soft blue like Heat's tile
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3E6F2',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 164,
    // softer, larger shadow
    shadowColor: '#101828',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardSelected: {
    backgroundColor: colors['primary-100'],
    borderColor: colors.primary,
    borderWidth: 2,
  },
  icon: {
    width: 72,   // bigger icon (requested)
    height: 72,
    tintColor: colors['gray-600'],
    marginBottom: 12,
  },
  iconSelected: { tintColor: colors.primary },
  label: {
    ...typography.textStyles.title,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
