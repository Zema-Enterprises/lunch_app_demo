/**
 * Restaurant fixtures - predefined restaurant data for tests
 */

export const testRestaurants = {
  italianBistro: {
    name: 'Italian Bistro',
    cuisine: 'Italian',
    openTime: '11:00',
    closeTime: '22:00',
    deliveryTime: '30-45 minutes',
    hasMenu: true,
    menu: [
      {
        name: 'Margherita Pizza',
        description: 'Classic tomato and mozzarella',
        price: 12.99,
        category: 'Main Course',
        available: true,
      },
      {
        name: 'Spaghetti Carbonara',
        description: 'Creamy pasta with bacon',
        price: 14.99,
        category: 'Main Course',
        available: true,
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine with parmesan',
        price: 8.99,
        category: 'Appetizers',
        available: true,
      },
      {
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        price: 6.99,
        category: 'Desserts',
        available: true,
      },
    ],
  },
  sushiBar: {
    name: 'Tokyo Sushi Bar',
    cuisine: 'Japanese',
    openTime: '12:00',
    closeTime: '23:00',
    deliveryTime: '45-60 minutes',
    hasMenu: true,
    menu: [
      {
        name: 'California Roll',
        description: 'Crab, avocado, cucumber',
        price: 11.99,
        category: 'Sushi Rolls',
        available: true,
      },
      {
        name: 'Salmon Nigiri',
        description: 'Fresh salmon over rice',
        price: 13.99,
        category: 'Nigiri',
        available: true,
      },
      {
        name: 'Miso Soup',
        description: 'Traditional Japanese soup',
        price: 4.99,
        category: 'Appetizers',
        available: true,
      },
      {
        name: 'Green Tea Ice Cream',
        description: 'Matcha flavored ice cream',
        price: 5.99,
        category: 'Desserts',
        available: true,
      },
    ],
  },
  burgerJoint: {
    name: 'Burger Joint',
    cuisine: 'American',
    openTime: '10:00',
    closeTime: '23:00',
    deliveryTime: '20-30 minutes',
    hasMenu: true,
    menu: [
      {
        name: 'Classic Burger',
        description: 'Beef patty with all the fixings',
        price: 10.99,
        category: 'Burgers',
        available: true,
      },
      {
        name: 'Cheese Burger',
        description: 'With melted cheddar cheese',
        price: 11.99,
        category: 'Burgers',
        available: true,
      },
      {
        name: 'French Fries',
        description: 'Crispy golden fries',
        price: 4.99,
        category: 'Sides',
        available: true,
      },
      {
        name: 'Milkshake',
        description: 'Vanilla, chocolate, or strawberry',
        price: 5.99,
        category: 'Beverages',
        available: true,
      },
    ],
  },
  mexicanCantina: {
    name: 'Mexican Cantina',
    cuisine: 'Mexican',
    openTime: '11:00',
    closeTime: '22:00',
    deliveryTime: '30-40 minutes',
    hasMenu: true,
    menu: [
      {
        name: 'Chicken Tacos',
        description: 'Three soft tacos with chicken',
        price: 9.99,
        category: 'Tacos',
        available: true,
      },
      {
        name: 'Beef Burrito',
        description: 'Large burrito with seasoned beef',
        price: 11.99,
        category: 'Burritos',
        available: true,
      },
      {
        name: 'Guacamole & Chips',
        description: 'Fresh guacamole with tortilla chips',
        price: 6.99,
        category: 'Appetizers',
        available: true,
      },
      {
        name: 'Churros',
        description: 'Sweet fried dough with cinnamon',
        price: 5.99,
        category: 'Desserts',
        available: true,
      },
    ],
  },
};

/**
 * Get a test restaurant by key
 */
export function getTestRestaurant(key: keyof typeof testRestaurants) {
  return testRestaurants[key];
}

/**
 * Get all test restaurants
 */
export function getAllTestRestaurants() {
  return Object.values(testRestaurants);
}

/**
 * Get restaurant names only
 */
export function getTestRestaurantNames() {
  return Object.values(testRestaurants).map(r => r.name);
}
