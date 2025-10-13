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
    console.log('QR Code scanned:', data);

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

      console.log('Extracted serial code:', serialCode);

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
          `Serial Code: ${result.data?.serialCode}\n` +
          `Batch: ${result.data?.batchName}\n` +
          `Scans Used: ${result.data?.scanCount}/${result.data?.maxScans}\n` +
          `Remaining Activations: ${result.data?.remainingScans}`,
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
      console.error('Error processing QR code:', error);
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
      backgroundColor: isDark ? colors.surface : '#F7F6FA',
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
      marginBottom: 40,
      alignItems: 'center',
    },
    logo: {
      width: 300,
      height: 90,
      resizeMode: 'contain',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 18,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 40,
    },
    scanButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      minWidth: 200,
    },
    scanButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
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
      width: width * 0.7,
      height: width * 0.7,
      borderWidth: 3,
      borderColor: colors.primary,
      borderRadius: 20,
      backgroundColor: 'transparent',
    },
    corner: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderColor: colors.primary,
    },
    topLeft: {
      top: -3,
      left: -3,
      borderTopWidth: 6,
      borderLeftWidth: 6,
      borderTopLeftRadius: 8,
    },
    topRight: {
      top: -3,
      right: -3,
      borderTopWidth: 6,
      borderRightWidth: 6,
      borderTopRightRadius: 8,
    },
    bottomLeft: {
      bottom: -3,
      left: -3,
      borderBottomWidth: 6,
      borderLeftWidth: 6,
      borderBottomLeftRadius: 8,
    },
    bottomRight: {
      bottom: -3,
      right: -3,
      borderBottomWidth: 6,
      borderRightWidth: 6,
      borderBottomRightRadius: 8,
    },
    scannerHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    scannerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    scannerFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    scannerInstruction: {
      color: '#fff',
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 16,
    },
    backButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
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