import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { sanitize } from '../../utils/sanitize';
import { logger } from '../../utils/logger';

export const getRestaurants = async (req: AuthRequest, res: Response) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        companyId: req.user!.companyId,
      },
      include: {
        menuItems: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({ data: restaurants });
  } catch (error) {
    logger.error('Get restaurants error:', error);
    return res.status(500).json({ message: 'Failed to fetch restaurants' });
  }
};

export const getRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
      include: {
        menuItems: {
          where: { available: true },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    return res.json({ data: restaurant });
  } catch (error) {
    logger.error('Get restaurant error:', error);
    return res.status(500).json({ message: 'Failed to fetch restaurant' });
  }
};

export const createRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { name, cuisine, openTime, closeTime, deliveryTime, hasMenu, imageUrl } =
      req.body;

    // Sanitize text inputs to prevent XSS
    const restaurant = await prisma.restaurant.create({
      data: {
        name: sanitize(name),
        cuisine: sanitize(cuisine),
        openTime: sanitize(openTime),
        closeTime: sanitize(closeTime),
        deliveryTime: sanitize(deliveryTime),
        hasMenu,
        imageUrl: imageUrl ? sanitize(imageUrl) : null,
        companyId: req.user!.companyId,
      },
    });

    return res.status(201).json({ data: restaurant });
  } catch (error) {
    logger.error('Create restaurant error:', error);
    return res.status(500).json({ message: 'Failed to create restaurant' });
  }
};

export const updateRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cuisine, openTime, closeTime, deliveryTime, hasMenu, imageUrl } = req.body;

    // Verify restaurant belongs to user's company
    const existing = await prisma.restaurant.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Sanitize text inputs
    const updateData: any = {};
    if (name !== undefined) updateData.name = sanitize(name);
    if (cuisine !== undefined) updateData.cuisine = sanitize(cuisine);
    if (openTime !== undefined) updateData.openTime = sanitize(openTime);
    if (closeTime !== undefined) updateData.closeTime = sanitize(closeTime);
    if (deliveryTime !== undefined) updateData.deliveryTime = sanitize(deliveryTime);
    if (hasMenu !== undefined) updateData.hasMenu = hasMenu;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl ? sanitize(imageUrl) : null;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: updateData,
    });

    return res.json({ data: restaurant });
  } catch (error) {
    logger.error('Update restaurant error:', error);
    return res.status(500).json({ message: 'Failed to update restaurant' });
  }
};

export const deleteRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify restaurant belongs to user's company
    const existing = await prisma.restaurant.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    await prisma.restaurant.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete restaurant error:', error);
    return res.status(500).json({ message: 'Failed to delete restaurant' });
  }
};

// Menu Items
export const getMenuItems = async (req: AuthRequest, res: Response) => {
  try {
    const { id: restaurantId } = req.params;

    // Verify restaurant belongs to user's company
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        companyId: req.user!.companyId,
      },
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        available: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return res.json({ data: menuItems });
  } catch (error) {
    logger.error('Get menu items error:', error);
    return res.status(500).json({ message: 'Failed to fetch menu items' });
  }
};

export const createMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id: restaurantId } = req.params;
    const { name, description, price, category, available } = req.body;

    // Verify restaurant belongs to user's company
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        companyId: req.user!.companyId,
      },
    });

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price,
        category,
        available: available ?? true,
        restaurantId,
      },
    });

    return res.status(201).json({ data: menuItem });
  } catch (error) {
    logger.error('Create menu item error:', error);
    return res.status(500).json({ message: 'Failed to create menu item' });
  }
};

export const updateMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id: restaurantId, itemId } = req.params;

    // Verify menu item belongs to restaurant in user's company
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        restaurantId,
        restaurant: {
          companyId: req.user!.companyId,
        },
      },
    });

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: req.body,
    });

    return res.json({ data: updated });
  } catch (error) {
    logger.error('Update menu item error:', error);
    return res.status(500).json({ message: 'Failed to update menu item' });
  }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id: restaurantId, itemId } = req.params;

    // Verify menu item belongs to restaurant in user's company
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        restaurantId,
        restaurant: {
          companyId: req.user!.companyId,
        },
      },
    });

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete menu item error:', error);
    return res.status(500).json({ message: 'Failed to delete menu item' });
  }
};
