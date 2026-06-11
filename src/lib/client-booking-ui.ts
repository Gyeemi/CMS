import type { useTheme } from '@/hooks/use-theme';

export function getBookingStatusColor(
  status: string,
  theme: ReturnType<typeof useTheme>,
) {
  if (status === 'awaiting_advance') return theme.info;
  if (status === 'awaiting_confirmation') return theme.warning;
  if (status === 'confirmed') return theme.success;
  if (status === 'cancelled') return theme.danger;
  if (status === 'completed') return theme.accent;
  return theme.warning;
}
