"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const restaurants_routes_1 = __importDefault(require("../restaurants.routes"));
const database_1 = __importDefault(require("../../../config/database"));
const jwt_1 = require("../../../utils/jwt");
const auth_1 = require("../../../middleware/auth");
// Create test app
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Add auth middleware to test app
app.use(auth_1.authMiddleware);
app.use('/api/restaurants', restaurants_routes_1.default);
describe('Restaurants Controller', () => {
    let authToken;
    let testCompanyId;
    let testUserId;
    let testRestaurantId;
    // Setup: Create test company and user
    beforeAll(async () => {
        // Create test company
        const company = await database_1.default.company.create({
            data: {
                name: `Test Restaurant Company ${Date.now()}`,
                domain: 'testrestaurant.com',
                slug: `test-restaurant-slug-${Date.now()}`,
            },
        });
        testCompanyId = company.id;
        // Create test user
        const user = await database_1.default.user.create({
            data: {
                email: `restaurant-test-${Date.now()}@example.com`,
                password: 'hashedpassword',
                name: 'Restaurant Test User',
                role: 'ADMIN',
                companyId: testCompanyId,
            },
        });
        testUserId = user.id;
        // Generate auth token
        authToken = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            companyId: testCompanyId,
            role: user.role,
        });
    });
    // Cleanup after all tests
    afterAll(async () => {
        // Delete in correct order due to foreign keys
        await database_1.default.menuItem.deleteMany({
            where: { restaurant: { companyId: testCompanyId } },
        });
        await database_1.default.restaurant.deleteMany({
            where: { companyId: testCompanyId },
        });
        await database_1.default.user.deleteMany({
            where: { companyId: testCompanyId },
        });
        await database_1.default.company.deleteMany({
            where: { id: testCompanyId },
        });
        await database_1.default.$disconnect();
    });
    describe('POST /api/restaurants', () => {
        it('should create a new restaurant', async () => {
            const restaurantData = {
                name: 'Test Pizza Place',
                cuisine: 'Italian',
                openTime: '11:00',
                closeTime: '22:00',
                deliveryTime: '30-45 min',
                hasMenu: false,
                imageUrl: 'https://example.com/pizza.jpg',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .send(restaurantData)
                .expect(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(restaurantData.name);
            expect(response.body.cuisine).toBe(restaurantData.cuisine);
            expect(response.body.companyId).toBe(testCompanyId);
            testRestaurantId = response.body.id;
        });
        it('should sanitize XSS in restaurant name', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: '<script>alert("XSS")</script>Clean Restaurant',
                cuisine: 'American',
                openTime: '10:00',
                closeTime: '21:00',
                deliveryTime: '20 min',
                hasMenu: false,
            })
                .expect(201);
            expect(response.body.name).not.toContain('<script>');
            expect(response.body.name).toContain('Clean Restaurant');
        });
        it('should not create restaurant without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/restaurants')
                .send({
                name: 'Unauthorized Restaurant',
                cuisine: 'Mexican',
            })
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                // Missing name
                cuisine: 'Chinese',
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should enforce max length validation', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'A'.repeat(150), // Exceeds max length
                cuisine: 'Japanese',
                openTime: '10:00',
                closeTime: '22:00',
                deliveryTime: '30 min',
                hasMenu: false,
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/restaurants', () => {
        it('should get all restaurants for company', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/restaurants')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            // All restaurants should belong to test company
            response.body.forEach((restaurant) => {
                expect(restaurant.companyId).toBe(testCompanyId);
            });
        });
        it('should not get restaurants without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/restaurants')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/restaurants/:id', () => {
        it('should get a specific restaurant', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/restaurants/${testRestaurantId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.id).toBe(testRestaurantId);
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('cuisine');
        });
        it('should return 404 for non-existent restaurant', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/restaurants/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/restaurants/:id/menu', () => {
        let menuItemId;
        let menuTestRestaurantId;
        beforeAll(async () => {
            // Create a restaurant specifically for menu tests
            const restaurant = await database_1.default.restaurant.create({
                data: {
                    name: 'Menu Test Restaurant',
                    cuisine: 'Italian',
                    openTime: '10:00',
                    closeTime: '22:00',
                    deliveryTime: '30 min',
                    companyId: testCompanyId,
                },
            });
            menuTestRestaurantId = restaurant.id;
            // Create a menu item for testing
            const menuItem = await database_1.default.menuItem.create({
                data: {
                    name: 'Test Pizza',
                    description: 'Delicious test pizza',
                    price: 12.99,
                    category: 'Main',
                    restaurantId: menuTestRestaurantId,
                },
            });
            menuItemId = menuItem.id;
        });
        afterAll(async () => {
            // Cleanup menu test restaurant
            if (menuTestRestaurantId) {
                await database_1.default.menuItem.deleteMany({
                    where: { restaurantId: menuTestRestaurantId },
                });
                await database_1.default.restaurant.delete({
                    where: { id: menuTestRestaurantId },
                });
            }
        });
        it('should get menu items for a restaurant', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/restaurants/${menuTestRestaurantId}/menu`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('price');
            expect(response.body[0].restaurantId).toBe(menuTestRestaurantId);
        });
        it('should return empty array for restaurant with no menu', async () => {
            // Create restaurant without menu
            const emptyRestaurant = await database_1.default.restaurant.create({
                data: {
                    name: 'Empty Restaurant',
                    cuisine: 'None',
                    openTime: '09:00',
                    closeTime: '17:00',
                    deliveryTime: '30 min',
                    companyId: testCompanyId,
                },
            });
            const response = await (0, supertest_1.default)(app)
                .get(`/api/restaurants/${emptyRestaurant.id}/menu`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
            // Cleanup
            await database_1.default.restaurant.delete({ where: { id: emptyRestaurant.id } });
        });
        it('should not get menu from another company', async () => {
            // Create another company and restaurant
            const otherCompany = await database_1.default.company.create({
                data: {
                    name: `Other Company ${Date.now()}`,
                    domain: 'other.com',
                    slug: `other-slug-${Date.now()}`,
                },
            });
            const otherRestaurant = await database_1.default.restaurant.create({
                data: {
                    name: 'Other Restaurant',
                    cuisine: 'Other',
                    openTime: '09:00',
                    closeTime: '17:00',
                    deliveryTime: '30 min',
                    companyId: otherCompany.id,
                },
            });
            const response = await (0, supertest_1.default)(app)
                .get(`/api/restaurants/${otherRestaurant.id}/menu`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
            expect(response.body).toHaveProperty('error');
            // Cleanup
            await database_1.default.restaurant.delete({ where: { id: otherRestaurant.id } });
            await database_1.default.company.delete({ where: { id: otherCompany.id } });
        });
    });
    describe('PATCH /api/restaurants/:id', () => {
        it('should update a restaurant', async () => {
            // Create a restaurant to update
            const restaurant = await database_1.default.restaurant.create({
                data: {
                    name: 'Update Test Restaurant',
                    cuisine: 'American',
                    openTime: '09:00',
                    closeTime: '21:00',
                    deliveryTime: '25 min',
                    companyId: testCompanyId,
                },
            });
            const updateData = {
                name: 'Updated Test Restaurant',
                cuisine: 'Fusion',
            };
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/restaurants/${restaurant.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);
            expect(response.body.name).toBe(updateData.name);
            expect(response.body.cuisine).toBe(updateData.cuisine);
            // Cleanup
            await database_1.default.restaurant.delete({ where: { id: restaurant.id } });
        });
        it('should sanitize XSS in update', async () => {
            // Create a restaurant to update
            const restaurant = await database_1.default.restaurant.create({
                data: {
                    name: 'XSS Test Restaurant',
                    cuisine: 'American',
                    openTime: '09:00',
                    closeTime: '21:00',
                    deliveryTime: '25 min',
                    companyId: testCompanyId,
                },
            });
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/restaurants/${restaurant.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: '<img src=x onerror=alert(1)>Safe Name',
            })
                .expect(200);
            expect(response.body.name).not.toContain('<img');
            expect(response.body.name).not.toContain('onerror');
            // Cleanup
            await database_1.default.restaurant.delete({ where: { id: restaurant.id } });
        });
        it('should return 404 for non-existent restaurant', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/restaurants/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Update' })
                .expect(404);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('DELETE /api/restaurants/:id', () => {
        it('should delete a restaurant', async () => {
            // Create a restaurant to delete
            const restaurantToDelete = await database_1.default.restaurant.create({
                data: {
                    name: 'Restaurant To Delete',
                    cuisine: 'Test',
                    openTime: '09:00',
                    closeTime: '17:00',
                    deliveryTime: '30 min',
                    companyId: testCompanyId,
                },
            });
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/restaurants/${restaurantToDelete.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(204);
            // Verify it's deleted
            const deleted = await database_1.default.restaurant.findUnique({
                where: { id: restaurantToDelete.id },
            });
            expect(deleted).toBeNull();
        });
        it('should return 404 for non-existent restaurant', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete('/api/restaurants/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
            expect(response.body).toHaveProperty('error');
        });
    });
});
