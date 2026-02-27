export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  slug: string;
  createdAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  openTime: string;
  closeTime: string;
  deliveryTime: string;
  hasMenu: boolean;
  imageUrl?: string;
  companyId: string;
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  restaurantId: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  deliveryLocation: string;
  orderDeadline: string;
  estimatedDelivery?: string; // e.g., "45 minutes"
  deliveredAt?: string; // ISO timestamp
  paymentMethod: 'EVENT_CREATOR' | 'INDIVIDUAL' | 'COMPANY_EXPENSE';
  status: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  createdById: string;
  restaurantId: string;
  companyId: string;
  createdAt: string;
  createdBy?: User;
  restaurant?: Restaurant;
  participants?: EventParticipant[];
  orders?: Order[];
}

export interface EventParticipant {
  id: string;
  userId: string;
  eventId: string;
  joinedAt: string;
  user?: User;
}

export interface Order {
  id: string;
  customOrder?: string;
  totalAmount?: number;
  paymentConfirmed: boolean;
  userId: string;
  eventId: string;
  createdAt: string;
  user?: User;
  orderItems?: OrderItem[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  orderId: string;
  menuItemId: string;
  menuItem?: MenuItem;
}

export interface AuthResponse {
  token: string;
  user: User;
  company: Company;
}

export type InviteStatus = 'PENDING' | 'REDEEMED' | 'REVOKED' | 'EXPIRED';

export interface TenantInvite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  note?: string | null;
  companyId: string;
  expiresAt: string;
  redeemedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  status: InviteStatus;
}

// Notification types
export type NotificationType =
  | 'EVENT_CREATED'
  | 'EVENT_CLOSED'
  | 'EVENT_COMPLETED'
  | 'EVENT_DELIVERED'
  | 'USER_JOINED_EVENT'
  | 'USER_LEFT_EVENT'
  | 'EVENT_CLOSING_SOON'
  | 'REMINDER_SENT'
  | 'ORDER_PLACED'
  | 'ORDER_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_REMINDER';

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  userId: string;
  eventId?: string;
  orderId?: string;
  read: boolean;
  sentEmail: boolean;
  sentInApp: boolean;
  createdAt: string;
   category?: string;
   title?: string;
   body?: string;
   actor?: { id: string; name?: string | null } | null;
   subject?: { eventId?: string; eventTitle?: string; restaurantName?: string | null };
   cta?: { kind: string; id?: string };
   meta?: Record<string, unknown> | null;
  // Populated relations
  event?: Event;
  order?: Order;
  user?: User;
}

export interface UserNotificationSettings {
  id: string;
  userId: string;
  notifyOnEventCreated: boolean;
  notifyOnEventClosed: boolean;
  notifyOnEventCompleted: boolean;
  notifyOnEventDelivered: boolean;
  notifyOnUserJoinedEvent: boolean;
  notifyOnOrderPlaced: boolean;
  notifyOnOrderUpdated: boolean;
  notifyOnPaymentConfirmed: boolean;
  notifyOnPaymentReminder: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EditableNotificationKey = {
  [K in keyof UserNotificationSettings]: UserNotificationSettings[K] extends boolean ? K : never;
}[keyof UserNotificationSettings];

export interface NotificationStats {
  total: number;
  unread: number;
}

export interface NotificationDeliveryBreakdown {
  [channel: string]: {
    [status: string]: number;
  };
}

export interface NotificationAnalyticsSummary {
  companyId: string;
  totals: {
    notifications: number;
    unread: number;
  };
  delivery: NotificationDeliveryBreakdown;
}

export interface ThemeCoverMeta {
  width: number | null;
  height: number | null;
  format: string | null;
  size?: number | null;
}

export interface CompanyTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  coverPhotoUrl: string | null;
  coverPhotoMeta: ThemeCoverMeta | null;
}
