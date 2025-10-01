export const typography = {
  // Font families
  fontFamily: {
    regular: 'Roboto-Regular',
    medium: 'Roboto-Medium',
    semiBold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 22,
    '3xl': 28,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  // Line heights
  lineHeight: {
    xs: 16,
    sm: 18,
    base: 22,
    lg: 24,
    xl: 28,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
    '5xl': 48,
    '6xl': 60,
  },

  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  // Text styles
  textStyles: {
    // Headings
    h1: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700' as const,
      fontFamily: 'Roboto-Bold',
    },
    h2: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
      fontFamily: 'Roboto-Bold',
    },
    title: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '500' as const,
      fontFamily: 'Roboto-Medium',
    },

    // Body text
    body: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '400' as const,
      fontFamily: 'Roboto-Regular',
    },

    // Caption
    caption: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '400' as const,
      fontFamily: 'Roboto-Regular',
    },

    // Button text
    button: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '700' as const,
      fontFamily: 'Roboto-Bold',
    },
  },
} as const;

export type TypographyKey = keyof typeof typography.textStyles;
export type FontSizeKey = keyof typeof typography.fontSize;
export type FontWeightKey = keyof typeof typography.fontWeight;
