import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const SERVICE_WORKER_PATH = '/service-worker.js';
const PUBLIC_KEY_ENDPOINT = `${API_BASE_URL}/notifications/push/public-key`;
const SUBSCRIPTIONS_ENDPOINT = `${API_BASE_URL}/notifications/push-subscriptions`;
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout for API calls

export const isPushFeatureEnabled = () =>
  import.meta.env.VITE_PUSH_NOTIFICATIONS_ENABLED !== 'false';

const isFeatureEnabled = () => isPushFeatureEnabled();

/**
 * Creates a fetch request with timeout support
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

type PushPermissionResult = 'granted' | 'denied' | 'default';

type PushKeys = {
  p256dh: string;
  auth: string;
};

type SerializedPushSubscription = {
  endpoint: string;
  keys: PushKeys;
  expirationTime?: number | null;
};

const base64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const safeBase64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof atob === 'function'
    ? atob(safeBase64)
    : (globalThis as any).Buffer
      ? (globalThis as any).Buffer.from(safeBase64, 'base64').toString('binary')
      : '';
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const requestPermission = async (): Promise<PushPermissionResult> => {
  if (typeof Notification === 'undefined') {
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  if (typeof Notification.requestPermission !== 'function') {
    return 'denied';
  }

  return Notification.requestPermission();
};

const buildAuthHeaders = () => {
  const { token } = useAuthStore.getState();
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

const fetchVapidPublicKey = async () => {
  const response = await fetchWithTimeout(PUBLIC_KEY_ENDPOINT, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to load VAPID public key');
  }

  const body = await response.json();
  return body?.data?.publicKey as string;
};

export const registerServiceWorker = async () => {
  if (!isFeatureEnabled()) {
    throw new Error('Push notifications disabled by feature flag');
  }
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  // Check if service worker file exists (dev server returns HTML 404)
  try {
    const response = await fetch(SERVICE_WORKER_PATH, { method: 'HEAD' });
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok || !contentType.includes('javascript')) {
      throw new Error('Service worker file not available. Push notifications require a production build.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Push notifications require')) {
      throw error;
    }
    throw new Error('Unable to verify service worker availability');
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
};

export const registerForPushNotifications = async (): Promise<SerializedPushSubscription | null> => {
  if (!isFeatureEnabled()) {
    return null;
  }
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const permission = await requestPermission();
  if (permission !== 'granted') {
    return null;
  }

  await registerServiceWorker();

  const registration = await navigator.serviceWorker.ready;
  const publicKey = await fetchVapidPublicKey();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(publicKey),
  });

  const payload = subscription.toJSON() as SerializedPushSubscription;

  // Register subscription with backend
  const response = await fetchWithTimeout(SUBSCRIPTIONS_ENDPOINT, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      endpoint: payload.endpoint,
      keys: payload.keys,
      expirationTime: payload.expirationTime ?? null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }),
  });

  if (!response.ok) {
    // Server registration failed - unsubscribe from browser to stay in sync
    await subscription.unsubscribe();
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage = errorBody?.message || errorBody?.error || 'Failed to register push subscription';
    throw new Error(errorMessage);
  }

  return payload;
};

export const unsubscribeFromPushNotifications = async () => {
  if (!isFeatureEnabled() || !('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) {
    return false;
  }

  const endpoint = existing.endpoint;

  // Unsubscribe from browser FIRST to prevent receiving more push messages
  const browserUnsubscribed = await existing.unsubscribe();
  if (!browserUnsubscribed) {
    throw new Error('Failed to unsubscribe from browser push');
  }

  // Then remove from server (best effort - browser is already unsubscribed)
  try {
    const response = await fetchWithTimeout(SUBSCRIPTIONS_ENDPOINT, {
      method: 'DELETE',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ endpoint }),
    });

    if (!response.ok && response.status !== 404) {
      // Log but don't throw - browser is already unsubscribed
      console.warn('Failed to remove push subscription from server:', response.status);
    }
  } catch (error) {
    // Log but don't throw - browser is already unsubscribed
    console.warn('Error removing push subscription from server:', error);
  }

  return true;
};

export const getSubscriptionStatus = async (): Promise<'enabled' | 'denied' | 'default'> => {
  if (!isFeatureEnabled()) {
    return 'default';
  }
  
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return 'default';
  }

  // Check browser permission state
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'denied') {
      return 'denied';
    }
  }

  // Check for active subscription
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return 'enabled';
    }
  } catch {
    // Service worker not ready or other error
  }

  return 'default';
};
