import { Router } from 'express';
import {
  getRestaurants,
  getRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from './restaurants.controller';
import { validate } from '../../middleware/validation';
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from './restaurants.validation';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Restaurant routes
router.get('/', getRestaurants);
router.get('/:id', getRestaurant);
router.post('/', adminMiddleware, validate(createRestaurantSchema), createRestaurant);
router.patch('/:id', adminMiddleware, validate(updateRestaurantSchema), updateRestaurant);
router.delete('/:id', adminMiddleware, deleteRestaurant);

// Menu item routes
router.get('/:id/menu', getMenuItems);
router.post('/:id/menu-items', adminMiddleware, validate(createMenuItemSchema), createMenuItem);
router.patch('/:id/menu-items/:itemId', adminMiddleware, validate(updateMenuItemSchema), updateMenuItem);
router.delete('/:id/menu-items/:itemId', adminMiddleware, deleteMenuItem);

export default router;
