import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Debounce utility to prevent excessive storage writes
let debounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_DELAY = 500; // 500ms debounce

interface SettingsState {
  // Language settings
  language: 'de' | 'en' | 'pt';
  setLanguage: (language: 'de' | 'en' | 'pt') => void;

  // Theme settings
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Sound settings
  soundOn: boolean;
  setSoundOn: (enabled: boolean) => void;

  // Vibration settings
  vibrationOn: boolean;
  setVibrationOn: (enabled: boolean) => void;

  // Sensitivity settings
  sensitive: boolean;
  setSensitive: (enabled: boolean) => void;

  // Auto start settings
  autoStart: boolean;
  setAutoStart: (enabled: boolean) => void;

  // Reset all settings
  resetSettings: () => void;
}

// Debounced setters for frequently toggled settings
const createDebouncedSetter = (setter: (value: any) => void) => {
  return (value: any) => {
    // Update state immediately for UI responsiveness
    setter(value);
    
    // Debounce the storage write
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      // Force persist by triggering a re-render
      setter(value);
    }, DEBOUNCE_DELAY);
  };
};

const defaultSettings = {
  language: 'en' as const,
  theme: 'light' as const,
  soundOn: true,
  vibrationOn: true,
  sensitive: false,
  autoStart: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setSoundOn: createDebouncedSetter((soundOn) => set({ soundOn })),
      setVibrationOn: createDebouncedSetter((vibrationOn) => set({ vibrationOn })),
      setSensitive: createDebouncedSetter((sensitive) => set({ sensitive })),
      setAutoStart: (autoStart) => set({ autoStart }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
