import { z } from 'zod';

export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

export const PASSWORD_REQUIREMENTS_HINT =
  'Use at least 8 characters with uppercase, lowercase, number, and a special character.';

// Restaurant validation schemas
export const restaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  cuisine: z.string().min(1, 'Cuisine type is required'),
  openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  deliveryTime: z.string().min(1, 'Delivery time is required'),
  hasMenu: z.boolean().optional(),
  imageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export type RestaurantFormData = z.infer<typeof restaurantSchema>;

// Event validation schemas
export const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  restaurantId: z.string().min(1, 'Restaurant is required'),
  deliveryLocation: z.string().min(1, 'Delivery location is required'),
  orderDeadline: z.string().min(1, 'Order deadline is required'),
  paymentMethod: z.enum(['EVENT_CREATOR', 'INDIVIDUAL', 'COMPANY_EXPENSE']),
});

export type EventFormData = z.infer<typeof eventSchema>;

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyDomain: z.string().min(1, 'Company domain is required'),
  companySlug: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .max(100, 'Password must be 100 characters or fewer')
    .regex(PASSWORD_COMPLEXITY_REGEX, PASSWORD_REQUIREMENTS_MESSAGE),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Order validation schemas
export const customOrderSchema = z.object({
  customOrder: z.string().min(1, 'Order description is required'),
  notes: z.string().optional(),
});

export type CustomOrderFormData = z.infer<typeof customOrderSchema>;

// Notification validation schemas
export const notificationTypeSchema = z.enum([
  'EVENT_CREATED',
  'EVENT_CLOSED',
  'EVENT_COMPLETED',
  'EVENT_DELIVERED',
  'USER_JOINED_EVENT',
  'ORDER_PLACED',
  'ORDER_UPDATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REMINDER',
]);

export const notificationEventSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  userId: z.string(),
  eventId: z.string().optional(),
  orderId: z.string().optional(),
  read: z.boolean(),
  sentEmail: z.boolean(),
  sentInApp: z.boolean(),
  createdAt: z.string(),
});

export const userNotificationSettingsSchema = z.object({
  notifyOnEventCreated: z.boolean().optional(),
  notifyOnEventClosed: z.boolean().optional(),
  notifyOnEventCompleted: z.boolean().optional(),
  notifyOnEventDelivered: z.boolean().optional(),
  notifyOnUserJoinedEvent: z.boolean().optional(),
  notifyOnOrderPlaced: z.boolean().optional(),
  notifyOnOrderUpdated: z.boolean().optional(),
  notifyOnPaymentConfirmed: z.boolean().optional(),
  notifyOnPaymentReminder: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
});

export type UserNotificationSettingsFormData = z.infer<typeof userNotificationSettingsSchema>;
