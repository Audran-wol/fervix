// Light theme colors
const lightColors = {
  // Primary colors
  primary: '#E85A5A',
  'primary-100': '#FDF2F2',

  // Design tokens
  cardBlue: '#BFC9E3',
  surface: '#F7F6FA',
  card: '#FFFFFF',
  textPrimary: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  shadow: 'rgba(16, 24, 40, 0.06)',

  // Gray scale
  'gray-900': '#1F2937',
  'gray-600': '#4B5563',
  'gray-400': '#9CA3AF',
  'gray-300': '#D1D5DB',
  'gray-200': '#E5E7EB',
  'gray-100': '#F3F4F6',

  // Status colors
  success: '#16A34A',
  warn: '#F59E0B',
  info: '#2563EB',

  // Common colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Background colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F7F6FA',
    tertiary: '#F3F4F6',
  },

  // Text colors
  text: {
    primary: '#1F2937',
    secondary: '#4B5563',
    tertiary: '#6B7280',
    inverse: '#FFFFFF',
  },

  // Border colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },

  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.2)',
    dark: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

// Dark theme colors
const darkColors = {
  // Primary colors
  primary: '#E85A5A',
  'primary-100': '#4A2B2B',

  // Design tokens
  cardBlue: '#2C3E5A',
  surface: '#0F1419',
  card: '#1F2937',
  textPrimary: '#F9FAFB',
  textMuted: '#9CA3AF',
  border: '#374151',
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Gray scale
  'gray-900': '#F9FAFB',
  'gray-600': '#D1D5DB',
  'gray-400': '#9CA3AF',
  'gray-300': '#6B7280',
  'gray-200': '#4B5563',
  'gray-100': '#374151',

  // Status colors
  success: '#22C55E',
  warn: '#FBBF24',
  info: '#3B82F6',

  // Common colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Background colors
  background: {
    primary: '#0F1419',
    secondary: '#1F2937',
    tertiary: '#374151',
  },

  // Text colors
  text: {
    primary: '#F9FAFB',
    secondary: '#E5E7EB',
    tertiary: '#D1D5DB',
    inverse: '#1F2937',
  },

  // Border colors
  border: {
    light: '#374151',
    medium: '#4B5563',
    dark: '#6B7280',
  },

  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

// Export light colors as default for backwards compatibility
export const colors = lightColors;

// Function to get colors based on theme
export const getColors = (theme: 'light' | 'dark' = 'light') => {
  return theme === 'dark' ? darkColors : lightColors;
};

export type ColorKey = keyof typeof colors;
export type ColorVariant = keyof typeof colors.primary;
