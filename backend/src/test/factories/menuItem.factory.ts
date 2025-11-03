/**
 * MenuItem factory for generating test menu item data
 */

import prisma from '../../config/database';

export interface MenuItemFactoryData {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  available?: boolean;
  restaurantId: string;
}

/**
 * Create a menu item with factory defaults
 */
export async function createMenuItem(options: MenuItemFactoryData) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  const menuItem = await prisma.menuItem.create({
    data: {
      name: options.name || `Test Item ${random}`,
      description: options.description || 'A delicious menu item',
      price: options.price ?? 12.99,
      category: options.category || 'Main Course',
      available: options.available ?? true,
      restaurantId: options.restaurantId,
    },
  });

  return menuItem;
}

/**
 * Create multiple menu items for a restaurant
 */
export async function createMenuItems(
  restaurantId: string,
  count: number,
  baseData: Partial<Omit<MenuItemFactoryData, 'restaurantId'>> = {}
) {
  const menuItems = [];
  const categories = ['Appetizers', 'Main Course', 'Sides', 'Desserts', 'Beverages'];

  for (let i = 0; i < count; i++) {
    const menuItem = await createMenuItem({
      restaurantId,
      ...baseData,
      name: `${baseData.name || 'Item'} ${i + 1}`,
      category: categories[i % categories.length],
      price: baseData.price ?? (10 + i * 2.5),
    });
    menuItems.push(menuItem);
  }

  return menuItems;
}

/**
 * Build menu item data without saving (for validation tests)
 */
export function buildMenuItemData(overrides: Partial<MenuItemFactoryData> = {}): any {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    name: `Test Item ${random}`,
    description: 'A delicious menu item',
    price: 12.99,
    category: 'Main Course',
    available: true,
    ...overrides,
  };
}
