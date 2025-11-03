import { Router } from 'express';
import {
  getEventOrders,
  createOrUpdateOrder,
  deleteOrder,
  confirmPayment,
  getUserOrders,
} from './orders.controller';
import { validate } from '../../middleware/validation';
import { createOrderSchema } from './orders.validation';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// User's orders
router.get('/me', getUserOrders);

// Event-specific orders
router.get('/:eventId/orders', getEventOrders);
router.post('/:eventId/orders', validate(createOrderSchema), createOrUpdateOrder);
router.delete('/:eventId/orders/:id', deleteOrder);
router.patch('/:eventId/orders/:id/payment', confirmPayment);

export default router;
