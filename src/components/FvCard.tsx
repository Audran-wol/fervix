import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface FvCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
  shadow?: boolean;
}

export const FvCard: React.FC<FvCardProps> = ({
  children,
  style,
  padding = 16,
  margin = 8,
  shadow = true,
}) => {
  return (
    <View
      style={[
        styles.card,
        shadow && styles.shadow,
        { padding, margin },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
