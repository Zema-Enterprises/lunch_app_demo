import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { sanitize } from '../../utils/sanitize';
import { createNotificationEvent, createNotificationEvents } from '../notifications/notification.service';

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const events = await prisma.event.findMany({
      where: {
        companyId: req.user!.companyId,
        ...(status && { status: status as any }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restaurant: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        orderDeadline: 'asc',
      },
    });

    return res.json({ data: events });
  } catch (error) {
    console.error('Get events error:', error);
    return res.status(500).json({ message: 'Failed to fetch events' });
  }
};

export const getEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // First check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restaurant: {
          include: {
            menuItems: {
              where: { available: true },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        orders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            orderItems: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Then check company isolation
    if (event.companyId !== req.user!.companyId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json({ data: event });
  } catch (error) {
    console.error('Get event error:', error);
    return res.status(500).json({ message: 'Failed to fetch event' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, deliveryLocation, orderDeadline, paymentMethod, restaurantId } =
      req.body;

    // Validate orderDeadline is in the future
    const deadline = new Date(orderDeadline);
    if (deadline <= new Date()) {
      return res.status(400).json({ message: 'Order deadline must be in the future' });
    }

    // Verify restaurant exists and belongs to company
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
      },
    });

    if (!restaurant) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }

    if (restaurant.companyId !== req.user!.companyId) {
      return res.status(403).json({ message: 'Restaurant does not belong to your company' });
    }

    // Sanitize text inputs to prevent XSS
    const event = await prisma.event.create({
      data: {
        title: sanitize(title),
        description: description ? sanitize(description) : null,
        deliveryLocation: deliveryLocation ? sanitize(deliveryLocation) : 'Office',
        orderDeadline: deadline,
        paymentMethod: paymentMethod || 'EVENT_CREATOR',
        restaurantId,
        createdById: req.user!.userId,
        companyId: req.user!.companyId,
        estimatedDelivery: restaurant.deliveryTime, // Set from restaurant
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restaurant: true,
      },
    });

    // Automatically add creator as participant
    await prisma.eventParticipant.create({
      data: {
        userId: req.user!.userId,
        eventId: event.id,
      },
    });

    // Send EVENT_CREATED notifications to company users (based on preferences)
    const companyUsers = await prisma.user.findMany({
      where: { companyId: req.user!.companyId },
      select: { id: true },
    });
    
    await createNotificationEvents(
      'EVENT_CREATED',
      companyUsers.map(u => u.id),
      { eventId: event.id }
    );

    return res.status(201).json({ data: event });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ message: 'Failed to create event' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify event exists and user is creator
    const existing = await prisma.event.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (existing.createdById !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only event creator can update event' });
    }

    // Don't allow most updates to closed/completed/cancelled events
    // But allow deliveredAt and status updates for closed events (to support delivery tracking and completion)
    const isDeliveryOrStatusUpdate = 
      Object.keys(req.body).length <= 2 && 
      (req.body.deliveredAt !== undefined || req.body.status !== undefined);
    
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      if (!isDeliveryOrStatusUpdate) {
        return res.status(403).json({ message: 'Cannot update completed or cancelled event' });
      }
    }

    if (existing.status === 'CLOSED' && !isDeliveryOrStatusUpdate) {
      return res.status(403).json({ message: 'Cannot update closed event except for delivery status or completion' });
    }

    const updateData: any = {};
    
    if (req.body.title) updateData.title = sanitize(req.body.title);
    if (req.body.description !== undefined) updateData.description = req.body.description ? sanitize(req.body.description) : null;
    if (req.body.deliveryLocation) updateData.deliveryLocation = sanitize(req.body.deliveryLocation);
    if (req.body.paymentMethod) updateData.paymentMethod = req.body.paymentMethod;
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.deliveredAt !== undefined) updateData.deliveredAt = req.body.deliveredAt ? new Date(req.body.deliveredAt) : null;
    
    if (req.body.orderDeadline) {
      const deadline = new Date(req.body.orderDeadline);
      if (deadline <= new Date()) {
        return res.status(400).json({ message: 'Order deadline must be in the future' });
      }
      updateData.orderDeadline = deadline;
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restaurant: true,
        participants: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Send notifications based on what was updated
    const participantIds = event.participants.map(p => p.user.id);

    // If deliveredAt was set, send EVENT_DELIVERED notification
    if (req.body.deliveredAt !== undefined && updateData.deliveredAt) {
      await createNotificationEvents(
        'EVENT_DELIVERED',
        participantIds,
        { eventId: event.id }
      );
    }

    // If status was set to COMPLETED, send EVENT_COMPLETED notification
    if (req.body.status === 'COMPLETED' && updateData.status === 'COMPLETED') {
      await createNotificationEvents(
        'EVENT_COMPLETED',
        participantIds,
        { eventId: event.id }
      );
    }

    return res.json({ data: event });
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({ message: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify event exists and user is creator
    const existing = await prisma.event.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (existing.createdById !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only event creator can delete event' });
    }

    // Don't allow deletion if there are orders
    if (existing._count.orders > 0) {
      return res.status(400).json({ message: 'Cannot delete event with existing orders' });
    }

    await prisma.event.delete({
      where: { id },
    });

    return res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({ message: 'Failed to delete event' });
  }
};

export const closeEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify event exists and user is creator
    const existing = await prisma.event.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (existing.createdById !== req.user!.userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only event creator can close event' });
    }

    // Check if already closed
    if (existing.status === 'CLOSED' || existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Event is already closed' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        restaurant: true,
        participants: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Notify all participants that event is closed
    const participantIds = event.participants.map(p => p.user.id);
    await createNotificationEvents(
      'EVENT_CLOSED',
      participantIds,
      { eventId: event.id }
    );

    return res.json({ data: event });
  } catch (error) {
    console.error('Close event error:', error);
    return res.status(500).json({ message: 'Failed to close event' });
  }
};

