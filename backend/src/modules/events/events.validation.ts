import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    deliveryLocation: z.string().min(1).max(200).optional(),
    orderDeadline: z.string().datetime(),
    paymentMethod: z.enum(['EVENT_CREATOR', 'INDIVIDUAL', 'COMPANY_EXPENSE']).optional(),
    restaurantId: z.string().min(1),
  }),
});

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    deliveryLocation: z.string().min(1).max(200).optional(),
    orderDeadline: z.string().datetime().optional(),
    paymentMethod: z.enum(['EVENT_CREATOR', 'INDIVIDUAL', 'COMPANY_EXPENSE']).optional(),
    status: z.enum(['OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
});
