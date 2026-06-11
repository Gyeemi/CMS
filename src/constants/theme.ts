/**
 * GroovX dashboard theme — Requestion-inspired navy dashboard palette.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** Primary — headings, large numbers, body */
    text: '#0F172A',
    /** Secondary — subtext, labels, inactive nav */
    textSecondary: '#64748B',
    /** Links & actions — "View All", "Contact Support" */
    link: '#3B82F6',
    background: '#FFFFFF',
    backgroundElement: '#F1F5F9',
    backgroundInput: '#F8FAFC',
    backgroundSelected: '#E2E8F0',
    sidebar: '#F8FAFC',
    accent: '#2563EB',
    accentMuted: '#DBEAFE',
    info: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    border: '#E2E8F0',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    link: '#3B82F6',
    background: '#0B111B',
    backgroundElement: '#151C2C',
    backgroundInput: '#101725',
    backgroundSelected: '#1A2332',
    sidebar: '#080C14',
    accent: '#2563EB',
    accentMuted: '#172554',
    info: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    border: '#1E293B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Apple-style system sans-serif — SF Pro on Apple platforms */
export const FontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'var(--font-sans)',
  default: 'sans-serif',
}) as string;

export const Fonts = {
  sans: FontFamily,
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: 'var(--font-serif)',
    default: 'serif',
  }) as string,
  rounded: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'var(--font-rounded)',
    default: 'sans-serif',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: 'var(--font-mono)',
    default: 'monospace',
  }) as string,
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 64 }) ?? 0;
export const MaxContentWidth = 1100;
export const SidebarWidth = 240;
/** Viewports below this width use mobile layout on web (bottom tabs, no sidebar). */
export const MobileLayoutBreakpoint = 768;
