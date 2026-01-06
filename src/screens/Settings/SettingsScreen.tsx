import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useSettingsStore } from '../../state/useSettingsStore';
import { changeLanguage } from '../../i18n';
import { FvToggle, FvCard } from '../../components';
import { LanguageDropdown } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const {
    language,
    setLanguage,
    soundOn,
    setSoundOn,
    vibrationOn,
    setVibrationOn,
    theme,
    setTheme,
  } = useSettingsStore();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: '#6B7280',
    },
    card: {
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#6B7280',
    },
    cardText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    settingLabel: {
      fontSize: 16,
      flex: 1,
      color: colors.textPrimary,
    },
    qrButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    qrButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        
        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.preferences')}</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('settings.sound')}</Text>
            <FvToggle 
              value={soundOn} 
              onValueChange={setSoundOn}
              activeColor={colors.primary}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('settings.vibration')}</Text>
            <FvToggle 
              value={vibrationOn} 
              onValueChange={setVibrationOn}
              activeColor={colors.primary}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
            <FvToggle 
              value={theme === 'dark'} 
              onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
              activeColor={colors.primary}
            />
          </View>
        </FvCard>

        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.language')}</Text>
          <LanguageDropdown
            selectedLanguage={language}
            onLanguageChange={setLanguage}
          />
        </FvCard>

        {/* Device Activation - commented out for production */}
        {/* <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>Device Activation</Text>
          <Text style={styles.cardText}>
            Scan QR code to activate your device or view activation status
          </Text>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => navigation.navigate('QRCode' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
            <Text style={styles.qrButtonText}>QR Code Scanner</Text>
          </TouchableOpacity>
        </FvCard> */}

      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
