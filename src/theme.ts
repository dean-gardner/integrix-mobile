/**
 * Theme matching integrix-app-for-mobile (Valex) web app.
 * Primary from Switcher default; sidebar/header from layout SCSS.
 */
export const theme = {
  colors: {
    primary: '#2136A1',
    primaryLight: 'rgba(33, 54, 161, 0.08)',
    primaryDark: '#1a2b82',
    sidebarBg: '#ffffff',
    sidebarText: '#5b6e88',
    sidebarHeading: '#2c364c',
    sidebarBorder: '#eae8f1',
    headerBg: '#ffffff',
    headerText: '#222',
    background: '#ecf0fa',
    cardBg: '#ffffff',
    text: '#222',
    textMuted: '#3a5079',
    border: '#dde2ef',
    error: '#c00',
    success: '#28a745',
  },
  spacing: {
    pagePadding: 24,
    cardPadding: 24,
    headerHeight: 56,
  },
  typography: {
    title: 22,
    subtitle: 16,
    body: 14,
    caption: 12,
  },
} as const;

export type Theme = typeof theme;
