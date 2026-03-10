import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/store/authStore', () => {
  const state = {
    token: 'test-token',
  };

  const useAuthStore = Object.assign(() => state, {
    getState: () => state,
  });

  return { useAuthStore };
});

describe('push manager', () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const mockRegister = vi.fn();
  const mockSubscribe = vi.fn();
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();

    vi.stubGlobal('navigator', {
      serviceWorker: {
        register: mockRegister,
        ready: Promise.resolve({
          pushManager: {
            subscribe: mockSubscribe,
            getSubscription: vi.fn().mockResolvedValue({
              endpoint: 'https://push.example.com/existing',
              unsubscribe: mockUnsubscribe,
            }),
          },
        }),
      },
      onLine: true,
    } as unknown as Navigator);

    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });

    vi.stubGlobal('fetch', vi.fn());
    mockRegister.mockResolvedValue({ update: vi.fn() });
    mockSubscribe.mockResolvedValue({
      endpoint: 'https://push.example.com/new',
      toJSON: () => ({
        endpoint: 'https://push.example.com/new',
        keys: {
          p256dh: 'mock-key',
          auth: 'mock-auth',
        },
      }),
    });
  });

  const importModule = () => import('@/lib/push/push-manager');

  it('registers service worker and subscribes to push notifications', async () => {
    (fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { publicKey: 'vapid-public-key' } }),
    });
    (fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { subscriptionId: 'sub_123' } }),
    });

    const { registerForPushNotifications } = await importModule();
    const result = await registerForPushNotifications();

    expect(mockRegister).toHaveBeenCalledWith('/service-worker.js');
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/notifications/push/public-key`,
      expect.objectContaining({ method: 'GET' })
    );
    const firstHeaders = (fetch as unknown as Mock).mock.calls[0][1]?.headers;
    expect(firstHeaders?.get('Authorization')).toBe('Bearer test-token');
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/notifications/push-subscriptions`,
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result?.endpoint).toBe('https://push.example.com/new');
  });

  it('gracefully handles denied permission without calling subscription API', async () => {
    (Notification.requestPermission as unknown as Mock).mockResolvedValue('denied');

    const { registerForPushNotifications } = await importModule();
    const result = await registerForPushNotifications();

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
