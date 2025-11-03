import { create } from 'zustand';
import { z } from 'zod';
import { handshakeSchema } from '@/lib/realtime/handshake';

export const DEFAULT_FALLBACK_MS = 30_000;

type Handshake = z.infer<typeof handshakeSchema>;
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'fallback';

interface NotificationsRealtimeState {
  status: ConnectionStatus;
  fallbackPollingMs: number;
  lastHandshake?: Handshake;
  connectionId?: string;
  setConnecting: () => void;
  applyHandshake: (handshake: Handshake) => void;
  enforceFallback: (interval?: number) => void;
  reset: () => void;
}

const initialState: Omit<NotificationsRealtimeState, 'setConnecting' | 'applyHandshake' | 'enforceFallback' | 'reset'> = {
  status: 'idle',
  fallbackPollingMs: DEFAULT_FALLBACK_MS,
  lastHandshake: undefined,
  connectionId: undefined,
};

export const useNotificationsRealtimeStore = create<NotificationsRealtimeState>((set) => ({
  ...initialState,
  setConnecting: () =>
    set((state) => ({
      ...state,
      status: 'connecting',
    })),
  applyHandshake: (handshake) =>
    set(() => ({
      status: handshake.featureFlags.notificationsRealtime ? 'connected' : 'fallback',
      fallbackPollingMs: handshake.fallbackPollingMs ?? DEFAULT_FALLBACK_MS,
      lastHandshake: handshake,
      connectionId: handshake.connectionId,
    })),
  enforceFallback: (interval) =>
    set((state) => ({
      ...state,
      status: 'fallback',
      fallbackPollingMs: interval ?? state.fallbackPollingMs ?? DEFAULT_FALLBACK_MS,
    })),
  reset: () => set({ ...initialState }),
}));

export const selectNotificationsRefetchInterval = (state: NotificationsRealtimeState) =>
  state.status === 'connected' ? false : state.fallbackPollingMs;
