"use strict";
// Test setup file
// This runs before each test suite
// Mock environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-minimum-32-characters-long';
process.env.JWT_EXPIRES_IN = '7d';
// Use the existing database URL if available, otherwise use the development database
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://lunchsync:lunchsync123@localhost:5434/lunchsync';
}
// Increase timeout for integration tests
jest.setTimeout(10000);
// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
