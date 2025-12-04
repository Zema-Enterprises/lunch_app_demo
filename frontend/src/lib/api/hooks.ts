import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import { Restaurant, Event, Order, NotificationEvent, UserNotificationSettings, NotificationStats, NotificationAnalyticsSummary, TenantInvite, User, CompanyTheme } from '../../types';
import { useNotificationStore } from '../../store/notificationStore';
import { useNotificationsRealtimeStore, selectNotificationsRefetchInterval } from '../../store/notificationsRealtimeStore';
import { buildTenantPath, getCurrentTenantSlug } from './tenant';

// Restaurants
export const useRestaurants = () => {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Restaurant[] }>('/restaurants');
      return response.data.data;
    },
  });
};

export const useRestaurant = (id: string) => {
  return useQuery({
    queryKey: ['restaurant', id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Restaurant }>(`/restaurants/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateRestaurant = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post<{ data: Restaurant }>('/restaurants', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      addToast({ type: 'success', message: 'Restaurant created successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create restaurant' });
    },
  });
};

export const useUpdateRestaurant = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch<{ data: Restaurant }>(`/restaurants/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      addToast({ type: 'success', message: 'Restaurant updated successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update restaurant' });
    },
  });
};

export const useDeleteRestaurant = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/restaurants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      addToast({ type: 'success', message: 'Restaurant deleted successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete restaurant' });
    },
  });
};

// Menu Items
export const useMenuItems = (restaurantId: string) => {
  return useQuery({
    queryKey: ['menuItems', restaurantId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: any[] }>(`/restaurants/${restaurantId}/menu`);
      return response.data.data;
    },
    enabled: !!restaurantId,
  });
};

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ restaurantId, data }: { restaurantId: string; data: any }) => {
      const response = await apiClient.post<{ data: any }>(`/restaurants/${restaurantId}/menu-items`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant', variables.restaurantId] });
      addToast({ type: 'success', message: 'Menu item created successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create menu item' });
    },
  });
};

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ restaurantId, itemId, data }: { restaurantId: string; itemId: string; data: any }) => {
      const response = await apiClient.patch<{ data: any }>(`/restaurants/${restaurantId}/menu-items/${itemId}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant', variables.restaurantId] });
      addToast({ type: 'success', message: 'Menu item updated successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update menu item' });
    },
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ restaurantId, itemId }: { restaurantId: string; itemId: string }) => {
      await apiClient.delete(`/restaurants/${restaurantId}/menu-items/${itemId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurant', variables.restaurantId] });
      addToast({ type: 'success', message: 'Menu item deleted successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete menu item' });
    },
  });
};

export const useToggleMenuItemAvailability = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ restaurantId, itemId, available }: { restaurantId: string; itemId: string; available: boolean }) => {
      const response = await apiClient.patch<{ data: any }>(`/restaurants/${restaurantId}/menu-items/${itemId}`, { available });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', variables.restaurantId] });
      addToast({ type: 'success', message: `Menu item ${variables.available ? 'enabled' : 'disabled'} successfully!` });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update menu item availability' });
    },
  });
};

// Events
export const useEvents = (status?: string) => {
  return useQuery({
    queryKey: ['events', status],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Event[] }>('/events', {
        params: status ? { status } : {},
      });
      return response.data.data;  // Unwrap { data: ... }
    },
  });
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Event }>(`/events/${id}`);
      return response.data.data;  // Unwrap { data: ... }
    },
    enabled: !!id,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post<{ data: Event }>('/events', data);
      return response.data.data;  // Unwrap { data: ... }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({ type: 'success', message: 'Event created successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create event' });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: any }) => {
      const response = await apiClient.patch<{ data: Event }>(`/events/${eventId}`, data);
      return response.data.data;  // Unwrap { data: ... }
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      addToast({ type: 'success', message: 'Event updated successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update event' });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      await apiClient.delete(`/events/${eventId}`);
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      addToast({ type: 'success', message: 'Event deleted successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete event' });
    },
  });
};

export const useLeaveEvent = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      await apiClient.post(`/events/${eventId}/leave`);
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      addToast({ type: 'success', message: 'Left event successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to leave event' });
    },
  });
};

export const useJoinEvent = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post<{ data: any }>(`/events/${eventId}/join`);
      return response.data.data;  // Unwrap { data: ... }
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      addToast({ type: 'success', message: 'Joined event successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to join event' });
    },
  });
};

export const useCloseEvent = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post<{ data: Event }>(`/events/${eventId}/close`);
      return response.data.data;  // Unwrap { data: ... }
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      addToast({ type: 'success', message: 'Event closed successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to close event' });
    },
  });
};

