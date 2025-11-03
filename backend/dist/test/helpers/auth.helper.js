"use strict";
/**
 * Authentication helper utilities for tests
 * Provides functions for creating test users and tokens
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCompanyWithUsers = setupCompanyWithUsers;
exports.loginAsUser = loginAsUser;
exports.createTestUser = createTestUser;
exports.isTokenValid = isTokenValid;
const database_1 = __importDefault(require("../../config/database"));
const bcrypt_1 = require("../../utils/bcrypt");
const jwt_1 = require("../../utils/jwt");
/**
 * Create a test company with admin and optional employees
 */
async function setupCompanyWithUsers(options = {}) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const companyName = options.companyName || `Test Company ${timestamp}-${random}`;
    const companySlug = `test-${timestamp}-${random}`;
    const companyDomain = `test-${timestamp}-${random}.com`;
    // Create company
    const company = await database_1.default.company.create({
        data: {
            name: companyName,
            domain: companyDomain,
            slug: companySlug,
        },
    });
    // Create admin user
    const adminPassword = 'TestAdmin123!';
    const hashedAdminPassword = await (0, bcrypt_1.hashPassword)(adminPassword);
    const admin = await database_1.default.user.create({
        data: {
            email: `admin-${timestamp}-${random}@${companyDomain}`,
            password: hashedAdminPassword,
            name: 'Test Admin',
            role: 'ADMIN',
            companyId: company.id,
        },
    });
    const adminToken = (0, jwt_1.generateToken)({
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        companyId: company.id,
    });
    const result = {
        company: {
            id: company.id,
            name: company.name,
            domain: company.domain,
            slug: company.slug,
        },
        companyId: company.id,
        admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            companyId: company.id,
            token: adminToken,
            password: adminPassword,
        },
    };
    // Create employee users if requested
    if (options.employeeCount && options.employeeCount > 0) {
        result.employees = [];
        for (let i = 0; i < options.employeeCount; i++) {
            const employeePassword = `TestUser${i}123!`;
            const hashedPassword = await (0, bcrypt_1.hashPassword)(employeePassword);
            const employee = await database_1.default.user.create({
                data: {
                    email: `user${i}-${timestamp}-${random}@${companyDomain}`,
                    password: hashedPassword,
                    name: `Test User ${i}`,
                    role: 'USER',
                    companyId: company.id,
                },
            });
            const employeeToken = (0, jwt_1.generateToken)({
                userId: employee.id,
                email: employee.email,
                role: employee.role,
                companyId: company.id,
            });
            result.employees.push({
                id: employee.id,
                email: employee.email,
                name: employee.name,
                role: employee.role,
                companyId: company.id,
                token: employeeToken,
                password: employeePassword,
            });
        }
    }
    return result;
}
/**
 * Login as a test user and get token
 */
async function loginAsUser(email, password) {
    const user = await database_1.default.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new Error(`User not found: ${email}`);
    }
    return (0, jwt_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
    });
}
/**
 * Create a standalone test user (without company setup)
 */
async function createTestUser(companyId, role = 'USER', customData = {}) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const email = customData.email || `user-${timestamp}-${random}@test.com`;
    const name = customData.name || `Test User ${timestamp}`;
    const password = 'TestPass123!';
    const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
    const user = await database_1.default.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role,
            companyId,
        },
    });
    const token = (0, jwt_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
    });
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        token,
        password,
    };
}
/**
 * Verify a token is valid
 */
function isTokenValid(token) {
    try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        return true;
    }
    catch {
        return false;
    }
}
