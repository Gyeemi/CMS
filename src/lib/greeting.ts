export type TimeOfDayGreeting = 'Good Morning' | 'Good Afternoon' | 'Good Evening';

export function getTimeOfDayGreeting(date = new Date()): TimeOfDayGreeting {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatUserGreeting(displayName: string | undefined, date = new Date()) {
  const name = displayName?.trim() || 'there';
  return `${getTimeOfDayGreeting(date)}, ${name}`;
}

export function formatKuzooZangpoGreeting(displayName: string | undefined) {
  const name = displayName?.trim() || 'Guest';
  return `Kuzoo Zangpo ${name}`;
}

/** @deprecated Use formatKuzooZangpoGreeting */
export const formatKuzooZangpoLoadingGreeting = formatKuzooZangpoGreeting;

export const LOGIN_LOADING_MIN_MS = 2000;
export const LOGIN_LOADING_MAX_MS = 5000;

export function getRandomLoginLoadingMs() {
  return (
    LOGIN_LOADING_MIN_MS +
    Math.floor(Math.random() * (LOGIN_LOADING_MAX_MS - LOGIN_LOADING_MIN_MS + 1))
  );
}
