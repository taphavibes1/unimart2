import { MD3LightTheme } from 'react-native-paper';

export const Colors = {
  primary: '#1A237E',
  primaryLight: '#3949AB',
  primaryDark: '#0D1257',
  accent: '#FFC107',
  accentLight: '#FFD54F',
  accentDark: '#FF8F00',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  error: '#B00020',
  success: '#2E7D32',
  warning: '#F57C00',
  text: '#212121',
  textSecondary: '#757575',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#212121',
  border: '#E0E0E0',
  divider: '#BDBDBD',
  placeholder: '#9E9E9E',
  disabled: '#BDBDBD',
  statusAvailable: '#2E7D32',
  statusReserved: '#F57C00',
  statusSold: '#B00020',
  overlay: 'rgba(0,0,0,0.5)',
};

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    onPrimary: Colors.textOnPrimary,
    primaryContainer: Colors.primaryLight,
    secondary: Colors.accent,
    onSecondary: Colors.textOnAccent,
    secondaryContainer: Colors.accentLight,
    background: Colors.background,
    surface: Colors.surface,
    error: Colors.error,
    onBackground: Colors.text,
    onSurface: Colors.text,
    outline: Colors.border,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 36,
};

export const BorderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

export const Shadow = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
