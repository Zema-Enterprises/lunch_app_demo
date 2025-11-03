"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("../../app"));
const database_1 = __importDefault(require("../../config/database"));
const auth_helper_1 = require("../../test/helpers/auth.helper");
const db_helper_1 = require("../../test/helpers/db.helper");
const request_helper_1 = require("../../test/helpers/request.helper");
const restaurant_factory_1 = require("../../test/factories/restaurant.factory");
const menuItem_factory_1 = require("../../test/factories/menuItem.factory");
describe('Restaurants Integration Tests', () => {
    let company1;
    let company1Admin;
    let company1User;
    let company2;
    let company2Admin;
    beforeEach(async () => {
        // Setup two companies with users
        company1 = await (0, auth_helper_1.setupCompanyWithUsers)({
            employeeCount: 1,
            companyName: `Test Company 1 ${Date.now()}`,
        });
        company1Admin = company1.admin;
        company1User = company1.employees[0];
        company2 = await (0, auth_helper_1.setupCompanyWithUsers)({
            employeeCount: 0,
            companyName: `Test Company 2 ${Date.now()}`,
        });
        company2Admin = company2.admin;
    });
    afterEach(async () => {
        await (0, db_helper_1.cleanupTestData)(company1.company.id);
        await (0, db_helper_1.cleanupTestData)(company2.company.id);
    });
    describe('Restaurant CRUD Operations', () => {
        describe('POST /api/restaurants - Create Restaurant', () => {
            it('should allow admin to create a restaurant', async () => {
                const restaurantData = {
                    name: 'Test Restaurant',
                    cuisine: 'Italian',
                    openTime: '09:00',
                    closeTime: '22:00',
                    deliveryTime: '30-45 min',
                    hasMenu: true,
                    imageUrl: 'https://example.com/image.jpg',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post('/api/restaurants')
                    .send(restaurantData)
                    .expect(201);
                expect(response.body.data).toHaveProperty('id');
                expect(response.body.data.name).toBe(restaurantData.name);
                expect(response.body.data.cuisine).toBe(restaurantData.cuisine);
                expect(response.body.data.companyId).toBe(company1.company.id);
            });
            it('should reject restaurant creation by non-admin user', async () => {
                const restaurantData = {
                    name: 'Test Restaurant',
                    cuisine: 'Italian',
                    openTime: '09:00',
                    closeTime: '22:00',
                    deliveryTime: '30-45 min',
                    hasMenu: true,
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .post('/api/restaurants')
                    .send(restaurantData)
                    .expect(403);
            });
            it('should validate required fields', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post('/api/restaurants')
                    .send({
                    name: 'Test Restaurant',
                    // Missing required fields
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
            it('should sanitize XSS in name field', async () => {
                const restaurantData = {
                    name: '<script>alert("xss")</script>Pizza Place',
                    cuisine: 'Italian',
                    openTime: '09:00',
                    closeTime: '22:00',
                    deliveryTime: '30-45 min',
                    hasMenu: true,
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post('/api/restaurants')
                    .send(restaurantData)
                    .expect(201);
                expect(response.body.data.name).not.toContain('<script>');
            });
        });
        describe('GET /api/restaurants - List Restaurants', () => {
            it('should get all restaurants for company', async () => {
                // Create test restaurants
                await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id, name: 'Restaurant 1' });
                await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id, name: 'Restaurant 2' });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/restaurants')
                    .expect(200);
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBe(2);
                expect(response.body.data[0]).toHaveProperty('name');
                expect(response.body.data[0]).toHaveProperty('menuItems');
            });
            it('should return empty array when no restaurants exist', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/restaurants')
                    .expect(200);
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBe(0);
            });
            it('should not show restaurants from other companies', async () => {
                // Create restaurant in company 2
                await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id, name: 'Company 2 Restaurant' });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/restaurants')
                    .expect(200);
                expect(response.body.data.length).toBe(0);
            });
        });
        describe('GET /api/restaurants/:id - Get Single Restaurant', () => {
            it('should get a single restaurant with menu items', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant.id, available: true });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant.id}`)
                    .expect(200);
                expect(response.body.data.id).toBe(restaurant.id);
                expect(response.body.data).toHaveProperty('menuItems');
                expect(Array.isArray(response.body.data.menuItems)).toBe(true);
            });
            it('should return 404 for non-existent restaurant', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/restaurants/non-existent-id')
                    .expect(404);
            });
            it('should return 404 for restaurant from different company', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant.id}`)
                    .expect(404);
            });
            it('should only show available menu items', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant.id, available: true });
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant.id, available: false });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant.id}`)
                    .expect(200);
                expect(response.body.data.menuItems.length).toBe(1);
                expect(response.body.data.menuItems[0].available).toBe(true);
            });
        });
        describe('PATCH /api/restaurants/:id - Update Restaurant', () => {
            it('should allow admin to update a restaurant', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                const updateData = {
                    name: 'Updated Restaurant Name',
                    cuisine: 'Mexican',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch(`/api/restaurants/${restaurant.id}`)
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.name).toBe(updateData.name);
                expect(response.body.data.cuisine).toBe(updateData.cuisine);
            });
            it('should reject update by non-admin user', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .patch(`/api/restaurants/${restaurant.id}`)
                    .send({ name: 'Updated Name' })
                    .expect(403);
            });
            it('should return 404 for non-existent restaurant', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch('/api/restaurants/non-existent-id')
                    .send({ name: 'Updated Name' })
                    .expect(404);
            });
            it('should return 404 when updating restaurant from different company', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch(`/api/restaurants/${restaurant.id}`)
                    .send({ name: 'Updated Name' })
                    .expect(404);
            });
            it('should sanitize XSS in updated fields', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch(`/api/restaurants/${restaurant.id}`)
                    .send({ name: '<script>alert("xss")</script>Updated Name' })
                    .expect(200);
                expect(response.body.data.name).not.toContain('<script>');
            });
        });
        describe('DELETE /api/restaurants/:id - Delete Restaurant', () => {
            it('should allow admin to delete a restaurant', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete(`/api/restaurants/${restaurant.id}`)
                    .expect(204);
                // Verify deletion
                const deleted = await database_1.default.restaurant.findUnique({
                    where: { id: restaurant.id },
                });
                expect(deleted).toBeNull();
            });
            it('should reject deletion by non-admin user', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .delete(`/api/restaurants/${restaurant.id}`)
                    .expect(403);
            });
            it('should return 404 for non-existent restaurant', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete('/api/restaurants/non-existent-id')
                    .expect(404);
            });
            it('should return 404 when deleting restaurant from different company', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete(`/api/restaurants/${restaurant.id}`)
                    .expect(404);
            });
            it('should cascade delete menu items', async () => {
                const restaurant = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete(`/api/restaurants/${restaurant.id}`)
                    .expect(204);
                // Verify menu items are deleted
                const deletedMenuItem = await database_1.default.menuItem.findUnique({
                    where: { id: menuItem.id },
                });
                expect(deletedMenuItem).toBeNull();
            });
        });
    });
    describe('Menu Item CRUD Operations', () => {
        let restaurant1;
        beforeEach(async () => {
            restaurant1 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
        });
        describe('GET /api/restaurants/:id/menu - Get Menu Items', () => {
            it('should get all available menu items for a restaurant', async () => {
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, category: 'Appetizers', available: true });
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, category: 'Main Course', available: true });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant1.id}/menu`)
                    .expect(200);
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBe(2);
                expect(response.body.data[0].available).toBe(true);
            });
            it('should return only available menu items', async () => {
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, available: true });
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, available: false });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant1.id}/menu`)
                    .expect(200);
                expect(response.body.data.length).toBe(1);
            });
            it('should return empty array when no menu items exist', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant1.id}/menu`)
                    .expect(200);
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBe(0);
            });
            it('should return 404 for restaurant from different company', async () => {
                const restaurant2 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant2.id}/menu`)
                    .expect(404);
            });
            it('should order menu items by category then name', async () => {
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, name: 'Pizza', category: 'Main' });
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, name: 'Salad', category: 'Appetizers' });
                await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, name: 'Pasta', category: 'Main' });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/restaurants/${restaurant1.id}/menu`)
                    .expect(200);
                expect(response.body.data[0].category).toBe('Appetizers');
                expect(response.body.data[1].name).toBe('Pasta');
                expect(response.body.data[2].name).toBe('Pizza');
            });
        });
        describe('POST /api/restaurants/:id/menu-items - Create Menu Item', () => {
            it('should allow admin to create a menu item', async () => {
                const menuItemData = {
                    name: 'Margherita Pizza',
                    description: 'Classic Italian pizza',
                    price: 12.99,
                    category: 'Main Course',
                    available: true,
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post(`/api/restaurants/${restaurant1.id}/menu-items`)
                    .send(menuItemData)
                    .expect(201);
                expect(response.body.data).toHaveProperty('id');
                expect(response.body.data.name).toBe(menuItemData.name);
                expect(response.body.data.price).toBe(menuItemData.price);
                expect(response.body.data.restaurantId).toBe(restaurant1.id);
            });
            it('should default available to true if not provided', async () => {
                const menuItemData = {
                    name: 'Margherita Pizza',
                    price: 12.99,
                    category: 'Main Course',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post(`/api/restaurants/${restaurant1.id}/menu-items`)
                    .send(menuItemData)
                    .expect(201);
                expect(response.body.data.available).toBe(true);
            });
            it('should reject creation by non-admin user', async () => {
                const menuItemData = {
                    name: 'Margherita Pizza',
                    price: 12.99,
                    category: 'Main Course',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .post(`/api/restaurants/${restaurant1.id}/menu-items`)
                    .send(menuItemData)
                    .expect(403);
            });
            it('should return 404 for restaurant from different company', async () => {
                const restaurant2 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
                const menuItemData = {
                    name: 'Margherita Pizza',
                    price: 12.99,
                    category: 'Main Course',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post(`/api/restaurants/${restaurant2.id}/menu-items`)
                    .send(menuItemData)
                    .expect(404);
            });
            it('should validate required fields', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post(`/api/restaurants/${restaurant1.id}/menu-items`)
                    .send({
                    name: 'Margherita Pizza',
                    // Missing price and category
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
            it('should reject negative price', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post(`/api/restaurants/${restaurant1.id}/menu-items`)
                    .send({
                    name: 'Margherita Pizza',
                    price: -5.99,
                    category: 'Main Course',
                })
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
        });
        describe('PATCH /api/restaurants/:id/menu-items/:itemId - Update Menu Item', () => {
            it('should allow admin to update a menu item', async () => {
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id });
                const updateData = {
                    name: 'Updated Pizza',
                    price: 15.99,
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch(`/api/restaurants/${restaurant1.id}/menu-items/${menuItem.id}`)
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.name).toBe(updateData.name);
                expect(response.body.data.price).toBe(updateData.price);
            });
            it('should reject update by non-admin user', async () => {
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .patch(`/api/restaurants/${restaurant1.id}/menu-items/${menuItem.id}`)
                    .send({ name: 'Updated Name' })
                    .expect(403);
            });
            it('should return 404 for non-existent menu item', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch(`/api/restaurants/${restaurant1.id}/menu-items/non-existent-id`)
                    .send({ name: 'Updated Name' })
                    .expect(404);
            });
            it('should return 404 for menu item from different company', async () => {
                const restaurant2 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant2.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch(`/api/restaurants/${restaurant2.id}/menu-items/${menuItem.id}`)
                    .send({ name: 'Updated Name' })
                    .expect(404);
            });
            it('should allow marking item as unavailable', async () => {
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, available: true });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .patch(`/api/restaurants/${restaurant1.id}/menu-items/${menuItem.id}`)
                    .send({ available: false })
                    .expect(200);
                expect(response.body.data.available).toBe(false);
            });
        });
        describe('DELETE /api/restaurants/:id/menu-items/:itemId - Delete Menu Item', () => {
            it('should allow admin to delete a menu item', async () => {
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete(`/api/restaurants/${restaurant1.id}/menu-items/${menuItem.id}`)
                    .expect(204);
                // Verify deletion
                const deleted = await database_1.default.menuItem.findUnique({
                    where: { id: menuItem.id },
                });
                expect(deleted).toBeNull();
            });
            it('should reject deletion by non-admin user', async () => {
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .delete(`/api/restaurants/${restaurant1.id}/menu-items/${menuItem.id}`)
                    .expect(403);
            });
            it('should return 404 for non-existent menu item', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete(`/api/restaurants/${restaurant1.id}/menu-items/non-existent-id`)
                    .expect(404);
            });
            it('should return 404 for menu item from different company', async () => {
                const restaurant2 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
                const menuItem = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant2.id });
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete(`/api/restaurants/${restaurant2.id}/menu-items/${menuItem.id}`)
                    .expect(404);
            });
        });
    });
    describe('Company Isolation', () => {
        it('should isolate restaurants between companies', async () => {
            // Create restaurants in both companies
            await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id, name: 'Company 1 Restaurant' });
            await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id, name: 'Company 2 Restaurant' });
            // Company 1 should only see their restaurant
            const response1 = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                .get('/api/restaurants')
                .expect(200);
            expect(response1.body.data.length).toBe(1);
            expect(response1.body.data[0].name).toBe('Company 1 Restaurant');
            // Company 2 should only see their restaurant
            const response2 = await (0, request_helper_1.authenticatedRequest)(app_1.default, company2Admin.token)
                .get('/api/restaurants')
                .expect(200);
            expect(response2.body.data.length).toBe(1);
            expect(response2.body.data[0].name).toBe('Company 2 Restaurant');
        });
        it('should isolate menu items between companies', async () => {
            const restaurant1 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company1.company.id });
            const restaurant2 = await (0, restaurant_factory_1.createRestaurant)({ companyId: company2.company.id });
            const menuItem1 = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant1.id, name: 'Pizza 1' });
            const menuItem2 = await (0, menuItem_factory_1.createMenuItem)({ restaurantId: restaurant2.id, name: 'Pizza 2' });
            // Company 1 admin cannot access company 2's menu item
            await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                .patch(`/api/restaurants/${restaurant2.id}/menu-items/${menuItem2.id}`)
                .send({ name: 'Updated Pizza' })
                .expect(404);
            // Company 2 admin cannot access company 1's menu item
            await (0, request_helper_1.authenticatedRequest)(app_1.default, company2Admin.token)
                .patch(`/api/restaurants/${restaurant1.id}/menu-items/${menuItem1.id}`)
                .send({ name: 'Updated Pizza' })
                .expect(404);
        });
    });
});
