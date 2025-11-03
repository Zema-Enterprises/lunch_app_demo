"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMenuItem = exports.updateMenuItem = exports.createMenuItem = exports.getMenuItems = exports.deleteRestaurant = exports.updateRestaurant = exports.createRestaurant = exports.getRestaurant = exports.getRestaurants = void 0;
const database_1 = __importDefault(require("../../config/database"));
const sanitize_1 = require("../../utils/sanitize");
const getRestaurants = async (req, res) => {
    try {
        const restaurants = await database_1.default.restaurant.findMany({
            where: {
                companyId: req.user.companyId,
            },
            include: {
                menuItems: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json({ data: restaurants });
    }
    catch (error) {
        console.error('Get restaurants error:', error);
        return res.status(500).json({ message: 'Failed to fetch restaurants' });
    }
};
exports.getRestaurants = getRestaurants;
const getRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await database_1.default.restaurant.findFirst({
            where: {
                id,
                companyId: req.user.companyId,
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
    }
    catch (error) {
        console.error('Get restaurant error:', error);
        return res.status(500).json({ message: 'Failed to fetch restaurant' });
    }
};
exports.getRestaurant = getRestaurant;
const createRestaurant = async (req, res) => {
    try {
        const { name, cuisine, openTime, closeTime, deliveryTime, hasMenu, imageUrl } = req.body;
        // Sanitize text inputs to prevent XSS
        const restaurant = await database_1.default.restaurant.create({
            data: {
                name: (0, sanitize_1.sanitize)(name),
                cuisine: (0, sanitize_1.sanitize)(cuisine),
                openTime: (0, sanitize_1.sanitize)(openTime),
                closeTime: (0, sanitize_1.sanitize)(closeTime),
                deliveryTime: (0, sanitize_1.sanitize)(deliveryTime),
                hasMenu,
                imageUrl: imageUrl ? (0, sanitize_1.sanitize)(imageUrl) : null,
                companyId: req.user.companyId,
            },
        });
        return res.status(201).json({ data: restaurant });
    }
    catch (error) {
        console.error('Create restaurant error:', error);
        return res.status(500).json({ message: 'Failed to create restaurant' });
    }
};
exports.createRestaurant = createRestaurant;
const updateRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, cuisine, openTime, closeTime, deliveryTime, hasMenu, imageUrl } = req.body;
        // Verify restaurant belongs to user's company
        const existing = await database_1.default.restaurant.findFirst({
            where: {
                id,
                companyId: req.user.companyId,
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        // Sanitize text inputs
        const updateData = {};
        if (name !== undefined)
            updateData.name = (0, sanitize_1.sanitize)(name);
        if (cuisine !== undefined)
            updateData.cuisine = (0, sanitize_1.sanitize)(cuisine);
        if (openTime !== undefined)
            updateData.openTime = (0, sanitize_1.sanitize)(openTime);
        if (closeTime !== undefined)
            updateData.closeTime = (0, sanitize_1.sanitize)(closeTime);
        if (deliveryTime !== undefined)
            updateData.deliveryTime = (0, sanitize_1.sanitize)(deliveryTime);
        if (hasMenu !== undefined)
            updateData.hasMenu = hasMenu;
        if (imageUrl !== undefined)
            updateData.imageUrl = imageUrl ? (0, sanitize_1.sanitize)(imageUrl) : null;
        const restaurant = await database_1.default.restaurant.update({
            where: { id },
            data: updateData,
        });
        return res.json({ data: restaurant });
    }
    catch (error) {
        console.error('Update restaurant error:', error);
        return res.status(500).json({ message: 'Failed to update restaurant' });
    }
};
exports.updateRestaurant = updateRestaurant;
const deleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        // Verify restaurant belongs to user's company
        const existing = await database_1.default.restaurant.findFirst({
            where: {
                id,
                companyId: req.user.companyId,
            },
        });
        if (!existing) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        await database_1.default.restaurant.delete({
            where: { id },
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Delete restaurant error:', error);
        return res.status(500).json({ message: 'Failed to delete restaurant' });
    }
};
exports.deleteRestaurant = deleteRestaurant;
// Menu Items
const getMenuItems = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        // Verify restaurant belongs to user's company
        const restaurant = await database_1.default.restaurant.findFirst({
            where: {
                id: restaurantId,
                companyId: req.user.companyId,
            },
        });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        const menuItems = await database_1.default.menuItem.findMany({
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
    }
    catch (error) {
        console.error('Get menu items error:', error);
        return res.status(500).json({ message: 'Failed to fetch menu items' });
    }
};
exports.getMenuItems = getMenuItems;
const createMenuItem = async (req, res) => {
    try {
        const { id: restaurantId } = req.params;
        const { name, description, price, category, available } = req.body;
        // Verify restaurant belongs to user's company
        const restaurant = await database_1.default.restaurant.findFirst({
            where: {
                id: restaurantId,
                companyId: req.user.companyId,
            },
        });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        const menuItem = await database_1.default.menuItem.create({
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
    }
    catch (error) {
        console.error('Create menu item error:', error);
        return res.status(500).json({ message: 'Failed to create menu item' });
    }
};
exports.createMenuItem = createMenuItem;
const updateMenuItem = async (req, res) => {
    try {
        const { id: restaurantId, itemId } = req.params;
        // Verify menu item belongs to restaurant in user's company
        const menuItem = await database_1.default.menuItem.findFirst({
            where: {
                id: itemId,
                restaurantId,
                restaurant: {
                    companyId: req.user.companyId,
                },
            },
        });
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        const updated = await database_1.default.menuItem.update({
            where: { id: itemId },
            data: req.body,
        });
        return res.json({ data: updated });
    }
    catch (error) {
        console.error('Update menu item error:', error);
        return res.status(500).json({ message: 'Failed to update menu item' });
    }
};
exports.updateMenuItem = updateMenuItem;
const deleteMenuItem = async (req, res) => {
    try {
        const { id: restaurantId, itemId } = req.params;
        // Verify menu item belongs to restaurant in user's company
        const menuItem = await database_1.default.menuItem.findFirst({
            where: {
                id: itemId,
                restaurantId,
                restaurant: {
                    companyId: req.user.companyId,
                },
            },
        });
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        await database_1.default.menuItem.delete({
            where: { id: itemId },
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Delete menu item error:', error);
        return res.status(500).json({ message: 'Failed to delete menu item' });
    }
};
exports.deleteMenuItem = deleteMenuItem;
