import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';

interface FvToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
  activeColor?: string;
  inactiveColor?: string;
  thumbColor?: string;
}

export const FvToggle: React.FC<FvToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  style,
  activeColor = '#007AFF',
  inactiveColor = '#E5E5EA',
  thumbColor = '#FFFFFF',
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.toggle,
        {
          backgroundColor: value ? activeColor : inactiveColor,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            transform: [{ translateX: value ? 20 : 2 }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2.22,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
});
