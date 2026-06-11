import type { UserRole } from '@/types/database';

export type { UserRole };

export function isStudioRole(
  role: UserRole | undefined,
): role is 'super_admin' | 'admin' | 'manager' {
  return role === 'super_admin' || role === 'admin' || role === 'manager';
}

export function isSuperAdmin(role: UserRole | undefined): role is 'super_admin' {
  return role === 'super_admin';
}

export function getHomeRouteForRole(role: UserRole) {
  return isStudioRole(role) ? '/(tabs)' : '/(client)';
}

export function getRoleLabel(role: UserRole) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    default:
      return 'Client';
  }
}
