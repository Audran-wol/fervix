import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme';

interface InfoCardProps {
  children: React.ReactNode;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  children,
  backgroundColor = '#FBECEC',
  style,
}) => {
  return (
    <View style={[styles.card, { backgroundColor }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3E8FF',
    shadowColor: '#101828',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    marginHorizontal: 0,
  },
});
