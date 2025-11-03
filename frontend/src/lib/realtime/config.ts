const DEFAULT_PATH = '/notifications';

const stripApiSuffix = (url: string) => {
  if (url.endsWith('/api')) return url.slice(0, -4);
  if (url.endsWith('/api/')) return url.slice(0, -5);
  return url;
};

export const resolveNotificationsSocketUrl = () => {
  const explicit = import.meta.env.VITE_NOTIFICATIONS_SOCKET_URL;
  if (explicit) return explicit;

  const apiUrl = import.meta.env.VITE_API_URL || '/api';

  try {
    const parsed = new URL(apiUrl, window.location.origin);
    const base = stripApiSuffix(parsed.href);
    return `${base.replace(/\/$/, '')}${DEFAULT_PATH}`;
  } catch {
    const base = stripApiSuffix(apiUrl);
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return `${base.replace(/\/$/, '')}${DEFAULT_PATH}`;
    }
    return `${base === '' ? '' : base.replace(/\/$/, '')}${DEFAULT_PATH}`;
  }
};
