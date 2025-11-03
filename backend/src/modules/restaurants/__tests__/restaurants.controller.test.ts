import request from 'supertest';
import express from 'express';
import restaurantRoutes from '../restaurants.routes';
import prisma from '../../../config/database';
import { generateToken } from '../../../utils/jwt';
import { authMiddleware } from '../../../middleware/auth';

// Create test app
const app = express();
app.use(express.json());
// Add auth middleware to test app
app.use(authMiddleware);
app.use('/api/restaurants', restaurantRoutes);

describe('Restaurants Controller', () => {
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;
  let testRestaurantId: string;

  // Setup: Create test company and user
  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: `Test Restaurant Company ${Date.now()}`,
        domain: 'testrestaurant.com',
        slug: `test-restaurant-slug-${Date.now()}`,
      },
    });
    testCompanyId = company.id;

    // Create test user
    const user = await prisma.user.create({
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
    authToken = generateToken({
      userId: user.id,
      email: user.email,
      companyId: testCompanyId,
      role: user.role,
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Delete in correct order due to foreign keys
    await prisma.menuItem.deleteMany({
      where: { restaurant: { companyId: testCompanyId } },
    });
    await prisma.restaurant.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.user.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.company.deleteMany({
      where: { id: testCompanyId },
    });
    await prisma.$disconnect();
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

      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
        .post('/api/restaurants')
        .send({
          name: 'Unauthorized Restaurant',
          cuisine: 'Mexican',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
        .get('/api/restaurants')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      // All restaurants should belong to test company
      response.body.forEach((restaurant: any) => {
        expect(restaurant.companyId).toBe(testCompanyId);
      });
    });

    it('should not get restaurants without authentication', async () => {
      const response = await request(app)
        .get('/api/restaurants')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/restaurants/:id', () => {
    it('should get a specific restaurant', async () => {
      const response = await request(app)
        .get(`/api/restaurants/${testRestaurantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testRestaurantId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('cuisine');
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app)
        .get('/api/restaurants/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/restaurants/:id/menu', () => {
    let menuItemId: string;
    let menuTestRestaurantId: string;

    beforeAll(async () => {
      // Create a restaurant specifically for menu tests
      const restaurant = await prisma.restaurant.create({
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
      const menuItem = await prisma.menuItem.create({
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
        await prisma.menuItem.deleteMany({
          where: { restaurantId: menuTestRestaurantId },
        });
        await prisma.restaurant.delete({
          where: { id: menuTestRestaurantId },
        });
      }
    });

    it('should get menu items for a restaurant', async () => {
      const response = await request(app)
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
      const emptyRestaurant = await prisma.restaurant.create({
        data: {
          name: 'Empty Restaurant',
          cuisine: 'None',
          openTime: '09:00',
          closeTime: '17:00',
          deliveryTime: '30 min',
          companyId: testCompanyId,
        },
      });

      const response = await request(app)
        .get(`/api/restaurants/${emptyRestaurant.id}/menu`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);

      // Cleanup
      await prisma.restaurant.delete({ where: { id: emptyRestaurant.id } });
    });

    it('should not get menu from another company', async () => {
      // Create another company and restaurant
      const otherCompany = await prisma.company.create({
        data: {
          name: `Other Company ${Date.now()}`,
          domain: 'other.com',
          slug: `other-slug-${Date.now()}`,
        },
      });

      const otherRestaurant = await prisma.restaurant.create({
        data: {
          name: 'Other Restaurant',
          cuisine: 'Other',
          openTime: '09:00',
          closeTime: '17:00',
          deliveryTime: '30 min',
          companyId: otherCompany.id,
        },
      });

      const response = await request(app)
        .get(`/api/restaurants/${otherRestaurant.id}/menu`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');

      // Cleanup
      await prisma.restaurant.delete({ where: { id: otherRestaurant.id } });
      await prisma.company.delete({ where: { id: otherCompany.id } });
    });
  });

  describe('PATCH /api/restaurants/:id', () => {
    it('should update a restaurant', async () => {
      // Create a restaurant to update
      const restaurant = await prisma.restaurant.create({
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

      const response = await request(app)
        .patch(`/api/restaurants/${restaurant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.cuisine).toBe(updateData.cuisine);

      // Cleanup
      await prisma.restaurant.delete({ where: { id: restaurant.id } });
    });

    it('should sanitize XSS in update', async () => {
      // Create a restaurant to update
      const restaurant = await prisma.restaurant.create({
        data: {
          name: 'XSS Test Restaurant',
          cuisine: 'American',
          openTime: '09:00',
          closeTime: '21:00',
          deliveryTime: '25 min',
          companyId: testCompanyId,
        },
      });

      const response = await request(app)
        .patch(`/api/restaurants/${restaurant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '<img src=x onerror=alert(1)>Safe Name',
        })
        .expect(200);

      expect(response.body.name).not.toContain('<img');
      expect(response.body.name).not.toContain('onerror');

      // Cleanup
      await prisma.restaurant.delete({ where: { id: restaurant.id } });
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app)
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
      const restaurantToDelete = await prisma.restaurant.create({
        data: {
          name: 'Restaurant To Delete',
          cuisine: 'Test',
          openTime: '09:00',
          closeTime: '17:00',
          deliveryTime: '30 min',
          companyId: testCompanyId,
        },
      });

      const response = await request(app)
        .delete(`/api/restaurants/${restaurantToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      const deleted = await prisma.restaurant.findUnique({
        where: { id: restaurantToDelete.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app)
        .delete('/api/restaurants/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
