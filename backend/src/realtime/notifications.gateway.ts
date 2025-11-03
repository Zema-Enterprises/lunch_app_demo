import { randomUUID } from 'crypto';
import { GATEWAY_HANDSHAKE_EVENT } from './constants';

type GatewayFeatureFlags = {
  notificationsRealtime: boolean;
};

type GatewayUser = {
  id: string;
  companyId: string;
};

export const DEFAULT_HEARTBEAT_MS = 25_000;
export const DEFAULT_FALLBACK_POLLING_MS = 30_000;

export interface HandshakeOptions {
  connectionId?: string;
  heartbeatMs?: number;
  fallbackPollingMs?: number;
  featureFlags?: Partial<GatewayFeatureFlags>;
}

export const buildHandshakePayload = (
  user: GatewayUser,
  options: HandshakeOptions = {}
) => {
  const connectionId = options.connectionId ?? randomUUID();

  return {
    connectionId,
    heartbeatMs: options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS,
    fallbackPollingMs: options.fallbackPollingMs ?? DEFAULT_FALLBACK_POLLING_MS,
    featureFlags: {
      notificationsRealtime: options.featureFlags?.notificationsRealtime ?? true,
    },
    user,
  };
};

export const deriveRoomNames = (user: GatewayUser) => ({
  companyRoom: `company:${user.companyId}`,
  userRoom: `user:${user.id}`,
});

type SocketLike = {
  join: (room: string) => void;
  emit: (event: string, payload: unknown) => void;
};

export const completeHandshake = (
  socket: SocketLike,
  user: GatewayUser,
  options?: HandshakeOptions
) => {
  const handshake = buildHandshakePayload(user, options);
  const rooms = deriveRoomNames(user);

  socket.join(rooms.companyRoom);
  socket.join(rooms.userRoom);
  socket.emit(GATEWAY_HANDSHAKE_EVENT, handshake);

  return { handshake, rooms };
};
