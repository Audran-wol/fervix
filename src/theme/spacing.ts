export const spacing = {
  // Spacing scale
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,

  // Common spacing values
  padding: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  margin: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // Component specific spacing
  component: {
    button: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    card: {
      padding: 16,
      margin: 8,
    },
    input: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    listItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
  },

  // Layout spacing
  layout: {
    screen: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    container: {
      padding: 16,
    },
  },

  // Border radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 14,
    '2xl': 18,
    full: 9999,
  },

  // Border width
  borderWidth: {
    none: 0,
    thin: 1,
    medium: 2,
    thick: 4,
  },

  // Tab bar
  tabBar: {
    height: 64,
    topCorners: 20,
  },
} as const;

export type SpacingKey = keyof typeof spacing;
export type PaddingKey = keyof typeof spacing.padding;
export type MarginKey = keyof typeof spacing.margin;
export type BorderRadiusKey = keyof typeof spacing.borderRadius;
export type BorderWidthKey = keyof typeof spacing.borderWidth;
