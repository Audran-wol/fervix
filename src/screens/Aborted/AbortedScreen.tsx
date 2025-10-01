import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { FvButton, FvCard } from '../../components';

export const AbortedScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Treatment Aborted</Text>
        
        <FvCard style={styles.card}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>Treatment Stopped</Text>
            <Text style={styles.errorSubtext}>
              The treatment was stopped before completion.
            </Text>
          </View>
        </FvCard>

        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>Reason</Text>
          <Text style={styles.cardText}>
            Treatment was manually stopped by the user.
          </Text>
        </FvCard>

        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>What to do next</Text>
          <Text style={styles.cardText}>
            • Check the device for any issues{'\n'}
            • Contact support if needed{'\n'}
            • You can restart treatment when ready
          </Text>
        </FvCard>

        <View style={styles.buttonContainer}>
          <FvButton
            title="Restart Treatment"
            onPress={() => {
              // Restart treatment
            }}
            style={styles.button}
          />
          <FvButton
            title="Return to Home"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  },
  card: {
    marginBottom: 16,
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    color: '#FFC107',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFC107',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default AbortedScreen;
