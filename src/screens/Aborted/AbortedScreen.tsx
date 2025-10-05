import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { FvButton, FvCard } from '../../components';
import { useTheme } from '../../theme/useTheme';

export const AbortedScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

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
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    card: {
      marginBottom: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
      color: colors.textPrimary,
    },
    cardText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    errorContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    errorIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    errorText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    errorSubtext: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    buttonContainer: {
      marginTop: 24,
      gap: 12,
    },
    button: {
      marginBottom: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('aborted.title')}</Text>
        
        <FvCard style={styles.card}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{t('aborted.stopped')}</Text>
            <Text style={styles.errorSubtext}>
              {t('aborted.stoppedDescription')}
            </Text>
          </View>
        </FvCard>

        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('aborted.reason')}</Text>
          <Text style={styles.cardText}>
            {t('aborted.reasonDescription')}
          </Text>
        </FvCard>

        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('aborted.nextSteps')}</Text>
          <Text style={styles.cardText}>
            {t('aborted.nextStepsDescription')}
          </Text>
        </FvCard>

        <View style={styles.buttonContainer}>
          <FvButton
            title={t('buttons.restartTreatment')}
            onPress={() => {
              // Restart treatment
            }}
            style={styles.button}
          />
          <FvButton
            title={t('buttons.returnHome')}
            onPress={() => {
              // Navigate to home
            }}
            variant="outline"
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};


export default AbortedScreen;
