import React from 'react';
import { StatusBar } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import './src/i18n'; // Initialize i18n

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F6FA" />
      <RootNavigator />
    </>
  );
}
