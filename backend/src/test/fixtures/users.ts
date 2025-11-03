/**
 * User fixtures - predefined user data for tests
 */

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    name: 'Admin User',
    role: 'ADMIN' as const,
  },
  employee1: {
    email: 'john.doe@test.com',
    password: 'User123!',
    name: 'John Doe',
    role: 'USER' as const,
  },
  employee2: {
    email: 'jane.smith@test.com',
    password: 'User123!',
    name: 'Jane Smith',
    role: 'USER' as const,
  },
  employee3: {
    email: 'bob.wilson@test.com',
    password: 'User123!',
    name: 'Bob Wilson',
    role: 'USER' as const,
  },
};

/**
 * Get a test user by key
 */
export function getTestUser(key: keyof typeof testUsers) {
  return testUsers[key];
}

/**
 * Get all test employees (non-admin)
 */
export function getTestEmployees() {
  return Object.entries(testUsers)
    .filter(([key, user]) => user.role === 'USER')
    .map(([key, user]) => user);
}

/**
 * Get test admin
 */
export function getTestAdmin() {
  return testUsers.admin;
}

/**
 * Get all test users
 */
export function getAllTestUsers() {
  return Object.values(testUsers);
}
