/**
 * Event factory for generating test event data
 */

import prisma from '../../config/database';
import { EventStatus, PaymentMethod } from '@prisma/client';

export interface EventFactoryData {
  title?: string;
  description?: string;
  deliveryLocation?: string;
  orderDeadline?: Date;
  paymentMethod?: PaymentMethod;
  status?: EventStatus;
  createdById: string;
  restaurantId: string;
  companyId: string;
}

/**
 * Create an event with factory defaults
 */
export async function createEvent(data: EventFactoryData) {
  const timestamp = Date.now();
  
  // Default to 24 hours from now for deadline
  const defaultDeadline = new Date();
  defaultDeadline.setHours(defaultDeadline.getHours() + 24);

  const event = await prisma.event.create({
    data: {
      title: data.title || `Test Event ${timestamp}`,
      description: data.description || 'Test event description',
      deliveryLocation: data.deliveryLocation || 'Test Office - Floor 1',
      orderDeadline: data.orderDeadline || defaultDeadline,
      paymentMethod: data.paymentMethod || 'EVENT_CREATOR',
      status: data.status || 'OPEN',
      createdById: data.createdById,
      restaurantId: data.restaurantId,
      companyId: data.companyId,
    },
    include: {
      restaurant: true,
      createdBy: true,
      participants: true,
    },
  });

  return event;
}

/**
 * Create multiple events
 */
export async function createEvents(count: number, baseData: EventFactoryData) {
  const events = [];
  
  for (let i = 0; i < count; i++) {
    const event = await createEvent({
      ...baseData,
      title: `${baseData.title || 'Test Event'} ${i + 1}`,
    });
    events.push(event);
  }
  
  return events;
}

/**
 * Create event with participants
 */
export async function createEventWithParticipants(
  eventData: EventFactoryData,
  participantUserIds: string[]
) {
  const event = await createEvent(eventData);

  // Add participants
  for (const userId of participantUserIds) {
    await prisma.eventParticipant.create({
      data: {
        userId,
        eventId: event.id,
      },
    });
  }

  return prisma.event.findUnique({
    where: { id: event.id },
    include: {
      restaurant: true,
      createdBy: true,
      participants: {
        include: {
          user: true,
        },
      },
    },
  });
}

/**
 * Create open event (ready for orders)
 */
export async function createOpenEvent(baseData: Omit<EventFactoryData, 'status'>) {
  return createEvent({
    ...baseData,
    status: 'OPEN',
  });
}

/**
 * Create closed event
 */
export async function createClosedEvent(baseData: Omit<EventFactoryData, 'status'>) {
  return createEvent({
    ...baseData,
    status: 'CLOSED',
  });
}

/**
 * Create event with past deadline
 */
export async function createEventWithPastDeadline(baseData: Omit<EventFactoryData, 'orderDeadline'>) {
  const pastDeadline = new Date();
  pastDeadline.setHours(pastDeadline.getHours() - 1); // 1 hour ago

  return createEvent({
    ...baseData,
    orderDeadline: pastDeadline,
  });
}

/**
 * Build event data without saving (for validation tests)
 */
export function buildEventData(overrides: Partial<EventFactoryData> = {}): any {
  const timestamp = Date.now();
  const defaultDeadline = new Date();
  defaultDeadline.setHours(defaultDeadline.getHours() + 24);

  return {
    title: `Test Event ${timestamp}`,
    description: 'Test event description',
    deliveryLocation: 'Test Office - Floor 1',
    orderDeadline: defaultDeadline,
    paymentMethod: 'EVENT_CREATOR',
    status: 'OPEN',
    ...overrides,
  };
}
