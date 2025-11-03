import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    customOrder: z.string().optional(),
    totalAmount: z.number().positive().optional(),
    paymentConfirmed: z.boolean().optional(),
    orderItems: z.array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    ).optional(),
  }),
});

export const updateOrderSchema = z.object({
  body: z.object({
    customOrder: z.string().optional(),
    totalAmount: z.number().positive().optional(),
    paymentConfirmed: z.boolean().optional(),
    orderItems: z.array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    ).optional(),
  }),
});
