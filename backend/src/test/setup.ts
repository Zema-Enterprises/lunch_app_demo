/**
 * Test setup and global configuration
 * Run before all tests
 */

import prisma from '../config/database';

// Global test timeout
jest.setTimeout(30000);

// Setup test database connection
beforeAll(async () => {
  // Ensure database connection is established
  await prisma.$connect();
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});

// Export for use in tests
export { prisma };
