import { useSettingsStore } from '../state/useSettingsStore';
import { getColors } from './colors';

export const useTheme = () => {
  const theme = useSettingsStore((state) => state.theme);
  const colors = getColors(theme);
  
  return {
    theme,
    colors,
    isDark: theme === 'dark',
  };
};

