import React from 'react';
import { ActivationScreen } from '../Activation/ActivationScreen';

export const QRCodeScreen: React.FC = () => {
  // This screen now redirects to the activation screen for QR scanning
  return <ActivationScreen />;
};

export default QRCodeScreen;
