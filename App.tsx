import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PowerController } from './src/state/power';
import { useSessionStore } from './src/state';
import { useActivationStore } from './src/state/useActivationStore';
import { ActivationScreen } from './src/screens/Activation/ActivationScreen';
import './src/i18n'; // Initialize i18n

export default function App() {
  const [isCheckingActivation, setIsCheckingActivation] = useState(true);
  const isActivated = useActivationStore(state => state.isActivated);
  const checkActivation = useActivationStore(state => state.checkActivation);
  
  useEffect(() => {
    initializeApp();
  }, []);
  
  const initializeApp = async () => {
    try {
      // Check if device is activated
      const activated = await checkActivation();
      setIsCheckingActivation(false);
      
      // If activated, start power monitoring
      if (activated) {
        useSessionStore.getState().bindPowerController(PowerController);
        console.log('[App] Device is activated. Starting global power monitoring...');
        PowerController.startSession({ presetId: 'adult' }); // Default to adult profile
      } else {
        console.log('[App] Device not activated. User needs to scan QR code.');
      }
    } catch (error) {
      console.error('[App] Error during initialization:', error);
      setIsCheckingActivation(false);
    }
  };
  
  // Show loading screen while checking activation
  if (isCheckingActivation) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#F7F6FA' 
      }}>
        <ActivityIndicator size="large" color="#E85A5A" />
      </View>
    );
  }
  
  // If not activated, show activation screen
  if (!isActivated) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#000" />
        <ActivationScreen />
      </>
    );
  }
  
  // If activated, show main app
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6FA" />
      <RootNavigator />
    </>
  );
}
