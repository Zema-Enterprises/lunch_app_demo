import { Router } from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  closeEvent,
  joinEvent,
  leaveEvent,
  getEventOrders,
  checkCompletion,
} from './events.controller';
import { validate } from '../../middleware/validation';
import { createEventSchema, updateEventSchema } from './events.validation';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getEvents);
router.get('/:id', getEvent);
router.get('/:id/orders', getEventOrders);
router.post('/', adminMiddleware, validate(createEventSchema), createEvent);
router.patch('/:id', validate(updateEventSchema), updateEvent);
router.delete('/:id', deleteEvent);
router.post('/:id/close', closeEvent);
router.post('/:id/join', joinEvent);
router.post('/:id/leave', leaveEvent);
router.post('/:id/check-completion', checkCompletion);

export default router;
