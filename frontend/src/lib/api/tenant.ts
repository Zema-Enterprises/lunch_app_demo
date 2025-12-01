const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

export const getCurrentTenantSlug = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'c' && segments[1]) {
    return segments[1];
  }
  return undefined;
};

export const buildTenantPath = (path: string) => {
  const slug = getCurrentTenantSlug();
  const normalized = normalizePath(path);
  return slug ? `/c/${slug}${normalized}` : normalized;
};
