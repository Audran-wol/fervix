import React from 'react';
import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  View,
  Animated,
  Platform,
} from 'react-native';
import { colors, typography } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import * as Haptics from 'expo-haptics';

interface ProfileCardProps {
  label: string;
  iconSource: any;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  isChild?: boolean; // Special prop for child card
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  label,
  iconSource,
  selected,
  onPress,
  style,
  isChild = false,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const scale = React.useRef(new Animated.Value(1)).current;
  const iconScale = React.useRef(new Animated.Value(1)).current;
  const iconRotation = React.useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Card animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.98, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
    
    // Special child icon animation
    if (isChild) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(iconScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
          Animated.timing(iconRotation, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(iconScale, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(iconRotation, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]),
      ]).start();
    }
    
    onPress();
  };

  const dynamicStyles = StyleSheet.create({
    card: {
      height: CARD_HEIGHT,
      backgroundColor: isDark ? themeColors.card : '#FFFFFF',
      borderRadius: 24,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : '#E3E6F2',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      alignItems: 'center',
      justifyContent: 'flex-start',
      shadowColor: '#101828',
      shadowOpacity: 0.10,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={[dynamicStyles.card, selected && styles.cardSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label} profile`}
      >
        {/* BIGGER ICON, LOWER IN THE CARD */}
        <View style={[styles.iconWrap, isChild && styles.childIconWrap]}>
          <Animated.View 
            style={[
              { 
                transform: [
                  { scale: iconScale },
                  { rotate: iconRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '15deg']
                  }) }
                ]
              },
              isChild && { marginTop: 30 }
            ]}
          >
            <Image 
              source={iconSource} 
              style={[
                styles.icon, 
                isChild && styles.childIcon,
                selected && styles.iconSelected
              ]} 
              resizeMode="contain" 
            />
          </Animated.View>
        </View>

        {/* LABEL (very small gap) */}
        <Text style={[styles.label, selected && styles.labelSelected, { color: isDark ? themeColors.textPrimary : colors.textPrimary }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Slightly shorter cards than before
const CARD_HEIGHT = 220;

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E3E6F2',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#101828',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  // Full background when selected (no border)
  cardSelected: {
    backgroundColor: colors.primary, // red
    borderWidth: 0,
  },

  // Put the icon lower & make it bigger without changing card size
  iconWrap: {
    width: '100%',
    height: CARD_HEIGHT * 0.78,       // more space for the icon
    alignItems: 'center',
    justifyContent: 'flex-end',       // push icon toward the label
    paddingBottom: 2,                 // tiny gap to label
  },

  // Special positioning for child icon - bring it down without affecting text
  childIconWrap: {
    height: CARD_HEIGHT * 0.75,       // more balanced height
    justifyContent: 'center',         // center alignment
    paddingBottom: 16,                // proper gap from label (keep same)
    alignItems: 'center',
  },

  // Standard icon size for adult - slightly bigger
  icon: {
    width: 160,
    height: 160,
    tintColor: '#9CA3AF',    // same color as sensitive2.png when inactive
  },
  
  // Much bigger icon for child only
  childIcon: {
    width: 200,
    height: 200,
  },

  // White icon when selected (on red background)
  iconSelected: {
    tintColor: '#FFFFFF',
  },

  // Smaller text under icon
  label: {
    ...typography.textStyles.title,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 2,                     // very close to icon
  },

  // Better contrast on red background
  labelSelected: {
    color: '#FFFFFF',
  },
});

export default ProfileCard;
