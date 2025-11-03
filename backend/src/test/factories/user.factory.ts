/**
 * User factory for generating test user data
 */

import prisma from '../../config/database';
import { hashPassword } from '../../utils/bcrypt';
import { UserRole } from '@prisma/client';

export interface UserFactoryData {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
  companyId: string;
}

/**
 * Create a user with factory defaults
 */
export async function createUser(data: UserFactoryData) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  const email = data.email || `user-${timestamp}-${random}@test.com`;
  const name = data.name || `Test User ${timestamp}`;
  const password = data.password || 'TestPass123!';
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
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
export async function createUsers(count: number, baseData: UserFactoryData) {
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
export async function createAdmin(companyId: string, customData: Partial<UserFactoryData> = {}) {
  return createUser({
    ...customData,
    companyId,
    role: 'ADMIN',
  });
}

/**
 * Create regular employee user
 */
export async function createEmployee(companyId: string, customData: Partial<UserFactoryData> = {}) {
  return createUser({
    ...customData,
    companyId,
    role: 'USER',
  });
}

/**
 * Build user data without saving to database (for validation tests)
 */
export function buildUserData(overrides: Partial<UserFactoryData> = {}): any {
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
