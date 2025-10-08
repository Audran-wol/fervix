import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PowerController } from './src/state/power';
import { useSessionStore } from './src/state';
import './src/i18n'; // Initialize i18n

export default function App() {
  useEffect(() => {
    // Bind power controller to session store on app startup
    useSessionStore.getState().bindPowerController(PowerController);
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6FA" />
      <RootNavigator />
    </>
  );
}
