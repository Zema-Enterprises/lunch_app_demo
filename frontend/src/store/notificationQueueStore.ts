import { create } from 'zustand';

interface NotificationQueueState {
  queuedNotificationIds: string[];
  pendingBadgeCount: number;
  enqueue: (notificationId: string | undefined | null) => void;
  flush: () => string[];
  clear: () => void;
}

export const useNotificationQueueStore = create<NotificationQueueState>((set, get) => ({
  queuedNotificationIds: [],
  pendingBadgeCount: 0,
  enqueue: (notificationId) => {
    if (!notificationId) {
      return;
    }

    set((state) => {
      if (state.queuedNotificationIds.includes(notificationId)) {
        return state;
      }

      return {
        queuedNotificationIds: [...state.queuedNotificationIds, notificationId],
        pendingBadgeCount: state.pendingBadgeCount + 1,
      };
    });
  },
  flush: () => {
    const queued = [...get().queuedNotificationIds];
    if (queued.length === 0) {
      return [];
    }
    set({ queuedNotificationIds: [], pendingBadgeCount: 0 });
    return queued;
  },
  clear: () => set({ queuedNotificationIds: [], pendingBadgeCount: 0 }),
}));

export const selectPendingBadgeCount = (state: NotificationQueueState) => state.pendingBadgeCount;
