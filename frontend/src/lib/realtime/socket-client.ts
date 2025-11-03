import { handshakeSchema } from './handshake';
import { GATEWAY_HANDSHAKE_EVENT, NOTIFICATION_CREATED_EVENT } from './constants';

export interface ConnectOptions {
  user: {
    id: string;
    companyId: string;
  };
}

export interface ConnectionFactory {
  (options: ConnectOptions): {
    handshake: unknown;
    on: (event: string, handler: (...args: any[]) => void) => void;
    close: () => void;
  };
}

export interface CreateNotificationsSocketOptions {
  user: ConnectOptions['user'];
  connectionFactory: ConnectionFactory;
  onNotification: (payload: unknown) => void;
  onHandshake?: (payload: unknown) => void;
}

export const createNotificationsSocket = ({
  user,
  connectionFactory,
  onNotification,
  onHandshake,
}: CreateNotificationsSocketOptions) => {
  const socket = connectionFactory({ user });
  let latestHandshake: ReturnType<typeof handshakeSchema.parse> | undefined;

  if (socket.handshake) {
    latestHandshake = handshakeSchema.parse(socket.handshake);
  }

  const handleHandshake = (payload: unknown) => {
    const parsed = handshakeSchema.parse(payload);
    latestHandshake = parsed;
    onHandshake?.(parsed);
  };

  socket.on(GATEWAY_HANDSHAKE_EVENT, handleHandshake);

  socket.on(NOTIFICATION_CREATED_EVENT, onNotification);

  return {
    get handshake() {
      return latestHandshake;
    },
    disconnect: () => {
      socket.close();
    },
  };
};
