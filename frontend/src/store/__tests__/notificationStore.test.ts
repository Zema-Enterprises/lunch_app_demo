import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { useNotificationStore } from '../notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    useNotificationStore.setState({ toasts: [] });
  });

  it('adds a toast with generated id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.42);

    act(() => {
      useNotificationStore.getState().addToast({
        type: 'success',
        message: 'Saved',
        duration: 1000,
      });
    });

    const { toasts } = useNotificationStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      type: 'success',
      message: 'Saved',
      duration: 1000,
    });
    expect(toasts[0].id).toMatch(/^[a-z0-9]+$/);
  });

  it('removes toast after the specified duration', () => {
    act(() => {
      useNotificationStore.getState().addToast({
        type: 'info',
        message: 'Processing',
        duration: 1000,
      });
    });

    expect(useNotificationStore.getState().toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(useNotificationStore.getState().toasts).toHaveLength(0);
  });

  it('removes toast immediately when removeToast is called', () => {
    act(() => {
      useNotificationStore.getState().addToast({
        type: 'warning',
        message: 'Heads up',
        duration: 5000,
      });
      useNotificationStore.getState().addToast({
        type: 'error',
        message: 'Failed',
        duration: 5000,
      });
    });

    const [firstToast] = useNotificationStore.getState().toasts;
    expect(firstToast).toBeDefined();

    act(() => {
      useNotificationStore.getState().removeToast(firstToast.id);
    });

    const remainingToasts = useNotificationStore.getState().toasts;
    expect(remainingToasts).toHaveLength(1);
    expect(remainingToasts[0].message).toBe('Failed');
  });
});