// Orders
export const useEventOrders = (eventId: string) => {
  return useQuery({
    queryKey: ['orders', eventId],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Order[] }>(`/events/${eventId}/orders`);
      return response.data.data;  // Unwrap { data: ... }
    },
    enabled: !!eventId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post<{ data: Order }>(`/events/${data.eventId}/orders`, data);
      return response.data.data;  // Unwrap { data: ... }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['userOrders'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      addToast({ type: 'success', message: 'Order placed successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to place order' });
    },
  });
};

// Get all orders for current user
export const useUserOrders = () => {
  return useQuery({
    queryKey: ['userOrders'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Order[] }>('/orders/me');
      return response.data.data;  // Unwrap { data: ... }
    },
  });
};

// Cancel an order
export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ eventId, orderId }: { eventId: string; orderId: string }) => {
      await apiClient.delete(`/events/${eventId}/orders/${orderId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['userOrders'] });
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      addToast({ type: 'success', message: 'Order cancelled successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to cancel order' });
    },
  });
};

// User Profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await apiClient.put('/users/profile', data);
      return response.data.data;
    },
    onSuccess: (updatedUser) => {
      // Update the auth/me query cache
      queryClient.setQueryData(['auth', 'me'], updatedUser);
      addToast({ type: 'success', message: 'Profile updated successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update profile' });
    },
  });
};

export const useChangePassword = () => {
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.post('/users/change-password', data);
      return response.data;
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Password changed successfully!' });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to change password';
      addToast({ type: 'error', message });
    },
  });
};

// Company
export const useCompany = () => {
  return useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const response = await apiClient.get('/users/company');
      return response.data.data;
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (data: { name: string; domain: string }) => {
      const response = await apiClient.put('/users/company', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      addToast({ type: 'success', message: 'Company settings updated successfully!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update company settings' });
    },
  });
};

export const useCompanyUsers = () => {
  return useQuery({
    queryKey: ['company', 'users'],
    queryFn: async () => {
      const response = await apiClient.get('/users/company/users');
      return response.data.data;
    },
  });
};

export const useCompanyStats = () => {
  return useQuery({
    queryKey: ['company', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/users/company/stats');
      return response.data.data;
    },
  });
};

export const useTenantInvites = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['company', 'invites'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: TenantInvite[] }>('/admin/invites');
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useCreateInvite = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (data: { email: string; role: 'ADMIN' | 'MANAGER' | 'USER'; note?: string }) => {
      const response = await apiClient.post<{ data: { invite: TenantInvite; token: string } }>('/admin/invites', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'invites'] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to send invite' });
    },
  });
};

// Company Theme
export const useCompanyTheme = () => {
  return useQuery({
    queryKey: ['companyTheme'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: CompanyTheme }>(buildTenantPath('/theme'));
      return response.data.data;
    },
  });
};

export const useUpdateCompanyTheme = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();

  return useMutation({
    mutationFn: async (data: Partial<Pick<CompanyTheme, 'primaryColor' | 'secondaryColor' | 'backgroundColor'>> & { useCover?: boolean }) => {
      const response = await apiClient.put<{ data: CompanyTheme }>(buildTenantPath('/admin/theme'), data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['companyTheme'], data);
      addToast({ type: 'success', message: 'Theme updated' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update theme' });
    },
  });
};

export const useUploadThemeCover = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('cover', file);
      const response = await apiClient.post<{ data: CompanyTheme }>(buildTenantPath('/admin/theme/cover'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['companyTheme'], data);
      addToast({ type: 'success', message: 'Cover photo updated' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to upload cover photo';
      addToast({ type: 'error', message });
    },
  });
};

export const useRedeemInvite = () => {
  return useMutation({
    mutationFn: async (data: { token: string; name: string; password: string }) => {
      const slug = getCurrentTenantSlug();
      const path = slug ? `/auth/invites/${slug}/redeem` : '/auth/invites/redeem';
      const response = await apiClient.post<{ data: { token: string; user: User } }>(path, data);
      return response.data.data;
    },
  });
};

// User Statistics
export const useUserStats = () => {
  return useQuery({
    queryKey: ['user', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/users/stats');
      return response.data.data;
    },
  });
};

// Notifications
export const useNotifications = (params?: { unreadOnly?: boolean; limit?: number }) => {
  const unreadKey = params?.unreadOnly ? 'unread' : 'all';
  const limitKey =
    typeof params?.limit === 'number' ? `limit:${params.limit}` : 'limit:none';
  const refetchInterval = useNotificationsRealtimeStore(selectNotificationsRefetchInterval);

  return useQuery({
    queryKey: ['notifications', unreadKey, limitKey],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      
      const response = await apiClient.get<{ data: NotificationEvent[] }>(
        queryParams.size > 0 ? `/notifications?${queryParams.toString()}` : '/notifications'
      );
      return response.data.data;
    },
    staleTime: 15_000,
    refetchInterval,
    refetchOnWindowFocus: false,
  });
};

export const useNotificationStats = () => {
  const refetchInterval = useNotificationsRealtimeStore(selectNotificationsRefetchInterval);

  return useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: NotificationStats }>('/notifications/stats');
      return response.data.data;
    },
    staleTime: 15_000,
    refetchInterval,
    refetchOnWindowFocus: false,
  });
};

export const useNotificationAnalytics = () => {
  return useQuery({
    queryKey: ['notifications', 'analytics', 'summary'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: NotificationAnalyticsSummary }>(
        '/notifications/analytics/summary'
      );
      return response.data.data;
    },
    staleTime: 60_000,
  });
};

type NotificationsMutationContext = {
  previousNotifications: { queryKey: readonly unknown[]; data: NotificationEvent[] | undefined }[];
  previousStats: NotificationStats | undefined;
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, unknown, string, NotificationsMutationContext>({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const notificationsQueries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['notifications'] });

      const previousNotifications = notificationsQueries.map((query) => ({
        queryKey: query.queryKey,
        data: queryClient.getQueryData<NotificationEvent[]>(query.queryKey),
      }));

      const previousStats = queryClient.getQueryData<NotificationStats>(['notifications', 'stats']);

      let shouldDecrementUnread = false;

      notificationsQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (existing: unknown) => {
          if (!Array.isArray(existing)) return existing;

          const [, scopeSegment] = query.queryKey as [string, string?, string?];

          if (scopeSegment === 'unread') {
            const hadUnread = existing.some((item: NotificationEvent) => item.id === notificationId);
            if (hadUnread) {
              shouldDecrementUnread = true;
            }
            return existing.filter((item: NotificationEvent) => item.id !== notificationId);
          }

          let updated = existing as NotificationEvent[];
          let changed = false;

          updated = (existing as NotificationEvent[]).map((item) => {
            if (item.id !== notificationId) return item;
            if (!item.read) {
              shouldDecrementUnread = true;
            }
            changed = true;
            return { ...item, read: true };
          });

          return changed ? updated : existing;
        });
      });

      if (shouldDecrementUnread) {
        queryClient.setQueryData<NotificationStats | undefined>(['notifications', 'stats'], (stats) => {
          if (!stats) return stats;
          return {
            total: stats.total,
            unread: Math.max(0, stats.unread - 1),
          };
        });
      }

      return { previousNotifications, previousStats };
    },
    onError: (_error, _notificationId, context) => {
      if (!context) return;

      context.previousNotifications.forEach(({ queryKey, data }: { queryKey: readonly unknown[]; data: NotificationEvent[] | undefined }) => {
        queryClient.setQueryData(queryKey, data);
      });

      queryClient.setQueryData(['notifications', 'stats'], context.previousStats);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation<void, unknown, void, NotificationsMutationContext>({
    mutationFn: async () => {
      await apiClient.post('/notifications/mark-all-read');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const notificationsQueries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['notifications'] });

      const previousNotifications = notificationsQueries.map((query) => ({
        queryKey: query.queryKey,
        data: queryClient.getQueryData<NotificationEvent[]>(query.queryKey),
      }));

      const previousStats = queryClient.getQueryData<NotificationStats>(['notifications', 'stats']);

      notificationsQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (existing: unknown) => {
          if (!Array.isArray(existing)) return existing;

          const [, scopeSegment] = query.queryKey as [string, string?, string?];

          if (scopeSegment === 'unread') {
            return [];
          }

          return (existing as NotificationEvent[]).map((item) =>
            item.read ? item : { ...item, read: true }
          );
        });
      });

      queryClient.setQueryData<NotificationStats | undefined>(['notifications', 'stats'], (stats) => {
        if (!stats) return stats;
        return { total: stats.total, unread: 0 };
      });

      return { previousNotifications, previousStats };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        addToast({ type: 'error', message: 'Failed to mark notifications as read' });
        return;
      }

      context.previousNotifications.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });

      queryClient.setQueryData(['notifications', 'stats'], context.previousStats);
      addToast({ type: 'error', message: 'Failed to mark notifications as read' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
      addToast({ type: 'success', message: 'All notifications marked as read' });
    },
  });
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: UserNotificationSettings }>('/notifications/settings');
      const data = response.data.data as any;
      return {
        ...data,
        emailNotifications: data.emailNotifications ?? data.emailEnabled,
        inAppNotifications: data.inAppNotifications ?? data.inAppEnabled,
      };
    },
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  
  return useMutation({
    mutationFn: async (settings: Partial<UserNotificationSettings>) => {
      const response = await apiClient.put<{ data: UserNotificationSettings }>(
        '/notifications/settings',
        settings
      );
      const data = response.data.data as any;
      return {
        ...data,
        emailNotifications: data.emailNotifications ?? data.emailEnabled,
        inAppNotifications: data.inAppNotifications ?? data.inAppEnabled,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'settings'] });
      addToast({ type: 'success', message: 'Notification settings updated' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update notification settings' });
    },
  });
};
