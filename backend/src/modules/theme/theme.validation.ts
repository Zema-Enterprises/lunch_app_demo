import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, { message: 'must be a 6-character hex color' });

export const updateThemeSchema = z.object({
  body: z.object({
    primaryColor: hexColor.optional(),
    secondaryColor: hexColor.optional(),
    backgroundColor: hexColor.optional(),
    useCover: z.boolean().optional(),
  }),
});