export const joinEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify event exists and belongs to user's company
    const event = await prisma.event.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
    });

    if (!event) {
      return res.status(403).json({ message: 'Event not found or access denied' });
    }

    // Check if event is open
    if (event.status !== 'OPEN') {
      return res.status(403).json({ message: 'Cannot join closed event' });
    }

    // Check if already participant
    const existing = await prisma.eventParticipant.findUnique({
      where: {
        userId_eventId: {
          userId: req.user!.userId,
          eventId: id,
        },
      },
    });

    if (existing) {
      // Idempotent - return success if already joined
      const participant = await prisma.eventParticipant.findUnique({
        where: {
          userId_eventId: {
            userId: req.user!.userId,
            eventId: id,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.status(201).json({ data: participant });
    }

    const participant = await prisma.eventParticipant.create({
      data: {
        userId: req.user!.userId,
        eventId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify event creator that someone joined
    await createNotificationEvent({
      type: 'USER_JOINED_EVENT',
      userId: event.createdById,
      eventId: id,
    });

    return res.status(201).json({ data: participant });
  } catch (error) {
    console.error('Join event error:', error);
    return res.status(500).json({ message: 'Failed to join event' });
  }
};

/**
 * Check if event meets auto-completion criteria and complete if so
 * Criteria: Event is CLOSED, all orders paid, and delivery marked
 */
export const checkCompletion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get event with orders and participants
    const event = await prisma.event.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
      include: {
        orders: true,
        participants: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check auto-completion criteria
    const isClosed = event.status === 'CLOSED';
    const hasOrders = event.orders.length > 0;
    const allPaid = hasOrders && event.orders.every(o => o.paymentConfirmed);
    const isDelivered = event.deliveredAt !== null;

    if (isClosed && allPaid && isDelivered && event.status !== 'COMPLETED') {
      // Auto-complete the event
      await prisma.event.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      // Notify all participants
      const participantIds = event.participants.map(p => p.user.id);
      await createNotificationEvents('EVENT_COMPLETED', participantIds, { eventId: id });

      return res.json({
        data: {
          message: 'Event auto-completed',
          completed: true,
        },
      });
    }

    // Event not ready for auto-completion
    return res.json({
      data: {
        message: 'Event not ready for completion',
        completed: false,
        criteria: {
          isClosed,
          hasOrders,
          allPaid,
          isDelivered,
        },
      },
    });
  } catch (error) {
    console.error('Check completion error:', error);
    return res.status(500).json({ message: 'Failed to check completion' });
  }
};
