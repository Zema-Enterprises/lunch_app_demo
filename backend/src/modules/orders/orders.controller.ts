import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { createNotificationEvent } from '../notifications/notification.service';

export const getEventOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Verify event exists and belongs to company
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        companyId: req.user!.companyId,
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const orders = await prisma.order.findMany({
      where: {
        eventId,
      },
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
    });

    return res.json({ data: orders });
  } catch (error) {
    console.error('Get event orders error:', error);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

export const createOrUpdateOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { customOrder, totalAmount, paymentConfirmed, orderItems } = req.body;

    // Verify event exists, belongs to company, and is open
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        companyId: req.user!.companyId,
      },
      include: {
        restaurant: true,
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'OPEN') {
      return res.status(400).json({ message: 'Event is closed for orders' });
    }

    // Check if user is participant
    const participant = await prisma.eventParticipant.findUnique({
      where: {
        userId_eventId: {
          userId: req.user!.userId,
          eventId,
        },
      },
    });

    if (!participant) {
      return res.status(403).json({ message: 'Must join event before placing order' });
    }

    // Validate menu items if provided
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        
        if (!menuItem) {
          return res.status(404).json({ message: `Menu item not found: ${item.menuItemId}` });
        }
      }
    }

    // Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: {
        userId_eventId: {
          userId: req.user!.userId,
          eventId,
        },
      },
    });

    let order;

    if (existingOrder) {
      // Update existing order
      order = await prisma.$transaction(async (tx) => {
        // Delete old order items
        await tx.orderItem.deleteMany({
          where: { orderId: existingOrder.id },
        });

        // Update order
        const updated = await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            customOrder,
            totalAmount,
            paymentConfirmed: paymentConfirmed ?? false,
          },
        });

        // Create new order items if provided
        if (orderItems && orderItems.length > 0) {
          await tx.orderItem.createMany({
            data: orderItems.map((item: any) => ({
              orderId: updated.id,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
            })),
          });
        }

        return tx.order.findUnique({
          where: { id: updated.id },
          include: {
            orderItems: {
              include: {
                menuItem: true,
              },
            },
          },
        });
      });
    } else {
      // Create new order
      order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            customOrder,
            totalAmount,
            paymentConfirmed: paymentConfirmed ?? false,
            userId: req.user!.userId,
            eventId,
          },
        });

        // Create order items if provided
        if (orderItems && orderItems.length > 0) {
          await tx.orderItem.createMany({
            data: orderItems.map((item: any) => ({
              orderId: newOrder.id,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
            })),
          });
        }

        return tx.order.findUnique({
          where: { id: newOrder.id },
          include: {
            orderItems: {
              include: {
                menuItem: true,
              },
            },
          },
        });
      });
    }

    // Send notification to event creator when new order placed (but not if creator places their own order)
    if (!existingOrder) {
      const eventCreator = await prisma.event.findUnique({
        where: { id: eventId },
        select: { createdById: true },
      });

      if (eventCreator && eventCreator.createdById !== req.user!.userId) {
        await createNotificationEvent({
          type: 'ORDER_PLACED',
          userId: eventCreator.createdById,
          eventId,
          orderId: order!.id,
        });
      }
    }

    return res.status(existingOrder ? 200 : 201).json({ data: order });
  } catch (error) {
    console.error('Create/update order error:', error);
    return res.status(500).json({ message: 'Failed to create/update order' });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, id } = req.params;

    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id,
        eventId,
        userId: req.user!.userId,
        event: {
          companyId: req.user!.companyId,
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if event is still open
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (event?.status !== 'OPEN') {
      return res.status(400).json({ message: 'Cannot delete order - event is closed' });
    }

    await prisma.order.delete({
      where: { id },
    });

    return res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    return res.status(500).json({ message: 'Failed to delete order' });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, id } = req.params;

    // Get the event to check payment method and creator
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        companyId: req.user!.companyId,
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Verify order exists in this event
    const order = await prisma.order.findFirst({
      where: {
        id,
        eventId,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Permission check: 
    // - If EVENT_CREATOR payment method, only creator can confirm payments
    // - Otherwise, only order owner can confirm their own payment
    const isCreator = event.createdById === req.user!.userId;
    const isOwner = order.userId === req.user!.userId;

    if (event.paymentMethod === 'EVENT_CREATOR') {
      if (!isCreator) {
        return res.status(403).json({ message: 'Only event creator can confirm payments' });
      }
    } else {
      if (!isOwner) {
        return res.status(403).json({ message: 'You can only confirm your own payment' });
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { paymentConfirmed: true },
    });

    // Notify user that payment was confirmed
    await createNotificationEvent({
      type: 'PAYMENT_CONFIRMED',
      userId: order.userId,
      eventId,
      orderId: order.id,
    });

    return res.json({ data: updated });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return res.status(500).json({ message: 'Failed to confirm payment' });
  }
};

// Get all orders for current user
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true,
                cuisine: true,
                imageUrl: true,
              },
            },
          },
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ data: orders });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

