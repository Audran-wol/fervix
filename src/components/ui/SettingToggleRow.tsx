import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
  Animated,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

interface SettingToggleRowProps {
  leftIcon?: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: ViewStyle;
}

export const SettingToggleRow: React.FC<SettingToggleRowProps> = memo(({
  leftIcon,
  label,
  value,
  onValueChange,
  style,
}) => {
  const { colors } = useTheme();
  const thumbPosition = React.useRef(new Animated.Value(value ? 32 : 0)).current;
  const trackColor = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  const soundRef = React.useRef<Audio.Sound | null>(null);

  // Initialize sound on mount
  React.useEffect(() => {
    const initializeSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sound/toogle_switch.mp3'),
          { shouldPlay: false, volume: 0.7 }
        );
        soundRef.current = sound;
      } catch (e) {
        console.log('[SettingToggleRow] Sound initialization error:', e);
      }
    };
    
    initializeSound();
    
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(thumbPosition, {
        toValue: value ? 32 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(trackColor, {
        toValue: value ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);

  const handleToggle = async () => {
    // Play toggle sound
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (e) {
      console.log('[SettingToggleRow] Sound playback error:', e);
    }
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Update value
    onValueChange(!value);
  };

  const trackBackgroundColor = trackColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#D1D5DB', colors.primary],
  });

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      gap: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      marginRight: 20,
    },
    label: {
      ...typography.textStyles.title,
      color: colors.textPrimary,
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
    },
    toggle: {
      width: 70,
      height: 40,
      borderRadius: 20,
      padding: 3,
      justifyContent: 'center',
    },
    track: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#D1D5DB',
      justifyContent: 'center',
    },
    thumb: {
      width: 26,
      height: 26,
      backgroundColor: colors.white,
      borderRadius: 13,
      shadowColor: '#101828',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <Text style={styles.label}>{label}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.toggle}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="switch"
        accessibilityLabel={`${label} setting`}
        accessibilityState={{ checked: value }}
        accessibilityHint={`Toggle ${label} on or off`}
      >
        <Animated.View 
          style={[
            styles.track, 
            { backgroundColor: trackBackgroundColor }
          ]} 
        >
          <Animated.View 
            style={[
              styles.thumb, 
              { transform: [{ translateX: thumbPosition }] }
            ]} 
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

