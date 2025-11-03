"use strict";
/**
 * Event factory for generating test event data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.createEvents = createEvents;
exports.createEventWithParticipants = createEventWithParticipants;
exports.createOpenEvent = createOpenEvent;
exports.createClosedEvent = createClosedEvent;
exports.createEventWithPastDeadline = createEventWithPastDeadline;
exports.buildEventData = buildEventData;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Create an event with factory defaults
 */
async function createEvent(data) {
    const timestamp = Date.now();
    // Default to 24 hours from now for deadline
    const defaultDeadline = new Date();
    defaultDeadline.setHours(defaultDeadline.getHours() + 24);
    const event = await database_1.default.event.create({
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
async function createEvents(count, baseData) {
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
async function createEventWithParticipants(eventData, participantUserIds) {
    const event = await createEvent(eventData);
    // Add participants
    for (const userId of participantUserIds) {
        await database_1.default.eventParticipant.create({
            data: {
                userId,
                eventId: event.id,
            },
        });
    }
    return database_1.default.event.findUnique({
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
async function createOpenEvent(baseData) {
    return createEvent({
        ...baseData,
        status: 'OPEN',
    });
}
/**
 * Create closed event
 */
async function createClosedEvent(baseData) {
    return createEvent({
        ...baseData,
        status: 'CLOSED',
    });
}
/**
 * Create event with past deadline
 */
async function createEventWithPastDeadline(baseData) {
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
function buildEventData(overrides = {}) {
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
