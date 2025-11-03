/**
 * Restaurant factories for generating test restaurant data
 */

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  restaurantId: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  openTime?: string;
  closeTime?: string;
  deliveryTime: string;
  hasMenu: boolean;
  imageUrl?: string;
  companyId: string;
  menuItems?: MenuItem[];
}

let restaurantCounter = 0;

/**
 * Create a mock restaurant
 */
export function createRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  restaurantCounter++;
  
  return {
    id: `restaurant-${restaurantCounter}`,
    name: `Test Restaurant ${restaurantCounter}`,
    cuisine: 'Italian',
    openTime: '11:00',
    closeTime: '22:00',
    deliveryTime: '30-45 minutes',
    hasMenu: true,
    companyId: 'company-1',
    menuItems: [],
    ...overrides,
  };
}

/**
 * Create restaurant with menu
 */
export function createRestaurantWithMenu(
  menuItemCount: number = 5,
  overrides: Partial<Restaurant> = {}
): Restaurant {
  const restaurant = createRestaurant(overrides);
  const menuItems: MenuItem[] = [];

  const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages'];
  const dishes = [
    'Pizza Margherita',
    'Caesar Salad',
    'Spaghetti Carbonara',
    'Tiramisu',
    'Soft Drink',
  ];

  for (let i = 0; i < menuItemCount; i++) {
    menuItems.push({
      id: `menu-${restaurant.id}-${i + 1}`,
      name: dishes[i % dishes.length] + ` ${i + 1}`,
      description: `Delicious ${dishes[i % dishes.length].toLowerCase()}`,
      price: 10 + i * 2.5,
      category: categories[i % categories.length],
      available: true,
      restaurantId: restaurant.id,
    });
  }

  return {
    ...restaurant,
    menuItems,
  };
}

/**
 * Create menu item
 */
export function createMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  const itemNum = Math.random().toString(36).substring(7);
  
  return {
    id: `menu-${itemNum}`,
    name: `Menu Item ${itemNum}`,
    description: 'Delicious food item',
    price: 12.99,
    category: 'Main Course',
    available: true,
    restaurantId: 'restaurant-1',
    ...overrides,
  };
}

/**
 * Create multiple restaurants
 */
export function createRestaurants(
  count: number,
  overrides: Partial<Restaurant> = {}
): Restaurant[] {
  const cuisines = ['Italian', 'Japanese', 'Mexican', 'Chinese', 'American'];
  
  return Array.from({ length: count }, (_, i) =>
    createRestaurant({
      ...overrides,
      cuisine: cuisines[i % cuisines.length],
    })
  );
}

/**
 * Reset counter
 */
export function resetRestaurantCounter() {
  restaurantCounter = 0;
}
