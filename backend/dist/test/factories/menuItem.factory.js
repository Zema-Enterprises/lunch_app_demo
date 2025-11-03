"use strict";
/**
 * MenuItem factory for generating test menu item data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMenuItem = createMenuItem;
exports.createMenuItems = createMenuItems;
exports.buildMenuItemData = buildMenuItemData;
const database_1 = __importDefault(require("../../config/database"));
/**
 * Create a menu item with factory defaults
 */
async function createMenuItem(options) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const menuItem = await database_1.default.menuItem.create({
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
async function createMenuItems(restaurantId, count, baseData = {}) {
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
function buildMenuItemData(overrides = {}) {
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
