"use strict";
/**
 * User fixtures - predefined user data for tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUsers = void 0;
exports.getTestUser = getTestUser;
exports.getTestEmployees = getTestEmployees;
exports.getTestAdmin = getTestAdmin;
exports.getAllTestUsers = getAllTestUsers;
exports.testUsers = {
    admin: {
        email: 'admin@test.com',
        password: 'Admin123!',
        name: 'Admin User',
        role: 'ADMIN',
    },
    employee1: {
        email: 'john.doe@test.com',
        password: 'User123!',
        name: 'John Doe',
        role: 'USER',
    },
    employee2: {
        email: 'jane.smith@test.com',
        password: 'User123!',
        name: 'Jane Smith',
        role: 'USER',
    },
    employee3: {
        email: 'bob.wilson@test.com',
        password: 'User123!',
        name: 'Bob Wilson',
        role: 'USER',
    },
};
/**
 * Get a test user by key
 */
function getTestUser(key) {
    return exports.testUsers[key];
}
/**
 * Get all test employees (non-admin)
 */
function getTestEmployees() {
    return Object.entries(exports.testUsers)
        .filter(([key, user]) => user.role === 'USER')
        .map(([key, user]) => user);
}
/**
 * Get test admin
 */
function getTestAdmin() {
    return exports.testUsers.admin;
}
/**
 * Get all test users
 */
function getAllTestUsers() {
    return Object.values(exports.testUsers);
}
