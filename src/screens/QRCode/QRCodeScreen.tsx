import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';

export const QRCodeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    logoContainer: {
      marginBottom: 20,
      alignItems: 'center',
    },
    logo: {
      width: 400,
      height: 120,
      resizeMode: 'contain',
    },
    qrContainer: {
      backgroundColor: '#FFFFFF',
      padding: 20,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      marginBottom: 30,
    },
    instructionText: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? colors.textPrimary : '#374151',
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logos/fervix_logo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>

        <View style={styles.qrContainer}>
          <QRCode
            value="https://fervix.com/activate-device"
            size={200}
            color="#000000"
            backgroundColor="#FFFFFF"
          />
        </View>

        <Text style={styles.instructionText}>
          {t('settings.qrCodeInstruction')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default QRCodeScreen;
