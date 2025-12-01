import { describe, expect, it } from 'vitest';
import { notificationEventSchema } from '@/lib/validation/schemas';

describe('Notification contract (enriched payload)', () => {
  it('expects categorized, descriptive notification payloads', () => {
    const payload = {
      id: 'notif-1',
      type: 'USER_JOINED_EVENT',
      userId: 'creator-1',
      eventId: 'event-1',
      orderId: undefined,
      read: false,
      sentEmail: false,
      sentInApp: true,
      createdAt: '2025-12-01T12:00:00.000Z',
      category: 'participant_activity',
      title: 'Test User 0 joined Team Sync Lunch',
      body: 'Test User 0 joined Team Sync Lunch at Payload Bistro',
      actor: { id: 'user-0', name: 'Test User 0' },
      subject: { eventId: 'event-1', eventTitle: 'Team Sync Lunch', restaurantName: 'Payload Bistro' },
      cta: { kind: 'event', id: 'event-1' },
      meta: { deliveryEtaMinutes: 35 },
    };

    const parsed = notificationEventSchema.parse(payload) as any;

    expect(parsed.category).toBe('participant_activity');
    expect(parsed.title).toMatch(/joined/i);
    expect(parsed.actor).toMatchObject({ id: 'user-0', name: 'Test User 0' });
    expect(parsed.subject).toMatchObject({ eventId: 'event-1', eventTitle: 'Team Sync Lunch' });
    expect(parsed.cta).toMatchObject({ kind: 'event', id: 'event-1' });
  });
});
