import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.routes';
import prisma from '../../../config/database';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock data - use unique values to avoid conflicts
const timestamp = Date.now();
const testUser = {
  email: `test-${timestamp}@example.com`,
  password: 'TestPass123!',
  name: 'Test User',
  companyName: `Test Company ${timestamp}`,
  companyDomain: `test-${timestamp}.com`,
  companySlug: `test-slug-${timestamp}`,
};

describe('Authentication Controller', () => {
  let authToken: string;
  let userId: string;
  let companyId: string;

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prisma.user.deleteMany({
        where: { email: testUser.email },
      });
    }
    if (companyId) {
      await prisma.company.deleteMany({
        where: { slug: testUser.companySlug },
      });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and company', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      const { data } = response.body;
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user).toMatchObject({
        email: testUser.email.toLowerCase(),
        name: testUser.name,
        role: 'ADMIN',
      });
      expect(data.user.companyId).toBeDefined();

      authToken = data.token;
      userId = data.user.id;
      companyId = data.user.companyId;
    });

    it('should not register user with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('Email already exists'),
      });
    });

    it('should not register with duplicate company slug', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: `different-${Date.now()}@example.com`,
          // Same slug will cause conflict
        })
        .expect(400);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('Company slug already taken'),
      });
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: `new-${Date.now()}@example.com`,
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `new-${Date.now()}@example.com`,
          // Missing password, name, company info
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body).toMatchObject({ message: 'Invalid credentials' });
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toMatchObject({ message: 'Invalid credentials' });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          // Missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        email: testUser.email.toLowerCase(),
        name: testUser.name,
        role: 'ADMIN',
        companyId: expect.any(String),
      });
    });

    it('should not get user without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({ error: 'No token provided' });
    });

    it('should not get user with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({ error: 'Invalid or expired token' });
    });
  });
});
