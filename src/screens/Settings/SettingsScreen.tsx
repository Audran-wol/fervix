import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useSettingsStore } from '../../state/useSettingsStore';
import { changeLanguage } from '../../i18n';
import { FvToggle, FvCard } from '../../components';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
      backgroundColor: colors.surface,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: colors.textPrimary,
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
      fontWeight: '600',
      marginBottom: 16,
      color: colors.textPrimary,
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
    languageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    langOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      marginHorizontal: 4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    langOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors['primary-100'],
    },
    flagIcon: {
      width: 40,
      height: 40,
      marginBottom: 6,
    },
    langLabel: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    langLabelSelected: {
      color: colors.primary,
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
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[styles.langOption, language === 'de' && styles.langOptionSelected]}
              onPress={() => { setLanguage('de'); changeLanguage('de'); }}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/images/icons/flag_de.png')} style={styles.flagIcon} />
              <Text style={[styles.langLabel, language === 'de' && styles.langLabelSelected]}>Deutsch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionSelected]}
              onPress={() => { setLanguage('en'); changeLanguage('en'); }}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/images/icons/flag_en.png')} style={styles.flagIcon} />
              <Text style={[styles.langLabel, language === 'en' && styles.langLabelSelected]}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, language === 'pt' && styles.langOptionSelected]}
              onPress={() => { setLanguage('pt'); changeLanguage('pt'); }}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/images/icons/flag_pt.png')} style={styles.flagIcon} />
              <Text style={[styles.langLabel, language === 'pt' && styles.langLabelSelected]}>Português</Text>
            </TouchableOpacity>
          </View>
        </FvCard>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
