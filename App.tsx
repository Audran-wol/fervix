import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PowerController } from './src/state/power';
import { useSessionStore } from './src/state';
import { useActivationStore } from './src/state/useActivationStore';
import { ActivationScreen } from './src/screens/Activation/ActivationScreen';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import './src/i18n'; // Initialize i18n

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isCheckingActivation, setIsCheckingActivation] = useState(true);
  const isActivated = useActivationStore(state => state.isActivated);
  const checkActivation = useActivationStore(state => state.checkActivation);
  
  useEffect(() => {
    initializeApp();
  }, []);
  
  const initializeApp = async () => {
    try {
      // Check for OTA updates first (only in production)
      if (!__DEV__ && Updates.isEnabled) {
        try {
          console.log('[App] 🔄 Checking for OTA updates...');
          const update = await Updates.checkForUpdateAsync();
          
          if (update.isAvailable) {
            console.log('[App] 📦 Update available, downloading...');
            await Updates.fetchUpdateAsync();
            console.log('[App] ✅ Update downloaded, reloading app...');
            await Updates.reloadAsync();
            return; // App will reload, so we don't need to continue
          } else {
            console.log('[App] ✅ App is up to date');
          }
        } catch (updateError) {
          console.error('[App] Error checking for updates:', updateError);
          // Continue with app initialization even if update check fails
        }
      }
      
      // TODO: TEMPORARILY DISABLED FOR TESTING - Remove this bypass when ready to enable QR activation
      // Check if device is activated
      // const activated = await checkActivation();
      const activated = true; // TEMPORARY: Always treat as activated for testing
      
      // If activated, bind power controller and start monitoring
      if (activated) {
        const store = useSessionStore.getState();
        store.bindPowerController(PowerController);
        console.log('[App] ✅ Device is activated. Power controller bound.');
        
        // Start monitoring session immediately (will be in PREHEAT_DETECT/IDLE until device detected)
        console.log('[App] 🚀 Starting power monitoring session...');
        store.requestStart({ presetId: 'adult' }); // Default profile, can be changed in Home
      } else {
        console.log('[App] ❌ Device not activated. User needs to scan QR code.');
      }
      
      // Hide splash screen and show app
      await SplashScreen.hideAsync();
      setIsCheckingActivation(false);
    } catch (error) {
      console.error('[App] Error during initialization:', error);
      // Hide splash screen even on error
      await SplashScreen.hideAsync();
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
        backgroundColor: '#FFFFFF' 
      }}>
        <Text style={{
          fontSize: 32,
          fontWeight: 'bold',
          color: '#E85A5A',
          marginBottom: 20
        }}>FERVIX®</Text>
        <ActivityIndicator size="large" color="#E85A5A" />
      </View>
    );
  }
  
  // TODO: TEMPORARILY DISABLED FOR TESTING - Remove this bypass when ready to enable QR activation
  // If not activated, show activation screen
  // if (!isActivated) {
  //   return (
  //     <>
  //       <StatusBar barStyle="dark-content" backgroundColor="#000" />
  //       <ActivationScreen />
  //     </>
  //   );
  // }
  
  // If activated, show main app
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6FA" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
