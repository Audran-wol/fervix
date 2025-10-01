import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export const CompletedScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    // Start the success animation
    animationRef.current?.play();
    
    // Navigate to cooling screen after 3 seconds
    const timer = setTimeout(() => {
      navigation.navigate('Cooling' as never);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <LottieView
          ref={animationRef}
          source={require('../../assets/lotties/success_check.json.json')}
          style={styles.successAnimation}
          autoPlay
          loop={false}
        />
        <Text style={styles.completedText}>Completed</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successAnimation: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  completedText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
});

export default CompletedScreen;
