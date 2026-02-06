/**
 * Centralized Theme Configuration
 *
 * Dieses Modul verwaltet alle Design-Tokens und Theme-Varianten für die gesamte App.
 *
 * Usage:
 * import { useTheme, themes, colors } from '../theme';
 * const { currentTheme, setTheme } = useTheme();
 */

// ============================================
// COLOR PALETTE (Design Tokens)
// ============================================
export const colors = {
  // Emerald (Standard)
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22'
  },
  // Lime (Forest Theme)
  lime: {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#84cc16',
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#3f6212',
    900: '#365314',
    950: '#1a2e05'
  },
  // Cyan (Ocean Theme)
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344'
  },
  // Purple (Bonus Theme)
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764'
  },
  // Slate (Base colors)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  // Functional Colors
  red: {
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626'
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706'
  },
  blue: {
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb'
  },
  yellow: {
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04'
  }
};

// ============================================
// THEME DEFINITIONS
// ============================================
export const themes = {
  dark: {
    id: 'dark',
    name: 'Standard Dark',

    // Background Colors
    bg: {
      main: colors.slate[950],
      card: colors.slate[900],
      hover: colors.slate[800],
      input: colors.slate[900],
      muted: colors.slate[800]
    },

    // Border Colors
    border: {
      default: colors.slate[800],
      light: colors.slate[700],
      dark: colors.slate[900]
    },

    // Text Colors
    text: {
      primary: colors.slate[50],
      secondary: colors.slate[400],
      muted: colors.slate[500],
      inverse: colors.slate[900]
    },

    // Accent Color
    accent: {
      name: 'emerald',
      color: colors.emerald[500],
      light: colors.emerald[400],
      dark: colors.emerald[600],
      rgb: '16, 185, 129', // for opacity usage
      gradient: {
        from: colors.emerald[500],
        to: colors.emerald[600]
      }
    },

    // Component-specific
    components: {
      welcomeGradient: `linear-gradient(to bottom right, ${colors.slate[900]}, ${colors.slate[800]})`,
      chartGrid: colors.slate[700],
      tooltip: {
        bg: colors.slate[800],
        border: colors.slate[700]
      }
    }
  },

  forest: {
    id: 'forest',
    name: 'Forest Green',

    bg: {
      main: colors.emerald[950],
      card: colors.emerald[900],
      hover: colors.emerald[800],
      input: colors.emerald[900],
      muted: colors.emerald[800]
    },

    border: {
      default: colors.emerald[800],
      light: colors.emerald[700],
      dark: colors.emerald[900]
    },

    text: {
      primary: colors.emerald[50],
      secondary: colors.emerald[300],
      muted: colors.emerald[400],
      inverse: colors.emerald[950]
    },

    accent: {
      name: 'lime',
      color: colors.lime[500],
      light: colors.lime[400],
      dark: colors.lime[600],
      rgb: '132, 204, 22',
      gradient: {
        from: colors.lime[500],
        to: colors.lime[600]
      }
    },

    components: {
      welcomeGradient: `linear-gradient(to bottom right, ${colors.emerald[900]}, ${colors.emerald[800]})`,
      chartGrid: colors.emerald[700],
      tooltip: {
        bg: colors.emerald[800],
        border: colors.emerald[700]
      }
    }
  },

  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',

    bg: {
      main: colors.blue[950],
      card: colors.blue[900],
      hover: colors.blue[800],
      input: colors.blue[900],
      muted: colors.blue[800]
    },

    border: {
      default: colors.blue[800],
      light: colors.blue[700],
      dark: colors.blue[900]
    },

    text: {
      primary: colors.blue[50],
      secondary: colors.blue[300],
      muted: colors.blue[400],
      inverse: colors.blue[950]
    },

    accent: {
      name: 'cyan',
      color: colors.cyan[500],
      light: colors.cyan[400],
      dark: colors.cyan[600],
      rgb: '6, 182, 212',
      gradient: {
        from: colors.cyan[500],
        to: colors.cyan[600]
      }
    },

    components: {
      welcomeGradient: `linear-gradient(to bottom right, ${colors.blue[900]}, ${colors.blue[800]})`,
      chartGrid: colors.blue[700],
      tooltip: {
        bg: colors.blue[800],
        border: colors.blue[700]
      }
    }
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight Purple',

    bg: {
      main: colors.purple[950],
      card: colors.purple[900],
      hover: colors.purple[800],
      input: colors.purple[900],
      muted: colors.purple[800]
    },

    border: {
      default: colors.purple[800],
      light: colors.purple[700],
      dark: colors.purple[900]
    },

    text: {
      primary: colors.purple[50],
      secondary: colors.purple[300],
      muted: colors.purple[400],
      inverse: colors.purple[950]
    },

    accent: {
      name: 'purple',
      color: colors.purple[500],
      light: colors.purple[400],
      dark: colors.purple[600],
      rgb: '168, 85, 247',
      gradient: {
        from: colors.purple[500],
        to: colors.purple[600]
      }
    },

    components: {
      welcomeGradient: `linear-gradient(to bottom right, ${colors.purple[900]}, ${colors.purple[800]})`,
      chartGrid: colors.purple[700],
      tooltip: {
        bg: colors.purple[800],
        border: colors.purple[700]
      }
    }
  },

  light: {
    id: 'light',
    name: 'Light Mode',

    bg: {
      main: colors.slate[50],
      card: '#ffffff',
      hover: colors.slate[100],
      input: '#ffffff',
      muted: colors.slate[100]
    },

    border: {
      default: colors.slate[200],
      light: colors.slate[100],
      dark: colors.slate[300]
    },

    text: {
      primary: colors.slate[900],
      secondary: colors.slate[600],
      muted: colors.slate[500],
      inverse: colors.slate[50]
    },

    accent: {
      name: 'emerald',
      color: colors.emerald[600],
      light: colors.emerald[500],
      dark: colors.emerald[700],
      rgb: '5, 150, 105',
      gradient: {
        from: colors.emerald[600],
        to: colors.emerald[700]
      }
    },

    components: {
      welcomeGradient: `linear-gradient(to bottom right, ${colors.slate[100]}, ${colors.slate[200]})`,
      chartGrid: colors.slate[300],
      tooltip: {
        bg: '#ffffff',
        border: colors.slate[200]
      }
    }
  }
};

