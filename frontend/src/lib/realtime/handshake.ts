import { z } from 'zod';

export const handshakeSchema = z.object({
  connectionId: z.string().min(1),
  heartbeatMs: z.number().int().positive(),
  fallbackPollingMs: z.number().int().positive(),
  featureFlags: z.object({
    notificationsRealtime: z.boolean(),
  }),
  user: z.object({
    id: z.string().min(1),
    companyId: z.string().min(1),
  }),
});

type HandshakeOverride = Partial<z.infer<typeof handshakeSchema>>;

export const createMockHandshakeResponse = (overrides?: HandshakeOverride) => ({
  connectionId: 'conn_mock_123',
  heartbeatMs: 25_000,
  fallbackPollingMs: 30_000,
  featureFlags: {
    notificationsRealtime: true,
  },
  user: {
    id: 'user_123',
    companyId: 'company_456',
  },
  ...overrides,
});
