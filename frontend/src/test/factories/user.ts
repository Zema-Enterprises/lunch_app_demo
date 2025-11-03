/**
 * User factories for generating test user data
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  companyId: string;
  createdAt?: string;
}

let userCounter = 0;

/**
 * Create a mock user
 */
export function createUser(overrides: Partial<User> = {}): User {
  userCounter++;
  return {
    id: `user-${userCounter}`,
    email: `user${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    role: 'USER',
    companyId: 'company-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create admin user
 */
export function createAdmin(overrides: Partial<User> = {}): User {
  return createUser({
    ...overrides,
    role: 'ADMIN',
    email: overrides.email || `admin${userCounter}@example.com`,
    name: overrides.name || `Admin User ${userCounter}`,
  });
}

/**
 * Create multiple users
 */
export function createUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

/**
 * Reset counter (use in beforeEach)
 */
export function resetUserCounter() {
  userCounter = 0;
}
