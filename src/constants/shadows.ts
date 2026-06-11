import { Platform, type ViewStyle } from 'react-native';

export const dropdownPanelShadow: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
  },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
}) ?? {};

export const toggleThumbShadow: ViewStyle = Platform.select({
  web: {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
  },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
}) ?? {};
