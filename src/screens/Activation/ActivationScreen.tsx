import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useActivationStore } from '../../state/useActivationStore';
import { useTheme } from '../../theme/useTheme';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export const ActivationScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const {
    activateDevice,
  } = useActivationStore();

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isLoading) return;

    setScanned(true);
    setIsLoading(true);

    try {
      // Extract serial code from QR data
      let serialCode = data.trim().toUpperCase();
      
      // If QR contains JSON, try to parse it
      try {
        const parsed = JSON.parse(data);
        serialCode = parsed.serialCode || parsed.code || data;
      } catch {
        // Not JSON, use raw data
      }

      // Validate format before calling API
      const serialCodeRegex = /^FV\d{8}$/;
      if (!serialCodeRegex.test(serialCode)) {
        Alert.alert(
          t('activation.invalidQrCode'),
          t('activation.invalidQrCodeMessage'),
          [
            {
              text: t('activation.tryAgain'),
              onPress: () => {
                setScanned(false);
                setIsLoading(false);
              },
            },
          ]
        );
        return;
      }

      // Call activation API
      const result = await activateDevice(serialCode);

      if (result.success) {
        Alert.alert(
          `✅ ${t('activation.activationSuccessful')}`,
          `${result.message}\n\n` +
          `Scans: ${result.data?.scanCount}/${result.data?.maxScans}`,
          [
            {
              text: t('activation.continue'),
              onPress: () => {
                setShowScanner(false);
                setScanned(false);
                setIsLoading(false);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          `❌ ${t('activation.activationFailed')}`,
          result.message,
          [
            {
              text: t('activation.tryAgain'),
              onPress: () => {
                setScanned(false);
                setIsLoading(false);
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t('activation.unexpectedError'),
        [
          {
            text: t('activation.tryAgain'),
            onPress: () => {
              setScanned(false);
              setIsLoading(false);
            },
          },
        ]
      );
    }
  };


  const startScanning = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to scan QR codes. Please grant permission in your device settings.',
          [
            { text: 'OK', style: 'cancel' },
          ]
        );
        return;
      }
    }
    setShowScanner(true);
    setScanned(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    scannerContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    logoContainer: {
      marginBottom: 60,
      alignItems: 'center',
    },
    logo: {
      width: 280,
      height: 85,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 50,
      maxWidth: 280,
    },
    scanButton: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      paddingHorizontal: 40,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      minWidth: 220,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    scanButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 10,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: '#fff',
      fontSize: 18,
      marginTop: 16,
      fontWeight: '600',
    },
    scannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanArea: {
      width: width * 0.75,
      height: width * 0.75,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 24,
      backgroundColor: 'transparent',
    },
    corner: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderColor: '#FFFFFF',
    },
    topLeft: {
      top: -2,
      left: -2,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 12,
    },
    topRight: {
      top: -2,
      right: -2,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 12,
    },
    bottomLeft: {
      bottom: -2,
      left: -2,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 12,
    },
    bottomRight: {
      bottom: -2,
      right: -2,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 12,
    },
    scannerHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 24,
      backgroundColor: 'rgba(0,0,0,0.8)',
    },
    scannerTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '600',
      textAlign: 'center',
    },
    scannerFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      backgroundColor: 'rgba(0,0,0,0.8)',
    },
    scannerInstruction: {
      color: '#FFFFFF',
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      opacity: 0.9,
    },
    backButton: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    backButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 8,
    },
  });

  // Show scanner if user clicked scan button
  if (showScanner) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        
        <View style={styles.scannerOverlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
        
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>Scan QR Code</Text>
        </View>
        
        <View style={styles.scannerFooter}>
          <Text style={styles.scannerInstruction}>
            Position the QR code within the frame
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowScanner(false);
              setScanned(false);
              setIsLoading(false);
            }}
          >
            <Ionicons name="arrow-back-outline" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>{t('activation.activating')}</Text>
          </View>
        )}
      </View>
    );
  }

  // Show main activation screen
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

        <Text style={styles.subtitle}>
          {t('activation.scanInstruction')}
        </Text>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={startScanning}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={24} color="#FFFFFF" />
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>{t('activation.activating')}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};