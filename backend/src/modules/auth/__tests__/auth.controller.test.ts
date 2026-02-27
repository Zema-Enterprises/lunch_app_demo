import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.routes';
import userRoutes from '../../users/users.routes';
import prisma from '../../../config/database';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const getRefreshCookie = (setCookie: string[] | string | undefined) => {
  if (!setCookie) {
    return undefined;
  }
  const candidates = Array.isArray(setCookie) ? setCookie : [setCookie];
  return candidates.find((cookie) => cookie.startsWith('refreshToken='));
};

const toRequestCookieHeader = (cookie: string) => cookie.split(';')[0];

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
  let refreshCookie: string;
  let latestAccessToken: string;
  const registeredEmails: string[] = [testUser.email];

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
    if (registeredEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: registeredEmails } },
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
      latestAccessToken = data.token;
      userId = data.user.id;
      companyId = data.user.companyId;
      registeredEmails.push(data.user.email);

      const refresh = getRefreshCookie(response.get('set-cookie'));
      expect(refresh).toBeDefined();
      expect(refresh).toContain('HttpOnly');
      expect(refresh).toContain('Path=/');
      refreshCookie = refresh!;
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

    it('should reject attempts to join existing company without invite', async () => {
      const newUserEmail = `member-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: newUserEmail,
          password: 'TestPass123!',
          name: 'Member User',
          companyId,
          role: 'ADMIN',
          companyName: 'Shadow Company',
          companyDomain: `shadow-${Date.now()}.com`,
          companySlug: `shadow-${Date.now()}`,
        })
        .expect(400);

      expect(response.body.message).toMatch(/invite/i);
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

      latestAccessToken = response.body.data.token;

      const refresh = getRefreshCookie(response.get('set-cookie'));
      expect(refresh).toBeDefined();
      refreshCookie = refresh!;
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

  describe('POST /api/auth/refresh', () => {
    it('should issue a new access token and rotate refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', toRequestCookieHeader(refreshCookie))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      const newToken = response.body.data.token;
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(latestAccessToken);
      latestAccessToken = newToken;

      const rotatedCookie = getRefreshCookie(response.get('set-cookie'));
      expect(rotatedCookie).toBeDefined();
      expect(rotatedCookie).not.toBe(refreshCookie);

      refreshCookie = rotatedCookie!;
    });

    it('should reject reused refresh tokens after rotation', async () => {
      const previousCookie = refreshCookie;

      const rotationResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', toRequestCookieHeader(previousCookie))
        .expect(200);

      const rotatedCookie = getRefreshCookie(rotationResponse.get('set-cookie'));
      expect(rotatedCookie).toBeDefined();
      refreshCookie = rotatedCookie!;
      latestAccessToken = rotationResponse.body.data.token;

      const reuseResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', toRequestCookieHeader(previousCookie))
        .expect(401);

      expect(reuseResponse.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/change-password', () => {
    it('should reject weak new passwords that fail complexity requirements', async () => {
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'weakpass',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toContain('password must');
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

      expect(response.body).toMatchObject({ message: 'No token provided' });
    });

    it('should not get user with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({ message: 'Invalid or expired token' });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke refresh token and clear cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${latestAccessToken}`)
        .set('Cookie', toRequestCookieHeader(refreshCookie))
        .expect(200);

      const clearedCookie = getRefreshCookie(response.get('set-cookie'));
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toContain('Max-Age=0');

      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', toRequestCookieHeader(refreshCookie))
        .expect(401);
    });
  });

  describe('Token lifecycle enforcement', () => {
    it('should reject requests when the user associated with the token no longer exists', async () => {
      await prisma.user.delete({
        where: { id: userId },
      });

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });
  });
});
