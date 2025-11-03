"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("../auth.routes"));
const database_1 = __importDefault(require("../../../config/database"));
// Create test app
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
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
    let authToken;
    let userId;
    let companyId;
    // Cleanup after all tests
    afterAll(async () => {
        // Clean up test data
        if (userId) {
            await database_1.default.user.deleteMany({
                where: { email: testUser.email },
            });
        }
        if (companyId) {
            await database_1.default.company.deleteMany({
                where: { slug: testUser.companySlug },
            });
        }
        await database_1.default.$disconnect();
    });
    describe('POST /api/auth/register', () => {
        it('should register a new user and company', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('company');
            expect(response.body.user.email).toBe(testUser.email);
            expect(response.body.user.name).toBe(testUser.name);
            expect(response.body.user.role).toBe('ADMIN');
            expect(response.body.company.name).toBe(testUser.companyName);
            expect(response.body.company.slug).toBe(testUser.companySlug);
            // Save for cleanup and other tests
            authToken = response.body.token;
            userId = response.body.user.id;
            companyId = response.body.company.id;
        });
        it('should not register user with duplicate email', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('User already exists');
        });
        it('should not register with duplicate company slug', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                ...testUser,
                email: `different-${Date.now()}@example.com`,
                // Same slug will cause conflict
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Company slug already taken');
        });
        it('should validate email format', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                ...testUser,
                email: 'invalid-email',
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate password length', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                ...testUser,
                email: `new-${Date.now()}@example.com`,
                password: '123', // Too short
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: `new-${Date.now()}@example.com`,
                // Missing password, name, company info
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: testUser.password,
            })
                .expect(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe(testUser.email);
        });
        it('should not login with invalid email', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: testUser.password,
            })
                .expect(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid credentials');
        });
        it('should not login with invalid password', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: 'WrongPassword123!',
            })
                .expect(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid credentials');
        });
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                // Missing password
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/auth/me', () => {
        it('should get current user with valid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('company');
            expect(response.body.user.id).toBeDefined();
            expect(response.body.user.email).toBe(testUser.email);
            expect(response.body.user.name).toBe(testUser.name);
            expect(response.body.company.id).toBeDefined();
        });
        it('should not get user without token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should not get user with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
    });
});