// ============================================
// SPACING SCALE
// ============================================
export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
  '4xl': '6rem'     // 96px
};

// ============================================
// TYPOGRAPHY SCALE
// ============================================
export const typography = {
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem'       // 48px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75
  }
};

// ============================================
// BORDER RADIUS
// ============================================
export const borderRadius = {
  sm: '0.375rem',    // 6px
  md: '0.5rem',      // 8px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.5rem',   // 24px
  '3xl': '2rem',     // 32px
  full: '9999px'
};

// ============================================
// SHADOWS
// ============================================
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
};

// ============================================
// TRANSITIONS
// ============================================
export const transitions = {
  fast: '150ms ease',
  normal: '300ms ease',
  slow: '500ms ease'
};

// ============================================
// REACT HOOK: useTheme
// ============================================
import { useState, useEffect, createContext, useContext } from 'react';

export const ThemeContext = createContext({
  currentTheme: themes.dark,
  themeId: 'dark',
  setTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState(() => {
    // Load from localStorage or default to 'dark'
    return localStorage.getItem('grow-theme') || 'dark';
  });

  const baseTheme = themes[themeId] || themes.dark;

  // Add colors property for backwards compatibility with migrated components
  const currentTheme = {
    ...baseTheme,
    colors: {
      primary: baseTheme.accent.color,
      success: colors.emerald[500],
      error: colors.red[500],
      warning: colors.amber[500],
      info: colors.blue[500]
    },
    bg: {
      ...baseTheme.bg,
      primary: baseTheme.bg.main,
      secondary: baseTheme.bg.card
    }
  };

  const setTheme = (newThemeId) => {
    if (themes[newThemeId]) {
      setThemeId(newThemeId);
      localStorage.setItem('grow-theme', newThemeId);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get CSS variable for a theme color
 */
export const getCSSVar = (path, theme) => {
  const parts = path.split('.');
  let value = theme;
  for (const part of parts) {
    value = value?.[part];
  }
  return value;
};

/**
 * Create inline styles from theme
 */
export const getThemeStyles = (theme) => ({
  '--color-bg-main': theme.bg.main,
  '--color-bg-card': theme.bg.card,
  '--color-bg-hover': theme.bg.hover,
  '--color-border': theme.border.default,
  '--color-text-primary': theme.text.primary,
  '--color-text-secondary': theme.text.secondary,
  '--color-accent': theme.accent.color,
  '--color-accent-light': theme.accent.light,
  '--color-accent-dark': theme.accent.dark
});

export default {
  themes,
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  useTheme,
  ThemeProvider,
  getCSSVar,
  getThemeStyles
};
