"use strict";
/**
 * User factory for generating test user data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.createUsers = createUsers;
exports.createAdmin = createAdmin;
exports.createEmployee = createEmployee;
exports.buildUserData = buildUserData;
const database_1 = __importDefault(require("../../config/database"));
const bcrypt_1 = require("../../utils/bcrypt");
/**
 * Create a user with factory defaults
 */
async function createUser(data) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const email = data.email || `user-${timestamp}-${random}@test.com`;
    const name = data.name || `Test User ${timestamp}`;
    const password = data.password || 'TestPass123!';
    const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
    const user = await database_1.default.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
            role: data.role || 'USER',
            companyId: data.companyId,
        },
    });
    return {
        ...user,
        plainPassword: password, // Keep plain password for testing
    };
}
/**
 * Create multiple users
 */
async function createUsers(count, baseData) {
    const users = [];
    for (let i = 0; i < count; i++) {
        const user = await createUser({
            ...baseData,
            name: `${baseData.name || 'Test User'} ${i + 1}`,
            email: undefined, // Let factory generate unique email
        });
        users.push(user);
    }
    return users;
}
/**
 * Create admin user
 */
async function createAdmin(companyId, customData = {}) {
    return createUser({
        ...customData,
        companyId,
        role: 'ADMIN',
    });
}
/**
 * Create regular employee user
 */
async function createEmployee(companyId, customData = {}) {
    return createUser({
        ...customData,
        companyId,
        role: 'USER',
    });
}
/**
 * Build user data without saving to database (for validation tests)
 */
function buildUserData(overrides = {}) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return {
        email: `user-${timestamp}-${random}@test.com`,
        name: `Test User ${timestamp}`,
        password: 'TestPass123!',
        role: 'USER',
        ...overrides,
    };
}
