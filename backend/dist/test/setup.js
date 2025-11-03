"use strict";
/**
 * Test setup and global configuration
 * Run before all tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.prisma = database_1.default;
// Global test timeout
jest.setTimeout(30000);
// Setup test database connection
beforeAll(async () => {
    // Ensure database connection is established
    await database_1.default.$connect();
});
// Cleanup after all tests
afterAll(async () => {
    // Disconnect from database
    await database_1.default.$disconnect();
});
