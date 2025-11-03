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
describe('Users Integration Tests', () => {
    let company1;
    let company1Admin;
    let company1User;
    let company2;
    let company2Admin;
    beforeEach(async () => {
        company1 = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 1 });
        company1Admin = company1.admin;
        company1User = company1.employees[0];
        company2 = await (0, auth_helper_1.setupCompanyWithUsers)({ employeeCount: 0 });
        company2Admin = company2.admin;
    });
    afterEach(async () => {
        await (0, db_helper_1.cleanupTestData)(company1.company.id);
        await (0, db_helper_1.cleanupTestData)(company2.company.id);
    });
    describe('User CRUD Operations', () => {
        describe('POST /api/users - Create User', () => {
            it('should allow admin to create a new user', async () => {
                const userData = {
                    email: 'newuser@test.com',
                    password: 'Password123!',
                    name: 'New User',
                    role: 'USER',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post('/api/users')
                    .send(userData)
                    .expect(201);
                expect(response.body.data).toHaveProperty('id');
                expect(response.body.data.email).toBe(userData.email.toLowerCase());
                expect(response.body.data.name).toBe(userData.name);
                expect(response.body.data.role).toBe(userData.role);
                expect(response.body.data.companyId).toBe(company1.company.id);
                expect(response.body.data).not.toHaveProperty('password');
            });
            it('should reject user creation by non-admin', async () => {
                const userData = {
                    email: 'newuser@test.com',
                    password: 'Password123!',
                    name: 'New User',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .post('/api/users')
                    .send(userData)
                    .expect(403);
            });
            it('should reject duplicate email', async () => {
                const userData = {
                    email: company1User.email,
                    password: 'Password123!',
                    name: 'Duplicate User',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post('/api/users')
                    .send(userData)
                    .expect(400);
                expect(response.body).toHaveProperty('message');
                expect(response.body.message).toContain('already exists');
            });
            it('should default role to USER if not specified', async () => {
                const userData = {
                    email: 'defaultrole@test.com',
                    password: 'Password123!',
                    name: 'Default Role User',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .post('/api/users')
                    .send(userData)
                    .expect(201);
                expect(response.body.data.role).toBe('USER');
            });
        });
        describe('GET /api/users - List Users', () => {
            it('should allow admin to list all company users', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/users')
                    .expect(200);
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBeGreaterThanOrEqual(2); // Admin + at least 1 employee
                expect(response.body.data[0]).toHaveProperty('id');
                expect(response.body.data[0]).toHaveProperty('email');
                expect(response.body.data[0]).toHaveProperty('name');
                expect(response.body.data[0]).toHaveProperty('role');
                expect(response.body.data[0]).not.toHaveProperty('password');
            });
            it('should reject list request by non-admin', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .get('/api/users')
                    .expect(403);
            });
            it('should only show users from same company', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/users')
                    .expect(200);
                const allFromSameCompany = response.body.data.every((user) => user.companyId === company1.company.id);
                expect(allFromSameCompany).toBe(true);
            });
        });
        describe('GET /api/users/:id - Get User', () => {
            it('should get user by ID from same company', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/users/${company1User.id}`)
                    .expect(200);
                expect(response.body.data.id).toBe(company1User.id);
                expect(response.body.data.email).toBe(company1User.email);
                expect(response.body.data).not.toHaveProperty('password');
            });
            it('should return 404 for non-existent user', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/users/non-existent-id')
                    .expect(404);
            });
            it('should return 403 for user from different company', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get(`/api/users/${company2Admin.id}`)
                    .expect(403);
            });
        });
        describe('PUT /api/users/:id - Update User', () => {
            it('should allow user to update their own profile', async () => {
                const updateData = {
                    name: 'Updated Name',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put(`/api/users/${company1User.id}`)
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.name).toBe(updateData.name);
                expect(response.body.data.id).toBe(company1User.id);
            });
            it('should allow admin to update other users', async () => {
                const updateData = {
                    name: 'Admin Updated Name',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .put(`/api/users/${company1User.id}`)
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.name).toBe(updateData.name);
            });
            it('should reject non-admin updating other users', async () => {
                const updateData = {
                    name: 'Unauthorized Update',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put(`/api/users/${company1Admin.id}`)
                    .send(updateData)
                    .expect(403);
            });
            it('should allow admin to change user role', async () => {
                const updateData = {
                    role: 'ADMIN',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .put(`/api/users/${company1User.id}`)
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.role).toBe('ADMIN');
            });
            it('should reject non-admin changing roles', async () => {
                const updateData = {
                    role: 'ADMIN',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put(`/api/users/${company1User.id}`)
                    .send(updateData)
                    .expect(403);
            });
            it('should return 404 for non-existent user', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .put('/api/users/non-existent-id')
                    .send({ name: 'Test' })
                    .expect(404);
            });
            it('should return 403 for user from different company', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .put(`/api/users/${company2Admin.id}`)
                    .send({ name: 'Test' })
                    .expect(403);
            });
        });
        describe('DELETE /api/users/:id - Delete User', () => {
            it('should allow admin to delete a user', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete(`/api/users/${company1User.id}`)
                    .expect(204);
                // Verify deletion
                const deleted = await database_1.default.user.findUnique({
                    where: { id: company1User.id },
                });
                expect(deleted).toBeNull();
            });
            it('should reject deletion by non-admin', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .delete(`/api/users/${company1Admin.id}`)
                    .expect(403);
            });
            it('should return 404 for non-existent user', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .delete('/api/users/non-existent-id')
                    .expect(404);
            });
            it('should return 403 for user from different company', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company2Admin.token)
                    .delete(`/api/users/${company1User.id}`)
                    .expect(403);
            });
        });
    });
    describe('Profile Management', () => {
        describe('PUT /api/users/profile - Update Profile', () => {
            it('should allow user to update their own profile', async () => {
                const updateData = {
                    name: 'Updated Profile Name',
                    email: 'newemail@test.com',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put('/api/users/profile')
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.name).toBe(updateData.name);
                expect(response.body.data.email).toBe(updateData.email);
            });
            it('should reject duplicate email', async () => {
                const updateData = {
                    name: 'Test',
                    email: company1Admin.email, // Already exists
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put('/api/users/profile')
                    .send(updateData)
                    .expect(400);
                expect(response.body).toHaveProperty('message');
            });
            it('should allow keeping same email', async () => {
                const updateData = {
                    name: 'Updated Name Only',
                    email: company1User.email, // Same email
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put('/api/users/profile')
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.name).toBe(updateData.name);
            });
        });
        describe('POST /api/users/change-password - Change Password', () => {
            it('should allow user to change their own password', async () => {
                const passwordData = {
                    currentPassword: company1User.password, // Use actual password from setup
                    newPassword: 'NewPassword456!',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .post('/api/users/change-password')
                    .send(passwordData)
                    .expect(200);
                expect(response.body).toHaveProperty('message');
                expect(response.body.message).toContain('successfully');
            });
            it('should reject incorrect current password', async () => {
                const passwordData = {
                    currentPassword: 'WrongPassword!',
                    newPassword: 'NewPassword456!',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .post('/api/users/change-password')
                    .send(passwordData)
                    .expect(400);
                expect(response.body).toHaveProperty('message');
                expect(response.body.message).toContain('incorrect');
            });
        });
        describe('PUT /api/users/:id/password - Admin Update Password', () => {
            it('should allow user to update their own password', async () => {
                const passwordData = {
                    currentPassword: company1User.password, // Use actual password from setup
                    newPassword: 'NewPassword456!',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put(`/api/users/${company1User.id}/password`)
                    .send(passwordData)
                    .expect(200);
                expect(response.body).toHaveProperty('message');
            });
            it('should reject updating another user\'s password', async () => {
                const passwordData = {
                    currentPassword: company1User.password, // Use actual password from setup
                    newPassword: 'NewPassword456!',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .put(`/api/users/${company1User.id}/password`)
                    .send(passwordData)
                    .expect(403);
            });
            it('should return 404 for non-existent user', async () => {
                const passwordData = {
                    currentPassword: company1User.password, // Use actual password from setup
                    newPassword: 'NewPassword456!',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put('/api/users/non-existent-id/password')
                    .send(passwordData)
                    .expect(404);
            });
        });
    });
    describe('Company Management', () => {
        describe('GET /api/users/company - Get Company', () => {
            it('should get company information', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/users/company')
                    .expect(200);
                expect(response.body.data.id).toBe(company1.company.id);
                expect(response.body.data).toHaveProperty('name');
                expect(response.body.data).toHaveProperty('domain');
                expect(response.body.data).toHaveProperty('slug');
            });
            it('should allow regular users to view company info', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .get('/api/users/company')
                    .expect(200);
                expect(response.body.data.id).toBe(company1.company.id);
            });
        });
        describe('PUT /api/users/company - Update Company', () => {
            it('should allow admin to update company', async () => {
                const updateData = {
                    name: 'Updated Company Name',
                    domain: 'updated.com',
                };
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .put('/api/users/company')
                    .send(updateData)
                    .expect(200);
                expect(response.body.data.name).toBe(updateData.name);
                expect(response.body.data.domain).toBe(updateData.domain);
            });
            it('should reject company update by non-admin', async () => {
                const updateData = {
                    name: 'Unauthorized Update',
                    domain: 'hacker.com',
                };
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .put('/api/users/company')
                    .send(updateData)
                    .expect(403);
            });
        });
        describe('GET /api/users/company/users - Get Company Users', () => {
            it('should allow admin to get company users', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/users/company/users')
                    .expect(200);
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBeGreaterThanOrEqual(2);
            });
            it('should reject request by non-admin', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .get('/api/users/company/users')
                    .expect(403);
            });
        });
        describe('GET /api/users/company/stats - Get Company Stats', () => {
            it('should allow admin to get company statistics', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/users/company/stats')
                    .expect(200);
                expect(response.body.data).toHaveProperty('totalUsers');
                expect(response.body.data).toHaveProperty('totalEvents');
                expect(response.body.data).toHaveProperty('totalOrders');
                expect(response.body.data).toHaveProperty('totalRestaurants');
                expect(typeof response.body.data.totalUsers).toBe('number');
            });
            it('should reject stats request by non-admin', async () => {
                await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .get('/api/users/company/stats')
                    .expect(403);
            });
        });
    });
    describe('User Statistics', () => {
        describe('GET /api/users/stats - Get User Stats', () => {
            it('should get user statistics', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1User.token)
                    .get('/api/users/stats')
                    .expect(200);
                expect(response.body.data).toHaveProperty('totalOrders');
                expect(response.body.data).toHaveProperty('thisWeekOrders');
                expect(response.body.data).toHaveProperty('totalSpent');
                expect(response.body.data).toHaveProperty('recentOrders');
                expect(Array.isArray(response.body.data.recentOrders)).toBe(true);
            });
            it('should allow admin to get their own stats', async () => {
                const response = await (0, request_helper_1.authenticatedRequest)(app_1.default, company1Admin.token)
                    .get('/api/users/stats')
                    .expect(200);
                expect(response.body.data).toHaveProperty('totalOrders');
            });
        });
    });
});
