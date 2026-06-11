import { useWindowDimensions } from 'react-native';

import { MobileLayoutBreakpoint } from '@/constants/theme';

/** True on phones and narrow mobile browsers (sidebar → bottom tabs). */
export function useCompactLayout() {
  const { width } = useWindowDimensions();
  return width < MobileLayoutBreakpoint;
}
