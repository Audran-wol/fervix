import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FvButton, FvCard } from '../../components';
import { colors } from '../../theme/colors';

export const SupportScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>{t('support.title')}</Text>
        
        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('support.contactSupport')}</Text>
          <Text style={styles.cardText}>
            {t('support.contactDescription')}
          </Text>
          <FvButton
            title={t('support.contactUs')}
            onPress={() => {
              // Open contact form or email
            }}
            style={[styles.button, styles.roundedButton, { backgroundColor: colors.primary }]}
          />
        </FvCard>

        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('support.userManual')}</Text>
          <Text style={styles.cardText}>
            {t('support.manualDescription')}
          </Text>
          <FvButton
            title={t('support.downloadManual')}
            onPress={() => {
              // Download manual
            }}
            style={[styles.button, styles.roundedButton, { backgroundColor: colors.primary }]}
          />
        </FvCard>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 24,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  card: {
    marginBottom: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.textPrimary,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: colors.textMuted,
  },
  button: {
    marginTop: 8,
  },
  roundedButton: {
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#E01919',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default SupportScreen;
