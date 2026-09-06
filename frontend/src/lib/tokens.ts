/**
 * Chromolite Central Design Tokens
 * Defined per DESIGN.md specifications.
 */

export const TOKENS = {
  fonts: {
    primary:
      'Space Grotesk, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary:
      'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  colors: {
    light: {
      background: '#F8F8F6',
      surface: '#FFFFFF',
      surfaceSubtle: '#F3F3F0',
      surfaceElevated: '#FFFFFF',
      border: '#E5E5E0',
      borderStrong: '#D7D7D0',
      text: '#181817',
      textSecondary: '#5F5F5A',
      textMuted: '#898983',
    },
    dark: {
      background: '#0D0D0C',
      surface: '#141413',
      surfaceSubtle: '#1A1A18',
      surfaceElevated: '#20201D',
      border: '#292927',
      borderStrong: '#383835',
      text: '#F1F1ED',
      textSecondary: '#A7A7A0',
      textMuted: '#707069',
    },
    accent: {
      primary: '#7C5CFC',
      hover: '#6C4CE8',
      hoverDark: '#9274FF',
    },
    semantic: {
      success: '#2F9E68',
      warning: '#C88A24',
      error: '#D45454',
      info: '#4D7CFE',
    },
    // Visualization palette for clusters & metadata (distinguishable, not saturated)
    visualization: [
      '#7C5CFC', // Violet / primary
      '#2F9E68', // Emerald
      '#4D7CFE', // Azure
      '#C88A24', // Amber
      '#E05286', // Rose
      '#1DB8AC', // Teal
      '#E87638', // Coral
      '#8E44AD', // Purple
      '#3498DB', // Sky
      '#F39C12', // Gold
    ],
  },
  layout: {
    sidebarWidth: 240,
    headerHeight: 48,
    inspectorWidth: 440,
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '10px',
  },
} as const;
