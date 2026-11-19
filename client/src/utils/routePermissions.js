export const ADMIN_ROLES = ['System Admin', 'Secretary', 'Vice Mayor', 'SB Member'];
export const SECRETARY_ADMIN_ROLES = ['Secretary', 'System Admin'];
export const SYSTEM_ADMIN_ROLES = ['System Admin'];

const routePermissions = [
  { path: '/', roles: ADMIN_ROLES },
  { path: '/dashboard', roles: ADMIN_ROLES },
  { path: '/sessions', roles: SECRETARY_ADMIN_ROLES },
  { path: '/ordinances', roles: ADMIN_ROLES },
  { path: '/ordinances/new', roles: SECRETARY_ADMIN_ROLES },
  { path: /^\/ordinances\/[^/]+\/edit$/, roles: SECRETARY_ADMIN_ROLES },
  { path: /^\/ordinances\/[^/]+$/, roles: ADMIN_ROLES },
  { path: '/users', roles: SYSTEM_ADMIN_ROLES },
  { path: '/consultation-verification', roles: SECRETARY_ADMIN_ROLES },
  { path: '/reports', roles: ADMIN_ROLES },
  { path: '/committees', roles: ADMIN_ROLES },
  { path: '/sbmembers', roles: SECRETARY_ADMIN_ROLES },
  { path: '/terms', roles: SECRETARY_ADMIN_ROLES },
  { path: '/news', roles: SECRETARY_ADMIN_ROLES },
  { path: '/profile', roles: ADMIN_ROLES },
];

export function canAccessPath(role, destination) {
  let pathname;
  try {
    pathname = new URL(destination, window.location.origin).pathname;
  } catch {
    return false;
  }

  const route = routePermissions.find(({ path }) => (
    typeof path === 'string' ? path === pathname : path.test(pathname)
  ));

  // App.jsx sends unmatched authenticated paths to the dashboard for admin roles.
  return route ? route.roles.includes(role) : ADMIN_ROLES.includes(role);
}

export function getPostLoginPath(user, destination) {
  if (user?.mustChangePassword) return '/profile?force=1';
  if (destination) {
    try {
      const savedDestination = new URL(destination, window.location.origin);
      if (savedDestination.pathname === '/profile' && savedDestination.searchParams.get('force') === '1') {
        return '/dashboard';
      }
    } catch {
      // Invalid saved destinations fall back to the dashboard below.
    }
  }
  if (destination && canAccessPath(user?.role, destination)) return destination;
  return '/dashboard';
}
