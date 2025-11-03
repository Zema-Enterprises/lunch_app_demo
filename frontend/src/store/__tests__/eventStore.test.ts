import { describe, it, expect, afterEach } from 'vitest';
import { useEventStore } from '../eventStore';
import { Event } from '../../types';

const mockEvent = (overrides?: Partial<Event>): Event => ({
  id: 'event-1',
  title: 'Team Lunch',
  description: 'Monthly lunch',
  status: 'OPEN',
  orderDeadline: new Date().toISOString(),
  deliveryLocation: 'HQ',
  paymentMethod: 'COMPANY_EXPENSE',
  restaurantId: 'restaurant-1',
  companyId: 'company-1',
  createdById: 'user-1',
  createdAt: new Date().toISOString(),
  participants: [],
  orders: [],
  ...overrides,
});

describe('eventStore', () => {
  afterEach(() => {
    useEventStore.setState({
      events: [],
      selectedEvent: null,
      filters: {},
    });
  });

  it('stores events and retrieves them', () => {
    const events = [mockEvent(), mockEvent({ id: 'event-2', title: 'Retro Lunch' })];
    useEventStore.getState().setEvents(events);

    expect(useEventStore.getState().events).toEqual(events);
  });

  it('updates selected event', () => {
    const event = mockEvent();
    useEventStore.getState().setSelectedEvent(event);

    expect(useEventStore.getState().selectedEvent).toEqual(event);

    useEventStore.getState().setSelectedEvent(null);
    expect(useEventStore.getState().selectedEvent).toBeNull();
  });

  it('updates filters', () => {
    useEventStore.getState().setFilters({ status: 'OPEN', search: 'Lunch' });

    expect(useEventStore.getState().filters).toEqual({ status: 'OPEN', search: 'Lunch' });
  });
});
