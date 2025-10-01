import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';

// Import language files
import en from './en.json';
import de from './de.json';
import pt from './pt.json';

const resources = {
  en: {
    translation: en,
  },
  de: {
    translation: de,
  },
  pt: {
    translation: pt,
  },
};

// Get device locale
const getDeviceLocale = () => {
  let locale = 'en';
  
  if (Platform.OS === 'ios') {
    locale = NativeModules.SettingsManager.settings.AppleLocale || 
             NativeModules.SettingsManager.settings.AppleLanguages[0] || 
             'en';
  } else {
    locale = NativeModules.I18nManager.localeIdentifier || 'en';
  }
  
  // Extract language code (e.g., 'en-US' -> 'en')
  const languageCode = locale.split('-')[0];
  
  // Check if we support this language, otherwise fallback to English
  return ['en', 'de', 'pt'].includes(languageCode) ? languageCode : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLocale(), // Use device locale
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],
    
    // Plural resolver configuration
    pluralSeparator: '_',
    contextSeparator: '_',
    keySeparator: '.',
    
    // Compatibility settings
    compatibilityJSON: 'v3',
    
    // Debug mode (set to false in production)
    debug: __DEV__,
  });

export default i18n;

// Helper function to get translated text
export const t = (key: string, options?: any) => {
  return i18n.t(key, options);
};

// Helper function to change language
export const changeLanguage = (language: string) => {
  return i18n.changeLanguage(language);
};

// Helper function to get current language
export const getCurrentLanguage = () => {
  return i18n.language;
};

// Available languages
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];
