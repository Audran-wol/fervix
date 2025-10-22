import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';

export const CompletedScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    // Start the success animation
    animationRef.current?.play();
    
    // Navigate to FinalCompleted after 3 seconds (skip cooling screen)
    const timer = setTimeout(() => {
      navigation.navigate('FinalCompleted' as never);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    completedText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? colors.textPrimary : '#374151',
      textAlign: 'center',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={styles.content}>
        <View style={styles.circleCard}>
          <LottieView
            ref={animationRef}
            source={require('../../assets/lotties/success_check.json.json')}
            style={styles.successAnimation}
            autoPlay
            loop={false}
          />
        </View>
        <Text style={dynamicStyles.completedText}>{t('completed.title')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCard: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successAnimation: {
    width: '80%',
    aspectRatio: 1,
  },
});

export default CompletedScreen;
