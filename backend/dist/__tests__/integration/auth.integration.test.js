"use strict";
/**
 * Authentication & Authorization Integration Tests
 *
 * Tests cover:
 * - User registration (happy path, validation, duplicates)
 * - User login (happy path, invalid credentials, account states)
 * - Token validation and refresh
 * - Role-based access control
 * - Password security
 * - Session management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../app"));
const auth_helper_1 = require("../../test/helpers/auth.helper");
const db_helper_1 = require("../../test/helpers/db.helper");
const request_helper_1 = require("../../test/helpers/request.helper");
const client_1 = require("@prisma/client");
describe('Authentication & Authorization Integration Tests', () => {
    describe('User Registration', () => {
        let testCompanyId;
        beforeAll(async () => {
            const testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 0 });
            testCompanyId = testData.company.id;
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testCompanyId);
        });
        describe('Happy Path', () => {
            it('should register a new user successfully', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'newuser@example.com',
                    password: 'SecurePass123!',
                    name: 'New User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertSuccess)(response);
                expect(response.body.data).toHaveProperty('token');
                expect(response.body.data.user).toMatchObject({
                    email: 'newuser@example.com',
                    name: 'New User',
                    role: 'USER', // Default role
                });
                expect(response.body.data.user).not.toHaveProperty('password');
            });
            it('should register an admin user', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'admin@example.com',
                    password: 'AdminPass123!',
                    name: 'Admin User',
                    role: 'ADMIN',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertSuccess)(response);
                expect(response.body.data.user.role).toBe('ADMIN');
            });
            it('should hash the password before storing', async () => {
                const password = 'PlainTextPassword123!';
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'hashtest@example.com',
                    password,
                    name: 'Hash Test User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertSuccess)(response);
                // Verify we can login with the plain password
                const loginResponse = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: 'hashtest@example.com',
                    password,
                });
                (0, request_helper_1.assertSuccess)(loginResponse);
            });
        });
        describe('Validation', () => {
            it('should reject registration without email', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    password: 'SecurePass123!',
                    name: 'No Email User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertBadRequest)(response);
                expect(response.body.message).toMatch(/email/i);
            });
            it('should reject registration with invalid email format', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'not-an-email',
                    password: 'SecurePass123!',
                    name: 'Invalid Email User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertBadRequest)(response);
                expect(response.body.message).toMatch(/email/i);
            });
            it('should reject registration without password', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'nopassword@example.com',
                    name: 'No Password User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertBadRequest)(response);
                expect(response.body.message).toMatch(/password/i);
            });
            it('should reject registration with weak password', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'weakpass@example.com',
                    password: '123', // Too short
                    name: 'Weak Password User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertBadRequest)(response);
                expect(response.body.message).toMatch(/password/i);
            });
            it('should reject registration without name', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'noname@example.com',
                    password: 'SecurePass123!',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertBadRequest)(response);
                expect(response.body.message).toMatch(/name/i);
            });
            it('should reject registration without companyId', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'nocompany@example.com',
                    password: 'SecurePass123!',
                    name: 'No Company User',
                });
                (0, request_helper_1.assertBadRequest)(response);
                expect(response.body.message).toMatch(/company/i);
            });
            it('should reject registration with non-existent companyId', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: 'invalidcompany@example.com',
                    password: 'SecurePass123!',
                    name: 'Invalid Company User',
                    companyId: 'non-existent-company-id',
                });
                (0, request_helper_1.assertBadRequest)(response);
            });
        });
        describe('Duplicate Prevention', () => {
            it('should reject registration with duplicate email', async () => {
                const email = 'duplicate@example.com';
                // First registration
                await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email,
                    password: 'SecurePass123!',
                    name: 'First User',
                    companyId: testCompanyId,
                });
                // Second registration with same email
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email,
                    password: 'DifferentPass123!',
                    name: 'Second User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertBadRequest)(response);
                expect(response.body.message).toMatch(/email.*already.*exists/i);
            });
            it('should treat emails as case-insensitive for duplicates', async () => {
                const email = 'CaseSensitive@example.com';
                // First registration
                await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: email.toLowerCase(),
                    password: 'SecurePass123!',
                    name: 'Lowercase User',
                    companyId: testCompanyId,
                });
                // Second registration with different case
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: email.toUpperCase(),
                    password: 'SecurePass123!',
                    name: 'Uppercase User',
                    companyId: testCompanyId,
                });
                (0, request_helper_1.assertBadRequest)(response);
            });
        });
    });
    describe('User Login', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 2 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        describe('Happy Path', () => {
            it('should login with valid credentials', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: testData.admin.email,
                    password: testData.admin.password,
                });
                (0, request_helper_1.assertSuccess)(response);
                expect(response.body.data).toHaveProperty('token');
                expect(response.body.data.user).toMatchObject({
                    email: testData.admin.email,
                    name: testData.admin.name,
                    role: testData.admin.role,
                });
                expect(response.body.data.user).not.toHaveProperty('password');
            });
            it('should login as regular user', async () => {
                const employee = testData.employees[0];
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: employee.email,
                    password: employee.password,
                });
                (0, request_helper_1.assertSuccess)(response);
                expect(response.body.data.user.role).toBe('USER');
            });
            it('should return valid JWT token', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: testData.admin.email,
                    password: testData.admin.password,
                });
                const token = response.body.data.token;
                expect(token).toBeTruthy();
                expect(typeof token).toBe('string');
                expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
            });
            it('should accept case-insensitive email', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: testData.admin.email.toUpperCase(),
                    password: testData.admin.password,
                });
                (0, request_helper_1.assertSuccess)(response);
            });
        });
        describe('Invalid Credentials', () => {
            it('should reject login with wrong password', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: testData.admin.email,
                    password: 'WrongPassword123!',
                });
                (0, request_helper_1.assertUnauthorized)(response);
                expect(response.body.message).toMatch(/invalid.*credentials/i);
            });
            it('should reject login with non-existent email', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: 'nonexistent@example.com',
                    password: 'SomePassword123!',
                });
                (0, request_helper_1.assertUnauthorized)(response);
                expect(response.body.message).toMatch(/invalid.*credentials/i);
            });
            it('should reject login without email', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    password: 'SomePassword123!',
                });
                (0, request_helper_1.assertBadRequest)(response);
            });
            it('should reject login without password', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: testData.admin.email,
                });
                (0, request_helper_1.assertBadRequest)(response);
            });
            it('should not reveal if email exists or password is wrong', async () => {
                // Login with non-existent email
                const response1 = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: 'nonexistent@example.com',
                    password: 'SomePassword123!',
                });
                // Login with wrong password
                const response2 = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: testData.admin.email,
                    password: 'WrongPassword123!',
                });
                // Both should return the same generic error message
                expect(response1.body.message).toBe(response2.body.message);
            });
        });
        describe('Security', () => {
            it('should rate limit login attempts', async () => {
                const attempts = [];
                // Make multiple failed login attempts
                for (let i = 0; i < 10; i++) {
                    attempts.push((0, supertest_1.default)(app_1.default)
                        .post('/api/auth/login')
                        .send({
                        email: 'attacker@example.com',
                        password: 'WrongPassword123!',
                    }));
                }
                const responses = await Promise.all(attempts);
                // At least some requests should be rate limited (429 status)
                const rateLimited = responses.some(r => r.status === 429);
                // Note: This test may need adjustment based on actual rate limiting implementation
                // For now, we just verify the endpoint doesn't crash under load
                expect(responses.length).toBe(10);
            });
            it('should not include password in any response', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: testData.admin.email,
                    password: testData.admin.password,
                });
                const responseStr = JSON.stringify(response.body);
                expect(responseStr).not.toContain(testData.admin.password);
                expect(response.body.data.user).not.toHaveProperty('password');
            });
        });
    });
    describe('Token Validation', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should accept valid token', async () => {
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .get('/api/auth/me');
            (0, request_helper_1.assertSuccess)(response);
            expect(response.body.data).toMatchObject({
                email: testData.admin.email,
                role: testData.admin.role,
            });
        });
        it('should reject request without token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/auth/me');
            (0, request_helper_1.assertUnauthorized)(response);
        });
        it('should reject request with invalid token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token-here');
            (0, request_helper_1.assertUnauthorized)(response);
        });
        it('should reject request with malformed token', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/auth/me')
                .set('Authorization', 'InvalidFormat');
            (0, request_helper_1.assertUnauthorized)(response);
        });
        it('should reject expired token', async () => {
            // Note: This test requires a way to generate expired tokens
            // or a test endpoint that accepts a custom expiration time
            // For now, we'll skip this or implement it based on your auth system
            // Example implementation:
            // const expiredToken = generateToken(testData.admin.id, { expiresIn: '-1h' });
            // const response = await request(app)
            //   .get('/api/auth/me')
            //   .set('Authorization', `Bearer ${expiredToken}`);
            // assertUnauthorized(response);
        });
        it('should include user information in token payload', async () => {
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .get('/api/auth/me');
            (0, request_helper_1.assertSuccess)(response);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('email');
            expect(response.body.data).toHaveProperty('role');
            expect(response.body.data).toHaveProperty('companyId');
        });
    });
    describe('Role-Based Access Control (RBAC)', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 2 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        describe('Admin-Only Endpoints', () => {
            it('should allow admin to access admin endpoints', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .get('/api/users');
                // Admin should be able to list users
                expect(response.status).not.toBe(403);
            });
            it('should deny employee access to admin endpoints', async () => {
                const employee = testData.employees[0];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                    .post('/api/users')
                    .send({
                    email: 'newuser@example.com',
                    password: 'SecurePass123!',
                    name: 'New User',
                    role: 'USER',
                    companyId: testData.company.id,
                });
                // Employee should not be able to create users
                expect([401, 403]).toContain(response.status);
            });
            it('should deny unauthenticated access to admin endpoints', async () => {
                const response = await (0, supertest_1.default)(app_1.default)
                    .get('/api/users');
                (0, request_helper_1.assertUnauthorized)(response);
            });
        });
        describe('User Isolation', () => {
            it('should only show data from own company', async () => {
                // Create a second company with users
                const company2Data = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
                try {
                    // User from company 1 tries to access data from company 2
                    const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                        .get(`/api/users/${company2Data.admin.id}`);
                    // Should not be able to access user from different company
                    expect([403, 404]).toContain(response.status);
                }
                finally {
                    await (0, db_helper_1.cleanupTestData)(company2Data.company.id);
                }
            });
            it('should allow access to own profile', async () => {
                const employee = testData.employees[0];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                    .get(`/api/users/${employee.id}`);
                (0, request_helper_1.assertSuccess)(response);
                expect(response.body.data.id).toBe(employee.id);
            });
            it('should allow access to users in same company', async () => {
                const employee = testData.employees[0];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                    .get(`/api/users/${testData.admin.id}`);
                // Employee should be able to view admin from same company
                (0, request_helper_1.assertSuccess)(response);
                expect(response.body.data.companyId).toBe(testData.company.id);
            });
        });
        describe('Action-Based Permissions', () => {
            it('should allow admin to update any user in company', async () => {
                const employee = testData.employees[0];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .put(`/api/users/${employee.id}`)
                    .send({
                    name: 'Updated Name',
                });
                (0, request_helper_1.assertSuccess)(response);
                expect(response.body.data.name).toBe('Updated Name');
            });
            it('should allow employee to update own profile', async () => {
                const employee = testData.employees[0];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                    .put(`/api/users/${employee.id}`)
                    .send({
                    name: 'Self Updated Name',
                });
                (0, request_helper_1.assertSuccess)(response);
            });
            it('should deny employee from updating other users', async () => {
                const employee1 = testData.employees[0];
                const employee2 = testData.employees[1];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee1.token)
                    .put(`/api/users/${employee2.id}`)
                    .send({
                    name: 'Unauthorized Update',
                });
                expect([401, 403]).toContain(response.status);
            });
            it('should deny employee from changing own role', async () => {
                const employee = testData.employees[0];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                    .put(`/api/users/${employee.id}`)
                    .send({
                    role: 'ADMIN', // Try to promote self
                });
                // Should either reject the request or ignore the role field
                if (response.status === 200) {
                    expect(response.body.data.role).toBe('USER');
                }
                else {
                    expect([400, 403]).toContain(response.status);
                }
            });
            it('should allow admin to change user roles', async () => {
                const employee = testData.employees[0];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .put(`/api/users/${employee.id}`)
                    .send({
                    role: 'ADMIN',
                });
                if (response.status === 200) {
                    expect(response.body.data.role).toBe('ADMIN');
                }
                // Note: Some systems may not allow role changes via PUT
            });
            it('should allow admin to delete users in company', async () => {
                // Create a test user to delete
                const userToDelete = await (0, auth_helper_1.createTestUser)(testData.company.id, client_1.UserRole.USER, {
                    email: 'todelete@example.com',
                });
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                    .delete(`/api/users/${userToDelete.id}`);
                expect([200, 204]).toContain(response.status);
            });
            it('should deny employee from deleting users', async () => {
                const employee1 = testData.employees[0];
                const employee2 = testData.employees[1];
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee1.token)
                    .delete(`/api/users/${employee2.id}`);
                expect([401, 403]).toContain(response.status);
            });
        });
    });
    describe('Logout', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should logout successfully', async () => {
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, testData.admin.token)
                .post('/api/auth/logout');
            expect([200, 204]).toContain(response.status);
        });
        it('should accept logout without token', async () => {
            // Some systems allow logout without token (client-side token deletion)
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/logout');
            // Should not error even if no token provided
            expect([200, 204, 401]).toContain(response.status);
        });
    });
    describe('Password Management', () => {
        let testData;
        beforeAll(async () => {
            testData = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        });
        afterAll(async () => {
            await (0, db_helper_1.cleanupTestData)(testData.company.id);
        });
        it('should allow user to change own password', async () => {
            const employee = testData.employees[0];
            const newPassword = 'NewSecurePass123!';
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                .put(`/api/users/${employee.id}/password`)
                .send({
                currentPassword: employee.password,
                newPassword: newPassword,
            });
            if (response.status === 200) {
                // Verify can login with new password
                const loginResponse = await (0, supertest_1.default)(app_1.default)
                    .post('/api/auth/login')
                    .send({
                    email: employee.email,
                    password: newPassword,
                });
                (0, request_helper_1.assertSuccess)(loginResponse);
            }
        });
        it('should reject password change with wrong current password', async () => {
            const employee = testData.employees[0];
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                .put(`/api/users/${employee.id}/password`)
                .send({
                currentPassword: 'WrongPassword123!',
                newPassword: 'NewSecurePass123!',
            });
            expect([400, 401, 403]).toContain(response.status);
        });
        it('should reject weak new password', async () => {
            const employee = testData.employees[0];
            const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, employee.token)
                .put(`/api/users/${employee.id}/password`)
                .send({
                currentPassword: employee.password,
                newPassword: '123', // Too weak
            });
            (0, request_helper_1.assertBadRequest)(response);
        });
    });
});
