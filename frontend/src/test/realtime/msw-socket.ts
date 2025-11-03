import { EventEmitter } from 'node:events';
import { handshakeSchema, createMockHandshakeResponse } from '@/lib/realtime/handshake';
import { GATEWAY_HANDSHAKE_EVENT } from '@/lib/realtime/constants';
import type { z } from 'zod';

type Handshake = z.infer<typeof handshakeSchema>;

export type MockConnectOptions = {
  user?: Handshake['user'];
  featureFlags?: Partial<Handshake['featureFlags']>;
  overrides?: Partial<Omit<Handshake, 'user' | 'featureFlags'>>;
};

export type MockSocket = {
  handshake: Handshake;
  on: (event: string, handler: (...args: any[]) => void) => void;
  close: () => void;
};

export type MockServer = {
  connect: (options?: MockConnectOptions) => MockSocket;
  emit: (event: string, payload: unknown) => void;
  emitHandshake: (handshake: Handshake) => void;
  reset: () => void;
};

export const setupNotificationsSocketMock = (): MockServer => {
  const emitter = new EventEmitter();

  const connect = (options?: MockConnectOptions): MockSocket => {
    const base = createMockHandshakeResponse();
    const handshake = handshakeSchema.parse({
      ...base,
      ...(options?.overrides ?? {}),
      user: options?.user ?? base.user,
      featureFlags: {
        ...base.featureFlags,
        ...(options?.featureFlags ?? {}),
      },
    });

    const listeners: Record<string, ((...args: any[]) => void)[]> = {};

    queueMicrotask(() => {
      emitter.emit(GATEWAY_HANDSHAKE_EVENT, handshake);
    });

    return {
      handshake,
      on: (event, handler) => {
        emitter.on(event, handler);
        listeners[event] = listeners[event] ?? [];
        listeners[event].push(handler);
      },
      close: () => {
        Object.entries(listeners).forEach(([event, handlers]) => {
          handlers.forEach((handler) => emitter.off(event, handler));
        });
      },
    };
  };

  return {
    connect,
    emit: (event, payload) => {
      emitter.emit(event, payload);
    },
    emitHandshake: (handshake: Handshake) => {
      emitter.emit(GATEWAY_HANDSHAKE_EVENT, handshake);
    },
    reset: () => {
      emitter.removeAllListeners();
    },
  };
};
