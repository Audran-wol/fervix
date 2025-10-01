import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface FvIconBadgeProps {
  icon?: React.ReactNode;
  text?: string;
  count?: number;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const FvIconBadge: React.FC<FvIconBadgeProps> = ({
  icon,
  text,
  count,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}) => {
  const displayText = count !== undefined ? count.toString() : text;

  return (
    <View
      style={[
        styles.badge,
        styles[variant],
        styles[size],
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      {displayText && (
        <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
          {displayText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#6C757D',
  },
  success: {
    backgroundColor: '#28A745',
  },
  warning: {
    backgroundColor: '#FFC107',
  },
  error: {
    backgroundColor: '#DC3545',
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  successText: {
    color: '#FFFFFF',
  },
  warningText: {
    color: '#000000',
  },
  errorText: {
    color: '#FFFFFF',
  },
});
