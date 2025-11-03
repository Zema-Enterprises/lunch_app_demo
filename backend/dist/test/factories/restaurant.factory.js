"use strict";
/**
 * Restaurant factory for generating test restaurant data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRestaurant = createRestaurant;
exports.createRestaurantWithMenu = createRestaurantWithMenu;
exports.createRestaurants = createRestaurants;
exports.buildRestaurantData = buildRestaurantData;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Create a restaurant with factory defaults
 */
async function createRestaurant(data) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100);
    const restaurant = await database_1.default.restaurant.create({
        data: {
            name: data.name || `Test Restaurant ${timestamp}`,
            cuisine: data.cuisine || 'Italian',
            openTime: data.openTime || '09:00',
            closeTime: data.closeTime || '22:00',
            deliveryTime: data.deliveryTime || '30-45 minutes',
            hasMenu: data.hasMenu ?? true,
            imageUrl: data.imageUrl,
            companyId: data.companyId,
        },
    });
    return restaurant;
}
/**
 * Create restaurant with menu items
 */
async function createRestaurantWithMenu(restaurantData, menuItemsCount = 5) {
    const restaurant = await createRestaurant(restaurantData);
    const menuItems = [];
    const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages'];
    for (let i = 0; i < menuItemsCount; i++) {
        const menuItem = await database_1.default.menuItem.create({
            data: {
                name: `Menu Item ${i + 1}`,
                description: `Delicious item number ${i + 1}`,
                price: 10 + i * 2.5,
                category: categories[i % categories.length],
                available: true,
                restaurantId: restaurant.id,
            },
        });
        menuItems.push(menuItem);
    }
    return {
        ...restaurant,
        menuItems,
    };
}
/**
 * Create multiple restaurants
 */
async function createRestaurants(count, baseData) {
    const restaurants = [];
    const cuisines = ['Italian', 'Chinese', 'Mexican', 'Japanese', 'American'];
    for (let i = 0; i < count; i++) {
        const restaurant = await createRestaurant({
            ...baseData,
            name: `${baseData.name || 'Test Restaurant'} ${i + 1}`,
            cuisine: cuisines[i % cuisines.length],
        });
        restaurants.push(restaurant);
    }
    return restaurants;
}
/**
 * Build restaurant data without saving (for validation tests)
 */
function buildRestaurantData(overrides = {}) {
    const timestamp = Date.now();
    return {
        name: `Test Restaurant ${timestamp}`,
        cuisine: 'Italian',
        openTime: '09:00',
        closeTime: '22:00',
        deliveryTime: '30-45 minutes',
        hasMenu: true,
        ...overrides,
    };
}
