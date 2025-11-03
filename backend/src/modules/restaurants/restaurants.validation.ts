import { z } from 'zod';

export const createRestaurantSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    cuisine: z.string().min(1).max(50),
    openTime: z.string().min(1).max(20),
    closeTime: z.string().min(1).max(20),
    deliveryTime: z.string().min(1).max(50),
    hasMenu: z.boolean(),
    imageUrl: z.string().max(500).optional(),
  }),
});

export const updateRestaurantSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    cuisine: z.string().min(1).max(50).optional(),
    openTime: z.string().min(1).max(20).optional(),
    closeTime: z.string().min(1).max(20).optional(),
    deliveryTime: z.string().min(1).max(50).optional(),
    hasMenu: z.boolean().optional(),
    imageUrl: z.string().max(500).optional(),
  }),
});

export const createMenuItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    price: z.number().positive(),
    category: z.string().min(1).max(50),
    available: z.boolean().optional(),
  }),
});

export const updateMenuItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    price: z.number().positive().optional(),
    category: z.string().min(1).max(50).optional(),
    available: z.boolean().optional(),
  }),
});
