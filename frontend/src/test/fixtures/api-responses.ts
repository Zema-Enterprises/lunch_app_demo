/**
 * API Response fixtures for mocking API data
 */

import { User } from '../factories/user';
import { Event } from '../factories/event';
import { Order } from '../factories/order';
import { Restaurant, MenuItem } from '../factories/restaurant';

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * API error response
 */
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Success response
 */
export interface SuccessResponse {
  message: string;
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number = 1,
  limit: number = 10
): PaginatedResponse<T> {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: data.slice(start, end),
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Create API error response
 */
export function createApiError(
  message: string,
  statusCode: number = 400,
  errors?: Record<string, string[]>
): ApiError {
  return {
    message,
    statusCode,
    ...(errors && { errors }),
  };
}

/**
 * Create auth response
 */
export function createAuthResponse(user: User): AuthResponse {
  return {
    token: `mock-token-${user.id}`,
    user,
  };
}

/**
 * Create success response
 */
export function createSuccessResponse(message: string = 'Success'): SuccessResponse {
  return { message };
}

/**
 * Common API error fixtures
 */
export const apiErrors = {
  unauthorized: createApiError('Unauthorized', 401),
  forbidden: createApiError('Forbidden', 403),
  notFound: createApiError('Not found', 404),
  badRequest: createApiError('Bad request', 400),
  validationError: (errors: Record<string, string[]>) =>
    createApiError('Validation failed', 400, errors),
  internalError: createApiError('Internal server error', 500),
};

/**
 * Mock API responses for common scenarios
 */
export const mockResponses = {
  // User responses
  users: {
    list: (users: User[]) => createPaginatedResponse(users),
    single: (user: User) => ({ data: user }),
    created: (user: User) => ({ data: user, message: 'User created successfully' }),
    updated: (user: User) => ({ data: user, message: 'User updated successfully' }),
    deleted: () => createSuccessResponse('User deleted successfully'),
  },

  // Event responses
  events: {
    list: (events: Event[]) => createPaginatedResponse(events),
    single: (event: Event) => ({ data: event }),
    created: (event: Event) => ({ data: event, message: 'Event created successfully' }),
    updated: (event: Event) => ({ data: event, message: 'Event updated successfully' }),
    deleted: () => createSuccessResponse('Event deleted successfully'),
    closed: (event: Event) => ({ data: event, message: 'Event closed successfully' }),
  },

  // Order responses
  orders: {
    list: (orders: Order[]) => createPaginatedResponse(orders),
    single: (order: Order) => ({ data: order }),
    created: (order: Order) => ({ data: order, message: 'Order created successfully' }),
    updated: (order: Order) => ({ data: order, message: 'Order updated successfully' }),
    deleted: () => createSuccessResponse('Order deleted successfully'),
    confirmed: (order: Order) => ({ data: order, message: 'Payment confirmed successfully' }),
  },

  // Restaurant responses
  restaurants: {
    list: (restaurants: Restaurant[]) => createPaginatedResponse(restaurants),
    single: (restaurant: Restaurant) => ({ data: restaurant }),
    created: (restaurant: Restaurant) => ({
      data: restaurant,
      message: 'Restaurant created successfully',
    }),
    updated: (restaurant: Restaurant) => ({
      data: restaurant,
      message: 'Restaurant updated successfully',
    }),
    deleted: () => createSuccessResponse('Restaurant deleted successfully'),
    menu: (menuItems: MenuItem[]) => ({ data: menuItems }),
  },

  // Auth responses
  auth: {
    login: (user: User) => createAuthResponse(user),
    register: (user: User) => createAuthResponse(user),
    logout: () => createSuccessResponse('Logged out successfully'),
    profile: (user: User) => ({ data: user }),
  },
};
