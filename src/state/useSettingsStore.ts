import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      setSoundOn: (soundOn) => set({ soundOn }),
      setVibrationOn: (vibrationOn) => set({ vibrationOn }),
      setSensitive: (sensitive) => set({ sensitive }),
      setAutoStart: (autoStart) => set({ autoStart }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
